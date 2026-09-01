import { useState } from "react";
import {
  BUCKET_PRICE, COMMON_RATION_PRICE, ECONOMY, MEDICINE_PRICE, PREMIUM_PRICE,
  RATION_BUCKET,
} from "@/game/data/economy";
import { gameBus, type PlayerSnapshot } from "@/game/events";
import { makeT, type StringKey } from "@/game/i18n";

type StoreTab = "packages" | "supplies";
type SupplyId = "remedy" | "common" | "bucket" | "premium";

const SUPPLIES: Array<{ id: SupplyId; price: number; icon: string }> = [
  { id: "remedy", price: MEDICINE_PRICE, icon: "/assets/supplies/remedy-bottle.webp" },
  { id: "common", price: COMMON_RATION_PRICE, icon: "/assets/supplies/feed-handful.webp" },
  { id: "bucket", price: BUCKET_PRICE, icon: "/assets/supplies/koi-feed-bucket.png" },
  { id: "premium", price: PREMIUM_PRICE, icon: "/assets/supplies/premium-feed.webp" },
];

// nome/detalhe ficam no dicionário (chave por id); preço e ícone são dados
const supplyKey = (id: SupplyId, field: "name" | "detail"): StringKey =>
  `supply.${id}.${field}` as StringKey;

// pacotes pagos: id do plano → sufixo da chave do dicionário
const PLAN_KEYS: Record<string, "handful" | "bucket" | "club"> = {
  "br.com.koicafe.handful": "handful",
  "br.com.koicafe.bucket": "bucket",
  "br.com.koicafe.club": "club",
};

export function StoreModal({ state, onClose }: { state: PlayerSnapshot; onClose: () => void }) {
  const [tab, setTab] = useState<StoreTab>("supplies");
  const t = makeT(state.idioma);

  const buySupply = (id: SupplyId) => {
    if (id === "remedy") gameBus.commands.emit("buy-remedy");
    else if (id === "common") gameBus.commands.emit("buy-common");
    else if (id === "bucket") gameBus.commands.emit("buy-bucket");
    else gameBus.commands.emit("buy-premium");
  };

  const stockFor = (id: SupplyId) => {
    if (id === "remedy") return state.remedios;
    if (id === "common" || id === "bucket") return state.food;
    return state.premiumCount;
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="store-modal" role="dialog" aria-modal="true" aria-label={t("store.aria")}>
        <header>
          <div>
            <small>KOI CAFÉ</small>
            <h2>{t("store.heading")}</h2>
            <p>{t("store.sub")}</p>
          </div>
          <div className="store-header-actions">
            <span className="store-balance" aria-label={t("store.balanceAria", { coins: state.coins })}>◎ {state.coins}</span>
            <button className="close-modal" onClick={onClose} aria-label={t("store.closeAria")}>×</button>
          </div>
        </header>

        <div className="store-tabs" role="tablist" aria-label={t("store.tabsAria")}>
          <button
            id="store-supplies-tab"
            type="button"
            role="tab"
            aria-selected={tab === "supplies"}
            aria-controls="store-supplies-panel"
            className={tab === "supplies" ? "active" : ""}
            onClick={() => setTab("supplies")}
          >
            {t("store.tabSupplies")}
          </button>
          <button
            id="store-packages-tab"
            type="button"
            role="tab"
            aria-selected={tab === "packages"}
            aria-controls="store-packages-panel"
            className={tab === "packages" ? "active" : ""}
            onClick={() => setTab("packages")}
          >
            {t("store.tabPackages")}
          </button>
        </div>

        {tab === "packages" ? (
          <div
            id="store-packages-panel"
            className="plans"
            role="tabpanel"
            aria-labelledby="store-packages-tab"
          >
            {ECONOMY.store.plans.map((plan) => {
              const isHandful = plan.id.endsWith("handful");
              const isBucket = plan.id.endsWith("bucket");
              const suffix = PLAN_KEYS[plan.id];
              const name = t(`plan.${suffix}.name` as StringKey);
              const tag = plan.tag ? t(`plan.${suffix}.tag` as StringKey) : null;
              return (
                <article className={plan.tag === "MAIS POPULAR" ? "featured-plan" : ""} key={plan.id}>
                  {tag && <span className="plan-tag">{tag}</span>}
                  <div className={`plan-art ${isHandful || isBucket ? "plan-art-image" : ""}`}>
                    {isHandful && <img src="/assets/supplies/feed-handful.webp" alt="" draggable={false} />}
                    {isBucket && <img className="store-bucket-art" src="/assets/supplies/koi-feed-bucket.png" alt="" draggable={false} />}
                    {!isHandful && !isBucket && <><i>✦</i><i>✦</i><i>✦</i></>}
                  </div>
                  <h3>{name}</h3>
                  <p>{t(`plan.${suffix}.detail` as StringKey)}</p>
                  <strong>{plan.amount}</strong>
                  <button onClick={() => {
                    onClose();
                    gameBus.events.emit("message", { text: t("store.checkoutMsg", { name }) });
                  }}>{t("store.select")}</button>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            id="store-supplies-panel"
            className="plans store-supply-plans"
            role="tabpanel"
            aria-labelledby="store-supplies-tab"
          >
            {SUPPLIES.map((item) => {
              const stock = stockFor(item.id);
              const canBuy = state.coins >= item.price;
              const name = t(supplyKey(item.id, "name"));
              return (
                <article className="store-supply" key={item.id}>
                  <div className="plan-art plan-art-image">
                    <img src={item.icon} alt="" draggable={false} />
                  </div>
                  <h3>{name}</h3>
                  <p>{t(supplyKey(item.id, "detail"), item.id === "bucket" ? { count: RATION_BUCKET } : undefined)}</p>
                  <strong>◎{item.price} {t("store.coins")}</strong>
                  <span className="store-stock">{t("store.inStock", { count: stock })}</span>
                  <button
                    type="button"
                    disabled={!canBuy}
                    aria-label={t("store.buyAria", { name, price: item.price })}
                    onClick={() => buySupply(item.id)}
                  >
                    {canBuy ? t("store.buyButton") : t("store.noCoins")}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
