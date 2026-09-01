import { useState } from "react";
import { MAX_LEVEL, SCENERY, nextScenery } from "@/game/data/scenery";
import { KOI_VARIANTS } from "@/game/data/variants";
import { FISH_OFFERS, fishRequirementProgress } from "@/game/data/fishShop";
import { makeT, variantName } from "@/game/i18n";
import { fishPriceFor, sceneryLevelOf } from "@/game/systems/economy";
import type { PlayerSnapshot } from "@/game/events";

// loja do lago: peças do cenário em níveis sequenciais (comprar e posicionar
// a peça destrava a próxima; completar o nível rende a recompensa) e peixes
// disponíveis para o tanque
export function ShopTray({
  state, pondCount, onClose, onBuyScenery, onBuyFish,
}: {
  state: PlayerSnapshot;
  pondCount: number;
  onClose: () => void;
  onBuyScenery: (id: string) => void;
  onBuyFish: (variant: number) => void;
}) {
  const [tab, setTab] = useState<"peixes" | "pecas">("peixes");
  const nextPiece = nextScenery(state.bought);
  const level = sceneryLevelOf(state.bought);
  const t = makeT(state.idioma);

  return (
    <section className="shop-tray" aria-label={t("shop.aria")}>
      <header>
        <strong>{t("shop.header", { level, max: MAX_LEVEL })} <i className="coin-badge">{state.coins}</i></strong>
        <button onClick={onClose}>{t("shop.close")}</button>
      </header>
      <div className="shop-tabs">
        <button className={`shop-tab ${tab === "peixes" ? "active" : ""}`} onClick={() => setTab("peixes")}>{t("shop.tabFish")}</button>
        <button className={`shop-tab ${tab === "pecas" ? "active" : ""}`} onClick={() => setTab("pecas")}>{t("shop.tabScenery")}</button>
      </div>
      {tab === "peixes" ? (
        <div className="shop-grid fish-shop-grid">
            {FISH_OFFERS.map((offer) => {
              const variant = KOI_VARIANTS[offer.variant];
              const name = variantName(state.idioma, variant);
              const discovered = state.fishUnlocked.includes(offer.variant);
              const progress = fishRequirementProgress(offer.requirement, state, pondCount);
              // o mistério (silhueta + espécie surpresa) dura até a primeira
              // compra; o cadeado, não — ele sai quando o nível fica completo
              const mystery = offer.variant !== 0 && !discovered;
              const price = fishPriceFor(offer, state.bought);
              const requirementLabel = offer.requirement?.kind === "level"
                ? t("shop.levelPieces", { level: offer.requirement.level, current: progress.current, target: progress.target })
                : t("shop.achievementProgress", { current: progress.current, target: progress.target });
              const blockedHint = offer.requirement?.kind === "level"
                ? t("shop.blockedLevel", { level: offer.requirement.level, current: progress.current, target: progress.target })
                : offer.requirement?.kind === "collection"
                  ? t("shop.blockedCollection", { current: progress.current, target: progress.target })
                  : requirementLabel;
              return (
                <button
                  key={offer.variant}
                  className={`shop-item fish-shop-item ${mystery ? "mystery" : ""} ${progress.met && mystery ? "ready" : ""} ${!progress.met ? "achievement-locked asset-locked" : ""}`}
                  onClick={() => onBuyFish(offer.variant)}
                  aria-label={
                    progress.met
                      ? mystery ? t("shop.buyMysteryAria", { price }) : t("shop.buyFishAria", { name, price })
                      : t("shop.lockedFishAria", { hint: blockedHint })
                  }
                >
                  <span className="shop-thumb fish-shop-thumb">
                    {mystery && !progress.met && (
                      <span className="lock-badge" aria-hidden>
                        <img className="koi-lock" src="/assets/icons/koi-lock.webp" alt="" draggable={false} />
                      </span>
                    )}
                    <span
                      className="fish-sprite-preview"
                      style={{ backgroundImage: `url(${variant.preview})` }}
                      aria-hidden
                    />
                  </span>
                  <strong>{mystery ? t("shop.surprise") : name}</strong>
                  {progress.met
                    ? <span className="shop-state price-chip">{t("shop.buy", { price })}</span>
                    : <span className="shop-state lock-chip">{requirementLabel}</span>}
                </button>
              );
            })}
        </div>
      ) : (
        <div className="shop-grid level-grid">
            {SCENERY.map((item) => {
              const owned = state.bought.includes(item.id);
              const isNext = nextPiece?.id === item.id;
              const locked = !owned && !isNext;
              // como nos peixes: toda peça não comprada é surpresa — só a
              // silhueta no card; a peça revela de verdade quando chega ao lago.
              const mystery = !owned;
              return (
                <button
                  key={item.id}
                  className={`shop-item level-card ${owned ? "owned" : "mystery"}`}
                  onClick={() => { if (!owned) onBuyScenery(item.id); }}
                  disabled={owned}
                  aria-label={
                    owned ? t("shop.inPondAria", { level: item.level })
                    : locked ? t("shop.lockedPieceAria", { level: item.level })
                    : t("shop.buyPieceAria", { level: item.level, price: item.price })
                  }
                >
                  <span className="shop-thumb level-thumb">
                    <img
                      src={item.thumb}
                      alt=""
                      draggable={false}
                    />
                    {mystery && (
                      <span className="lock-badge" aria-hidden>
                        <img className="koi-lock" src="/assets/icons/koi-lock.webp" alt="" draggable={false} />
                      </span>
                    )}
                    {owned && <i className="level-check" aria-hidden>✓</i>}
                  </span>
                  <i className="level-tag" aria-hidden>{t("shop.levelTag", { level: item.level })}</i>
                  {isNext && <span className="shop-state price-chip" aria-hidden>{t("shop.buy", { price: item.price })}</span>}
                </button>
              );
            })}
        </div>
      )}
    </section>
  );
}
