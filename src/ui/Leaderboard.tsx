import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerSnapshot } from "@/game/events";
import { makeT } from "@/game/i18n";
import {
  countersFromSnapshot,
  scoreFromCounters,
  type LeaderboardEntry,
  type LeaderboardSubmission,
} from "@/leaderboard/score";

type LoadState = "loading" | "ready" | "unavailable";

async function loadEntries(limit: 3 | 20, signal?: AbortSignal): Promise<LeaderboardEntry[]> {
  const response = await fetch(`/api/leaderboard?limit=${limit}`, { signal });
  if (!response.ok) throw new Error("Leaderboard unavailable");
  const data = await response.json() as { entries?: LeaderboardEntry[] };
  return Array.isArray(data.entries) ? data.entries : [];
}

const medal = (rank: number) => ["🥇", "🥈", "🥉"][rank - 1] ?? String(rank);

export function Leaderboard({ state, paused = false }: { state: PlayerSnapshot; paused?: boolean }) {
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [topTwenty, setTopTwenty] = useState<LeaderboardEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [open, setOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const t = makeT(state.idioma);
  const counters = useMemo(() => countersFromSnapshot(state), [state]);
  const score = scoreFromCounters(counters);

  const refreshTopThree = useCallback(async (signal?: AbortSignal) => {
    try {
      const entries = await loadEntries(3, signal);
      setTopThree(entries);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadState("unavailable");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void refreshTopThree(controller.signal), 0);
    const interval = window.setInterval(() => void refreshTopThree(), 60_000);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refreshTopThree]);

  useEffect(() => {
    if (paused || !state.playerName || !state.leaderboardId) return;
    const controller = new AbortController();
    const submission: LeaderboardSubmission = {
      playerId: state.leaderboardId,
      name: state.playerName,
      counters,
    };
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(submission),
          signal: controller.signal,
        });
        if (response.ok) void refreshTopThree();
      } catch {
        // The pond remains fully playable offline; a later state change retries.
      }
    }, 1_500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [counters, paused, refreshTopThree, state.leaderboardId, state.playerName]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const openLeaderboard = async () => {
    setOpen(true);
    setModalLoading(true);
    try {
      setTopTwenty(await loadEntries(20));
    } catch {
      setTopTwenty([]);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      <button className="leaderboard-widget" onClick={() => void openLeaderboard()} aria-label={t("leaderboard.openAria")}>
        <span className="leaderboard-widget-head">
          <b>🏆 {t("leaderboard.title")}</b>
          <i>{t("leaderboard.worldwide")}</i>
        </span>
        <span className="leaderboard-widget-rows">
          {loadState === "loading" && <em>{t("leaderboard.loading")}</em>}
          {loadState === "unavailable" && <em>{t("leaderboard.unavailable")}</em>}
          {loadState === "ready" && topThree.length === 0 && <em>{t("leaderboard.empty")}</em>}
          {topThree.map((entry) => (
            <span className="leaderboard-widget-row" key={`${entry.rank}-${entry.name}`}>
              <i>{medal(entry.rank)}</i><b>{entry.name}</b><strong>◎{entry.score}</strong>
            </span>
          ))}
        </span>
        {state.playerName && <span className="leaderboard-mine">{state.playerName} · ◎{score}</span>}
      </button>

      {open && (
        <div className="modal-backdrop leaderboard-backdrop" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="leaderboard-modal" role="dialog" aria-modal="true" aria-labelledby="leaderboard-heading">
            <header>
              <div>
                <small>{t("leaderboard.worldwide")}</small>
                <h2 id="leaderboard-heading">🏆 {t("leaderboard.topTwenty")}</h2>
              </div>
              <button className="close-modal" onClick={() => setOpen(false)} aria-label={t("leaderboard.closeAria")}>×</button>
            </header>
            <div className="leaderboard-table" role="table" aria-label={t("leaderboard.topTwenty")}>
              {modalLoading && <p>{t("leaderboard.loading")}</p>}
              {!modalLoading && topTwenty.length === 0 && <p>{loadState === "unavailable" ? t("leaderboard.unavailable") : t("leaderboard.empty")}</p>}
              {topTwenty.map((entry) => (
                <div className="leaderboard-table-row" role="row" key={`${entry.rank}-${entry.name}`}>
                  <span role="cell" className="leaderboard-rank">{medal(entry.rank)}</span>
                  <strong role="cell">{entry.name}</strong>
                  <b role="cell">◎{entry.score}</b>
                </div>
              ))}
            </div>
            <footer>{t("leaderboard.scoreNote")}</footer>
          </section>
        </div>
      )}
    </>
  );
}
