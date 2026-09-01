import { STAGE_ADULTO, STAGE_MEDIO } from "@/game/data/economy";
import { sellPriceFor } from "@/game/data/fishShop";
import { KOI_VARIANTS } from "@/game/data/variants";
import { makeT, stageName, variantName, type Lang } from "@/game/i18n";
import { progText, stageOf } from "@/game/systems/economy";
import type { FishView } from "@/game/types";

// cartão do peixe selecionado: estágio, progresso, vender e dar mamadeira
export function FishCard({
  fish, remedios, medPrice, lang, onClose, onSell, onMedicate,
}: {
  fish: FishView;
  remedios: number;
  medPrice: number;
  lang: Lang;
  onClose: () => void;
  onSell: (fid: number) => void;
  onMedicate: (fid: number) => void;
}) {
  const t = makeT(lang);
  const stage = stageOf(fish.progress);
  const variant = KOI_VARIANTS[fish.variant];
  const sellPrice = sellPriceFor(fish.variant);
  const stageProgress = stage === 0 ? fish.progress : fish.progress - STAGE_MEDIO;
  const stageGoal = stage === 0 ? STAGE_MEDIO : STAGE_ADULTO - STAGE_MEDIO;
  const progressPct =
    stage === 0 ? (fish.progress / STAGE_MEDIO) * 100
    : stage === 1 ? ((fish.progress - STAGE_MEDIO) / (STAGE_ADULTO - STAGE_MEDIO)) * 100
    : 100;

  return (
    <aside className="fish-card glass-card" data-stage={stage}>
      <header>
        <span className="fish-dot" style={{ background: variant?.color }} />
        <div>
          <strong>{variant ? `${variantName(lang, variant)} #${fish.fid}` : `#${fish.fid}`}</strong>
          <span className="fish-stage">{stageName(lang, stage)}</span>
        </div>
        {fish.sick && (
          <span className="fish-care-icon" role="img" aria-label={t("fish.needsMedicine")} title={t("fish.needsMedicine")}>
            <img src="/assets/supplies/remedy-bottle.webp" alt="" draggable={false} />
            <i aria-hidden>!</i>
          </span>
        )}
        <button className="fish-close" onClick={onClose} aria-label={t("fish.closeAria")}>×</button>
      </header>
      {stage < 2 ? (
        <>
          <div className="fish-progress"><i style={{ width: `${progressPct}%` }} /></div>
          <strong className="fish-progress-label">
            {progText(stageProgress)}/{stageGoal} → {stageName(lang, stage + 1)}
          </strong>
        </>
      ) : (
        <p className="fish-sell-note">{t("fish.readyToSell", { price: sellPrice })}</p>
      )}
      <div className="fish-actions">
        {stage === 2 && <button className="sell" onClick={() => onSell(fish.fid)}>{t("fish.sell", { price: sellPrice })}</button>}
        {fish.sick && (
          <button className="med" onClick={() => onMedicate(fish.fid)} aria-label={t("fish.giveMedicineAria")}>
            <img src="/assets/supplies/remedy-bottle.webp" alt="" draggable={false} />
            {remedios > 0 ? t("fish.use") : t("fish.useWithPrice", { price: medPrice })}
          </button>
        )}
      </div>
    </aside>
  );
}
