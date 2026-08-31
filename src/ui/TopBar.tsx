import { useState } from "react";
import { gameBus, type PlayerSnapshot } from "@/game/events";
import { gameState } from "@/game/state/GameState";

export function TopBar({ state, onOpenStore }: { state: PlayerSnapshot; onOpenStore: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="seal">鯉</span>
        <div><strong>KOI CAFÉ</strong><small>CARP CAFÉ • TANQUE 07</small></div>
      </div>
      <div className="wallet">
        <button className="wallet-coins" onClick={onOpenStore}>
          <span>◉</span><strong>{state.coins}</strong><small>MOEDAS KOI</small>
        </button>
        <button className="gear-btn" aria-label="Configurações" onClick={() => setSettingsOpen((v) => !v)}>
          <span>⚙</span>
        </button>
        {settingsOpen && (
          <div className="settings-pop" role="dialog" aria-label="Configurações">
            <div><span>SOM</span><button onClick={() => gameState.patch({ som: !state.som })}>{state.som ? "LIGADO" : "MUDO"}</button></div>
            <div><span>IDIOMA</span><button onClick={() => gameState.patch({ idioma: state.idioma === "pt" ? "en" : "pt" })}>{state.idioma === "pt" ? "PT-BR" : "EN"}</button></div>
            <div><span>TREMER PEIXES</span><button onClick={() => gameBus.events.emit("message", { text: "Os peixes continuam nadando livremente!" })}>ON</button></div>
          </div>
        )}
      </div>
    </header>
  );
}
