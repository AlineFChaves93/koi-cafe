import { useState } from "react";
import { MED_PRICE, PREMIUM_PRICE } from "@/game/data/economy";
import { SCENERY } from "@/game/data/scenery";
import { KOI_VARIANTS } from "@/game/data/variants";
import type { PlayerSnapshot } from "@/game/events";

// loja do lago: peças do cenário (compradas com moedas, liberadas pela
// coleção de espécies) + suprimentos (ração premium e remédio)
export function ShopTray({
  state, onClose, onBuyScenery, onBuyPremium, onBuyRemedy,
}: {
  state: PlayerSnapshot;
  onClose: () => void;
  onBuyScenery: (id: string) => void;
  onBuyPremium: () => void;
  onBuyRemedy: () => void;
}) {
  const [tab, setTab] = useState<"pecas" | "suprimentos">("pecas");

  return (
    <section className="shop-tray" aria-label="Loja do lago">
      <header>
        <strong>LOJA DO LAGO • ★ {state.collection.length}/{KOI_VARIANTS.length} ESPÉCIES • SALDO ◎{state.coins}</strong>
        <button onClick={onClose}>FECHAR</button>
      </header>
      <div className="shop-tabs">
        <button className={`shop-tab ${tab === "pecas" ? "active" : ""}`} onClick={() => setTab("pecas")}>PEÇAS DO CENÁRIO</button>
        <button className={`shop-tab ${tab === "suprimentos" ? "active" : ""}`} onClick={() => setTab("suprimentos")}>SUPRIMENTOS</button>
      </div>
      {tab === "pecas" ? (
        <>
          <p className="shop-hint">Crie peixes ADULTOS para colecionar espécies — cada nova espécie libera peças do cenário.</p>
          <div className="shop-grid">
            {SCENERY.filter((item) => !item.hide).map((item) => {
              const owned = state.bought.includes(item.id);
              const locked = state.collection.length < item.req;
              return (
                <button
                  key={item.id}
                  className={`shop-item ${owned ? "owned" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => { if (!owned) onBuyScenery(item.id); }}
                  disabled={owned}
                >
                  <span className="shop-thumb">
                    <img
                      src={item.thumb}
                      alt=""
                      draggable={false}
                      style={locked ? { filter: "brightness(0) invert(1)", opacity: 0.5 } : undefined}
                    />
                  </span>
                  <strong>{locked && !owned ? "???" : item.label}</strong>
                  {owned ? <span className="shop-state owned-chip">NO LAGO ✓</span>
                    : locked ? <span className="shop-state lock-chip">★ {item.req} {item.req === 1 ? "espécie" : "espécies"}</span>
                      : <span className="shop-state price-chip">◎{item.price}</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="shop-grid">
          <button className="shop-item" onClick={onBuyPremium}>
            <span className="shop-thumb shop-supply">🐠</span>
            <strong>Ração premium +1</strong>
            <small className="shop-desc">cresce em 2/7 jogadas • estoque ×{state.premiumCount}</small>
            <span className="shop-state price-chip">◎{PREMIUM_PRICE}</span>
          </button>
          <button className="shop-item" onClick={onBuyRemedy}>
            <span className="shop-thumb shop-supply">✚</span>
            <strong>Remédio +1</strong>
            <small className="shop-desc">cura um peixe doente • estoque ×{state.remedios}</small>
            <span className="shop-state price-chip">◎{MED_PRICE}</span>
          </button>
        </div>
      )}
    </section>
  );
}
