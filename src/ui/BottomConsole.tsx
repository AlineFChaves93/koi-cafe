import type { PointerEvent as ReactPointerEvent } from "react";
import { gameBus, type PlayerSnapshot } from "@/game/events";
import { makeT } from "@/game/i18n";
import { medPriceFor, sceneryLevelOf } from "@/game/systems/economy";
import type { FeedChoice } from "@/game/types";

// cartão-ícone do protótipo: arte + bolinha de quantidade + dica no toque.
// Um toque apenas ESCOLHE o item — o arremesso é sempre do botão central.
function ItemCard({
  icon, label, hint, count, active, onPick,
}: {
  icon: string; label: string; hint: string; count: string; active?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={`item-card ${active ? "active" : ""}`}
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${label} — ${hint}`}
    >
      <span className="tip" role="tooltip">
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <img src={icon} alt="" draggable={false} />
      <i className="ball">{count}</i>
    </button>
  );
}

export function BottomConsole({
  state, isAiming, onAimStart, onOpenStore, onOpenShop,
}: {
  state: PlayerSnapshot;
  isAiming: boolean;
  onAimStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenStore: () => void;
  onOpenShop: () => void;
}) {
  const level = sceneryLevelOf(state.bought);
  const medPrice = medPriceFor(state.bought);
  const emit = gameBus.commands;
  const pick = (feed: FeedChoice) => emit.emit("set-feed", { feed });
  const t = makeT(state.idioma);

  return (
    <div className="bottom-console">
      <div className="item-row">
        <ItemCard
          icon="/assets/supplies/feed-handful.webp"
          label={t("feed.common")}
          hint={t("feed.commonHint")}
          count={Number.isFinite(state.food) ? `×${state.food}` : "∞"}
          active={state.feedSel === "comum"}
          onPick={() => pick("comum")}
        />
        <ItemCard
          icon="/assets/supplies/premium-feed.webp"
          label={t("feed.premium")}
          hint={t("feed.premiumHint")}
          count={`×${state.premiumCount}`}
          active={state.feedSel === "premium"}
          onPick={() => pick("premium")}
        />
        <ItemCard
          icon="/assets/supplies/remedy-bottle.webp"
          label={t("feed.medicine")}
          hint={t("feed.medicineHint", { price: medPrice })}
          count={`×${state.remedios}`}
          active={state.feedSel === "remedio"}
          onPick={() => pick("remedio")}
        />
      </div>

      <div className="feed-control">
        <button
          className={`aim-button ${state.feedSel === "remedio" ? "remedy" : ""}`}
          onPointerDown={onAimStart}
          aria-pressed={isAiming}
        >
          <span>✦</span>
          <b>{isAiming ? t("aim.drag") : state.feedSel === "remedio" ? t("aim.holdToMedicate") : t("aim.holdToFeed")}</b>
        </button>
      </div>
      <button className="store-button" onClick={onOpenStore}>
        <strong>{t("store.koiStore")}</strong>
      </button>
      <button className="lago-btn" onClick={onOpenShop} aria-label={t("store.lakeAria", { level })}>
        <i className="lago-level" aria-hidden>{level}</i>
        <b>{t("store.lake")}</b>
      </button>

    </div>
  );
}
