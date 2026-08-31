import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createGame } from "@/game/KoiCafeGame";
import { gameBus } from "@/game/events";
import { gameState } from "@/game/state/GameState";
import type { FishView } from "@/game/types";
import { BottomConsole } from "./BottomConsole";
import { FishCard } from "./FishCard";
import { Intro } from "./Intro";
import { ShopTray } from "./ShopTray";
import { StoreModal } from "./StoreModal";
import { TopBar } from "./TopBar";

const DEFAULT_MESSAGE = "Segure para mirar • perto de um peixe = ração só dele";

// clicks on controls/overlays never plant objects into the water
const isUiTarget = (node: EventTarget | null) =>
  node instanceof Element && Boolean(node.closest("button,a,input,.glass-card,.bottom-console,.shop-tray,.modal-backdrop,.fish-card,.intro"));

const pointFromEvent = (event: ReactPointerEvent<HTMLElement>) => {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(12, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100)),
  };
};

export function GameShell() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const state = useSyncExternalStore(gameState.subscribe, gameState.getSnapshot);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [fishViews, setFishViews] = useState<FishView[]>([]);
  const [target, setTarget] = useState({ x: 74, y: 25 });
  const [isAiming, setIsAiming] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = createGame(host);
    const offs = [
      gameBus.events.on("message", ({ text }) => setMessage(text)),
      gameBus.events.on("fishes:changed", ({ fishes }) => setFishViews(fishes)),
    ];
    return () => {
      offs.forEach((off) => off());
      game.destroy(true);
    };
  }, []);

  const startAim = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer já pode ter terminado */ }
    setIsAiming(true);
    gameBus.commands.emit("aim:start");
  }, []);

  const moveAim = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!isAiming) return;
    const point = pointFromEvent(event);
    setTarget(point);
    gameBus.commands.emit("aim:move", point);
  }, [isAiming]);

  const endAim = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!isAiming) return;
    setIsAiming(false);
    gameBus.commands.emit("aim:end", pointFromEvent(event));
  }, [isAiming]);

  const tapOk = useRef(false);
  const tapStart = useRef({ t: 0, x: 0, y: 0 });

  const handleWorldPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // registra o toque — um toque rápido perto de um peixe abre o cartão dele
    tapOk.current = !isUiTarget(event.target);
    tapStart.current = { t: event.timeStamp, x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const wasAiming = isAiming;
    endAim(event);
    if (!wasAiming && tapOk.current) {
      const dt = event.timeStamp - tapStart.current.t;
      const dist = Math.hypot(event.clientX - tapStart.current.x, event.clientY - tapStart.current.y);
      if (dt < 350 && dist < 12) gameBus.commands.emit("tap", pointFromEvent(event));
    }
    tapOk.current = false;
  };

  const handlePointerCancel = () => {
    setIsAiming(false);
    tapOk.current = false;
    gameBus.commands.emit("aim:cancel");
  };

  const selectedFish = fishViews.find((f) => f.fid === state.selectedFid) ?? null;
  const emit = gameBus.commands;

  return (
    <main className="experience">
      <section
        className="pond-world"
        onPointerDown={handleWorldPointerDown}
        onPointerMove={moveAim}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Tanque de carpas visto de cima"
      >
        <div ref={hostRef} className="game-host" aria-hidden />

        <TopBar state={state} onOpenStore={() => setStoreOpen(true)} />

        {isAiming && (
          <div className="aim-target" style={{ left: `${target.x}%`, top: `${target.y}%` }}>
            <i /><span>SOLTE AQUI</span>
          </div>
        )}

        {selectedFish && (
          <FishCard
            fish={selectedFish}
            premiumSelected={state.feedSel === "premium"}
            onClose={() => emit.emit("select-fish", { fid: null })}
            onSell={(fid) => emit.emit("sell-fish", { fid })}
            onMedicate={(fid) => emit.emit("medicate-fish", { fid })}
          />
        )}

        {shopOpen && (
          <ShopTray
            state={state}
            onClose={() => setShopOpen(false)}
            onBuyScenery={(id) => emit.emit("buy-scenery", { id })}
            onBuyPremium={() => emit.emit("buy-premium")}
            onBuyRemedy={() => emit.emit("buy-remedy")}
          />
        )}

        <BottomConsole
          state={state}
          message={message}
          isAiming={isAiming}
          onAimStart={startAim}
          onOpenStore={() => setStoreOpen(true)}
          onOpenShop={() => setShopOpen(true)}
        />

        {storeOpen && <StoreModal onClose={() => setStoreOpen(false)} />}

        <Intro />
      </section>
    </main>
  );
}
