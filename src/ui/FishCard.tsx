import { MED_PRICE, SELL_PRICE, STAGE_ADULTO, STAGE_MEDIO, STAGE_NAMES } from "@/game/data/economy";
import { KOI_VARIANTS } from "@/game/data/variants";
import { progText, stageOf } from "@/game/systems/economy";
import type { FishView } from "@/game/types";

// cartão do peixe selecionado: estágio, progresso, vender e medicar
export function FishCard({
  fish, premiumSelected, onClose, onSell, onMedicate,
}: {
  fish: FishView;
  premiumSelected: boolean;
  onClose: () => void;
  onSell: (fid: number) => void;
  onMedicate: (fid: number) => void;
}) {
  const stage = stageOf(fish.progress);
  const progressPct =
    stage === 0 ? (fish.progress / STAGE_MEDIO) * 100
    : stage === 1 ? ((fish.progress - STAGE_MEDIO) / (STAGE_ADULTO - STAGE_MEDIO)) * 100
    : 100;

  return (
    <aside className="fish-card glass-card" data-stage={stage}>
      <header>
        <span className="fish-dot" style={{ background: KOI_VARIANTS[fish.variant]?.color }} />
        <div>
          <strong>{KOI_VARIANTS[fish.variant]?.name} #{fish.fid}</strong>
          <small>{fish.sick ? "DOENTE" : STAGE_NAMES[stage]}</small>
        </div>
        <button className="fish-close" onClick={onClose} aria-label="Fechar cartão do peixe">×</button>
      </header>
      {stage < 2 ? (
        <>
          <div className="fish-progress"><i style={{ width: `${progressPct}%` }} /></div>
          <small className="fish-progress-label">
            {progText(fish.progress)}/{stage === 0 ? STAGE_MEDIO : STAGE_ADULTO} jogadas {stage === 0 ? `→ ${STAGE_NAMES[1]}` : `→ ${STAGE_NAMES[2]}`}
            {premiumSelected ? " • premium acelera (2/7)" : ""}
          </small>
        </>
      ) : (
        <p className="fish-sell-note">Pronto para vender: ◎{SELL_PRICE} (peixe básico)</p>
      )}
      {fish.sick && <p className="fish-sick-note">✚ Doente — não cresce sem remédio</p>}
      <div className="fish-actions">
        {stage === 2 && <button className="sell" onClick={() => onSell(fish.fid)}>VENDER ◎{SELL_PRICE}</button>}
        {fish.sick && <button className="med" onClick={() => onMedicate(fish.fid)}>MEDICAR ◎{MED_PRICE}</button>}
      </div>
      <small className="fish-hint">Comum: 3→médio, 10→adulto • cardume: +4 jogadas</small>
    </aside>
  );
}
