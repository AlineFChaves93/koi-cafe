import type { PointerEvent as ReactPointerEvent } from "react";
import { ECONOMY, PREMIUM_PRICE } from "@/game/data/economy";
import { gameBus, type PlayerSnapshot } from "@/game/events";
import { KOI_VARIANTS } from "@/game/data/variants";

export function BottomConsole({
  state, message, isAiming, onAimStart, onOpenStore, onOpenShop,
}: {
  state: PlayerSnapshot;
  message: string;
  isAiming: boolean;
  onAimStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenStore: () => void;
  onOpenShop: () => void;
}) {
  const level = Math.floor(state.xp / ECONOMY.wallet.xpPerLevel) + 1;
  const emit = gameBus.commands;

  return (
    <div className="bottom-console">
      <div className="daily-ration">
        <div className="ration-ring" style={{ "--ration": "100%" } as React.CSSProperties}>
          <strong>{state.feedSel === "premium" ? `×${state.premiumCount}` : "∞"}</strong>
          <span>{state.feedSel === "premium" ? "prem." : "comum"}</span>
        </div>
        <p>
          <strong>{state.feedSel === "premium" ? "Ração premium" : "Ração comum"}</strong>
          <small>{state.feedSel === "premium" ? "2/7 jogadas • ◎30" : "grátis • 3/10 jogadas"}</small>
        </p>
      </div>
      <div className="feed-control">
        <p>{message}</p>
        <div className="feed-chips">
          <button
            className={`feed-chip ${state.feedSel === "comum" ? "active" : ""}`}
            onClick={() => emit.emit("set-feed", { feed: "comum" })}
          >
            COMUM ∞
          </button>
          <button
            className={`feed-chip ${state.feedSel === "premium" ? "active" : ""}`}
            onClick={() => emit.emit("set-feed", { feed: "premium" })}
          >
            PREMIUM ×{state.premiumCount} <b>◎{PREMIUM_PRICE}</b>
          </button>
          <button className="feed-chip add" onClick={() => emit.emit("buy-premium")} aria-label="Comprar mais ração premium">+1</button>
        </div>
        <button className="aim-button" onPointerDown={onAimStart} aria-pressed={isAiming}>
          <span>✦</span>{isAiming ? "ARRASTE A MIRA…" : "SEGURE PARA ALIMENTAR"}
        </button>
      </div>
      <button className="store-button" onClick={onOpenStore}>
        <span>♢</span><div><strong>LOJA KOI</strong><small>Pacotes e Clube</small></div><b>›</b>
      </button>
      <button className="lago-btn" onClick={onOpenShop}>
        <span className="lago-flower">✿</span>
        <b>LAGO</b>
        <i className="lago-badge">{state.collection.length}/{KOI_VARIANTS.length}★</i>
      </button>

      <div className="console-info">
        <span className="chip">★ {state.streak} {state.streak === 1 ? "dia" : "dias"}</span>
        <span className="chip">Missão {state.missionFed}/{ECONOMY.mission.goal}</span>
        <span className="chip">Nível {level}</span>
        {state.missionFed >= ECONOMY.mission.goal && !state.missionClaimed && (
          <button className="chip claim" onClick={() => emit.emit("claim-mission")}>RESGATAR MISSÃO +{ECONOMY.mission.rewardCoins}</button>
        )}
        {!state.rewardClaimed && (
          <button className="chip claim" onClick={() => emit.emit("claim-daily")}>SEQUÊNCIA +{ECONOMY.dailyReward.coins}</button>
        )}
      </div>
    </div>
  );
}
