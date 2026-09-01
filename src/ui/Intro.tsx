import { useEffect, useState } from "react";
import { makeT, type Lang } from "@/game/i18n";
import { containsVulgarity } from "@/leaderboard/vulgarity";

export function Intro({
  lang,
  playerName,
  onSetPlayerName,
}: {
  lang: Lang;
  playerName: string;
  onSetPlayerName: (name: string) => void;
}) {
  // GameShell mounts the intro only after save hydration. Returning players
  // already have an identity, so they can go straight back to their pond.
  const [intro, setIntro] = useState(() => !playerName);
  const [leaving, setLeaving] = useState(false);
  const [name, setName] = useState(playerName);
  const [nameRejected, setNameRejected] = useState(false);
  const t = makeT(lang);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autostart")) {
      const timer = window.setTimeout(() => setIntro(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  if (!intro) return null;

  const begin = () => {
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (Array.from(cleanName).length < 2) return;
    if (containsVulgarity(cleanName)) {
      setNameRejected(true);
      return;
    }
    onSetPlayerName(cleanName);
    setLeaving(true);
    window.setTimeout(() => setIntro(false), 450);
  };

  return (
    <div className={`intro ${leaving ? "leaving" : ""}`}>
      <div className="intro-art" aria-hidden />
      <div className="intro-panel">
        <h1>Carp Café</h1>
        <form onSubmit={(event) => { event.preventDefault(); begin(); }}>
          <label htmlFor="player-name">{t("intro.nameLabel")}</label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameRejected(false);
            }}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t("intro.namePlaceholder")}
            aria-invalid={nameRejected}
          />
          {nameRejected && <p className="intro-error" role="alert">{t("intro.nameVulgar")}</p>}
          <button type="submit" disabled={Array.from(name.trim()).length < 2}>{t("intro.cta")}</button>
        </form>
      </div>
    </div>
  );
}
