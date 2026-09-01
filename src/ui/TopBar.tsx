import { useEffect, useRef, useState } from "react";
import { gameBus, type PlayerSnapshot } from "@/game/events";
import { gameState } from "@/game/state/GameState";
import { makeT } from "@/game/i18n";

export function TopBar({ state, onOpenStore }: { state: PlayerSnapshot; onOpenStore: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coinFlare, setCoinFlare] = useState<number | null>(null);
  const flareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = makeT(state.idioma);

  useEffect(() => gameBus.events.on("wallet:flare", ({ amount }) => {
    if (flareTimer.current) clearTimeout(flareTimer.current);
    setCoinFlare(amount);
    flareTimer.current = setTimeout(() => setCoinFlare(null), 1050);
  }), []);

  // o idioma escolhido também orienta leitores de tela no documento inteiro
  useEffect(() => {
    document.documentElement.lang = state.idioma === "pt" ? "pt-BR" : "en";
  }, [state.idioma]);

  // clique fora do popup (ou Esc) fecha; o clique na engrenagem fica fora
  // porque o próprio botão alterna o estado
  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target instanceof Element ? event.target : null;
      if (node?.closest(".settings-pop, .gear-btn")) return;
      setSettingsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="seal">鯉</span>
        <div><strong>KOI CAFÉ</strong><small>{t("brand.tag")}</small></div>
      </div>
      <div className="wallet">
        <button className={`wallet-coins ${coinFlare !== null ? "coin-flare" : ""}`} onClick={onOpenStore}>
          <span>◉</span><strong>{state.coins}</strong><small>{t("wallet.coins")}</small>
          {coinFlare !== null && <i className="wallet-gain" aria-hidden>+{coinFlare}</i>}
        </button>
        <button
          className="gear-btn"
          aria-label={t("settings.aria")}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <span>⚙</span>
        </button>
        {settingsOpen && (
          <div className="settings-pop" role="dialog" aria-label={t("settings.aria")}>
            <div className="settings-head">{t("settings.title")}</div>
            <div className="settings-row">
              <span>{t("settings.sound")}</span>
              <button onClick={() => gameState.patch({ som: !state.som })}>
                {state.som ? t("settings.soundOn") : t("settings.soundOff")}
              </button>
            </div>
            <div className="settings-row">
              <span>{t("settings.language")}</span>
              <button onClick={() => gameState.patch({ idioma: state.idioma === "pt" ? "en" : "pt" })}>
                {state.idioma === "pt" ? "PT-BR" : "EN"}
              </button>
            </div>
            <div className="settings-row">
              <span>{t("settings.shakeFish")}</span>
              <button onClick={() => gameBus.events.emit("message", { text: t("settings.shakeFishMsg") })}>ON</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
