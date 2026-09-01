import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createGame } from "@/game/KoiCafeGame";
import { gameBus } from "@/game/events";
import { makeT } from "@/game/i18n";
import { gameState } from "@/game/state/GameState";
import { medPriceFor } from "@/game/systems/economy";
import type { FeedChoice, FishView } from "@/game/types";
import { gameScaleFor, isForceLandscape } from "@/game/viewport";
import { BottomConsole } from "./BottomConsole";
import { FishCard } from "./FishCard";
import { Intro } from "./Intro";
import { ShopTray } from "./ShopTray";
import { StoreModal } from "./StoreModal";
import { TopBar } from "./TopBar";

// clicks on controls/overlays never plant objects into the water
const isUiTarget = (node: EventTarget | null) =>
  node instanceof Element && Boolean(node.closest("button,a,input,.glass-card,.bottom-console,.shop-tray,.modal-backdrop,.fish-card,.intro"));

// Com a paisagem forçada o elemento fica girado 90° na tela: o bounding rect
// vem trocado/girado em relação ao layout, então o toque precisa ser
// "desgirado" antes de virar porcentagem do mundo 1280×720.
const localPercent = (screenX: number, screenY: number, el: HTMLElement) => {
  const bounds = el.getBoundingClientRect();
  const rotated = isForceLandscape();
  const dx = screenX - (bounds.left + bounds.width / 2);
  const dy = screenY - (bounds.top + bounds.height / 2);
  const localX = rotated ? dy : dx;
  const localY = rotated ? -dx : dy;
  const width = rotated ? bounds.height : bounds.width;
  const height = rotated ? bounds.width : bounds.height;
  return {
    x: ((localX + width / 2) / width) * 100,
    y: ((localY + height / 2) / height) * 100,
  };
};

const pointFromEvent = (event: ReactPointerEvent<HTMLElement>) => {
  const point = localPercent(event.clientX, event.clientY, event.currentTarget);
  return {
    x: Math.max(8, Math.min(92, point.x)),
    y: Math.max(12, Math.min(88, point.y)),
  };
};

// ícone do item escolhido no console — aparece na mira enquanto o botão
// central fica pressionado, mostrando o que vai ser lançado
const FEED_ICON: Record<FeedChoice, string> = {
  comum: "/assets/supplies/feed-handful.webp",
  premium: "/assets/supplies/premium-feed.webp",
  remedio: "/assets/supplies/remedy-bottle.webp",
};

export function GameShell() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const state = useSyncExternalStore(gameState.subscribe, gameState.getSnapshot);
  const [fishViews, setFishViews] = useState<FishView[]>([]);
  const [target, setTarget] = useState({ x: 74, y: 25 });
  const [isAiming, setIsAiming] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // mensagens do jogo (falhas de estoque, seleção, cura…) como aviso flutuante
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = gameBus.events.on("message", ({ text }) => {
      setNotice(text);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setNotice(null), 2800);
    });
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const bounds = viewport.getBoundingClientRect();
      // girado, a superfície útil (paisagem) tem as medidas trocadas
      const width = isForceLandscape() ? bounds.height : bounds.width;
      const height = isForceLandscape() ? bounds.width : bounds.height;
      viewport.style.setProperty("--game-scale", String(gameScaleFor(width, height)));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.visualViewport?.addEventListener("resize", updateScale);
    updateScale();

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = createGame(host);
    const offs = [
      gameBus.events.on("fishes:changed", ({ fishes }) => setFishViews(fishes)),
    ];

    // O canvas é dimensionado pelo layout do host (clientWidth/Height, imune à
    // rotação da superfície), não pelo ScaleManager do Phaser (veja createGame).
    const fitCanvas = () => {
      const canvas = host.querySelector("canvas");
      if (!canvas) return;
      canvas.style.width = `${host.clientWidth}px`;
      canvas.style.height = `${host.clientHeight}px`;
    };
    game.events.once("ready", fitCanvas);
    const hostObserver = new ResizeObserver(fitCanvas);
    hostObserver.observe(host);
    fitCanvas();

    return () => {
      hostObserver.disconnect();
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

  const emit = gameBus.commands;
  const selectedFish = fishViews.find((f) => f.fid === state.selectedFid) ?? null;
  const t = makeT(state.idioma);

  const openStore = () => {
    setShopOpen(false);
    emit.emit("select-fish", { fid: null });
    setStoreOpen(true);
  };

  const openShop = () => {
    setStoreOpen(false);
    emit.emit("select-fish", { fid: null });
    setShopOpen(true);
  };

  return (
    <div ref={viewportRef} className="game-viewport">
      <div className="rotate-surface">
        <main className={`experience ${shopOpen ? "shop-active" : ""} ${storeOpen ? "modal-active" : ""}`}>
          <section
            className="pond-world"
            onPointerDown={handleWorldPointerDown}
            onPointerMove={moveAim}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            aria-label={t("world.aria")}
          >
            <div ref={hostRef} className="game-host" aria-hidden />

            <div className="hud-layer">
              <TopBar state={state} onOpenStore={openStore} />

              {isAiming && (
                <div className="aim-target" style={{ left: `${target.x}%`, top: `${target.y}%` }}>
                  <img src={FEED_ICON[state.feedSel]} alt="" draggable={false} />
                  <span>{state.feedSel === "remedio" ? t("aim.onSickFish") : t("aim.release")}</span>
                </div>
              )}

              {notice && (
                <div className="game-notice" role="status">{notice}</div>
              )}

              {selectedFish && (
                <FishCard
                  fish={selectedFish}
                  remedios={state.remedios}
                  medPrice={medPriceFor(state.bought)}
                  lang={state.idioma}
                  onClose={() => emit.emit("select-fish", { fid: null })}
                  onSell={(fid) => emit.emit("sell-fish", { fid })}
                  onMedicate={(fid) => emit.emit("medicate-fish", { fid })}
                />
              )}

              {shopOpen && (
                <ShopTray
                  state={state}
                  pondCount={fishViews.length}
                  onClose={() => setShopOpen(false)}
                  onBuyScenery={(id) => emit.emit("buy-scenery", { id })}
                  onBuyFish={(variant) => emit.emit("buy-fish", { variant })}
                />
              )}

              <BottomConsole
                state={state}
                isAiming={isAiming}
                onAimStart={startAim}
                onOpenStore={openStore}
                onOpenShop={openShop}
              />

              {storeOpen && <StoreModal state={state} onClose={() => setStoreOpen(false)} />}

              <Intro lang={state.idioma} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
