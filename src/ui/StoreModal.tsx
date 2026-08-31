import { ECONOMY } from "@/game/data/economy";
import { gameBus } from "@/game/events";

export function StoreModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="store-modal" role="dialog" aria-modal="true" aria-label="Loja Koi">
        <header>
          <div>
            <small>KOI CAFÉ</small>
            <h2>Mais momentos no lago</h2>
            <p>Escolha um pacote ou entre para o Clube Nishiki.</p>
          </div>
          <button className="close-modal" onClick={onClose} aria-label="Fechar loja">×</button>
        </header>
        <div className="plans">
          {ECONOMY.store.plans.map((plan) => (
            <article className={plan.tag === "MAIS POPULAR" ? "featured-plan" : ""} key={plan.id}>
              {plan.tag && <span className="plan-tag">{plan.tag}</span>}
              <div className="plan-art"><i>✦</i><i>✦</i><i>✦</i></div>
              <h3>{plan.name}</h3>
              <p>{plan.detail}</p>
              <strong>{plan.amount}</strong>
              <button onClick={() => {
                onClose();
                gameBus.events.emit("message", { text: `${plan.name}: checkout de exemplo — nesta amostra as moedas vêm da venda de peixes` });
              }}>SELECIONAR</button>
            </article>
          ))}
        </div>
        <footer>
          <span>▣ Pagamento protegido</span>
          <span>Sem anúncios invasivos</span>
          <span>Cancele quando quiser</span>
        </footer>
      </section>
    </div>
  );
}
