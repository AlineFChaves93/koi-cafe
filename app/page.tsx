"use client";

import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { MONETIZATION } from "./monetization";

type Pellet = { id: number; x: number; y: number; feed: FeedKind };
type FishView = { fid: number; variant: number; progress: number; sick: boolean };
type Vec = { x: number; y: number };
type FishState = "wander" | "curious" | "seek";
type AnimName = "swim" | "fast" | "idle" | "eat" | "bob" | "turnR" | "turnL";
type FeedKind = "comum" | "premium";
type Fish = {
  fid: number;
  x: number; y: number; heading: number; speed: number;
  len: number; renderLen: number; scale: number; variant: number;
  phase: number; seed: number; wanderT: number;
  state: FishState; targetPellet: number; eatT: number; burst: number;
  anim: AnimName; animT: number; turnT: number; turning: 0 | 1 | -1;
  baseLen: number; progress: number; sick: boolean; lastThrow: number;
  prevHeading?: number;
  legDir: number; legT: number; legSpeed: number; resting: boolean;
  turnAcc: number; turnSignAcc: number;
};
type WorldPellet = { x: number; y: number; born: number; food: number; eaters: number; wobble: number; throwId: number };
type ThrowMeta = { feed: FeedKind; targetFid: number | null };

const DAILY_LIMIT = MONETIZATION.paywallEnabled ? MONETIZATION.rations.freeDailyLimit : Number.POSITIVE_INFINITY;
const MISSION_GOAL = MONETIZATION.mission.goal;
const MISSION_REWARD = MONETIZATION.mission.rewardCoins;
const STORAGE_KEY = "koi-cafe-player-v3";
const FISH_COUNT = 12;

// ===================== economia do sample =====================
// mini → (3 jogadas comuns) → médio → (10 jogadas no total) → adulto.
// ração premium: médio em 2 jogadas, adulto em 7 (valor 1.5× por jogada).
// jogada no cardume (sem peixe na mira): rende 10/14 → adulto em 14 jogadas (+4).
const SELL_PRICE = 10; // peixe básico adulto
const MED_PRICE = 5; // remédio para peixe comum
const PREMIUM_PRICE = 30; // 1 jogada de ração premium
const STAGE_MEDIO = 3;
const STAGE_ADULTO = 10;
const PREMIUM_VALUE = 1.5; // 1.5×2=3 (médio em 2) e 1.5×7=10.5 (adulto em 7)
const SCHOOL_FACTOR = 10 / 14; // cardume: adulto em 14 jogadas
const SICK_CHANCE = 0.08; // por jogada, um peixe saudável pode adoecer
const STAGE_NAMES = ["MINI", "MÉDIO", "ADULTO"] as const;
const FISH_VIEWPORT_RATIO = 0.075;
const KOI_VARIANTS = [
  { name: "Platina", file: "/koi/normalized/platinum-ogon.webp?v=7", color: "#f2f4f8" },
  { name: "Hi Utsuri", file: "/koi/normalized/hi-utsuri-v2.webp?v=7", color: "#e95b27" },
  { name: "Showa", file: "/koi/normalized/showa-v3.webp?v=7", color: "#e54818" },
  { name: "Sanke", file: "/koi/normalized/sanke-v2.webp?v=7", color: "#e94b2b" },
  { name: "Kohaku", file: "/koi/normalized/kohaku.webp?v=7", color: "#ef765e" },
  { name: "Tancho", file: "/koi/normalized/tancho.webp?v=7", color: "#d94949" },
] as const;
const VARIANT_NAMES = KOI_VARIANTS.map(({ name }) => name);
const stageOf = (progress: number) => (progress >= STAGE_ADULTO ? 2 : progress >= STAGE_MEDIO ? 1 : 0);
// Keep growth noticeable without letting adult fish overwhelm the pond. The
// same factor is used for both canvas axes, so fish always grow uniformly.
const sizeFactor = (progress: number) => 0.78 + 0.27 * Math.min(1, progress / STAGE_ADULTO);
const fishName = (f: { variant: number; fid: number }) => `${VARIANT_NAMES[f.variant]} #${f.fid}`;
// progresso legível: inteiro quando fecha, uma casa decimal quando a ração
// premium (1.5) ou o cardume (0.7) deixam o número quebrado
const progText = (progress: number) => (Number.isInteger(progress) ? String(progress) : progress.toFixed(1));

// Normalized atlases use a fixed 12 × 6 grid. Short rows leave unused cells blank.
const ATLAS_COLUMNS = 12;
const ATLAS_ROWS = 6;
const ANIMS: Record<AnimName, { row: number; frames: number; fps: number; loop: boolean }> = {
  swim: { row: 0, frames: 8, fps: 10, loop: true },
  fast: { row: 1, frames: 6, fps: 12, loop: true },
  idle: { row: 2, frames: 12, fps: 6, loop: true },
  turnR: { row: 3, frames: 12, fps: 10, loop: false },
  turnL: { row: 3, frames: 12, fps: 10, loop: false },
  bob: { row: 4, frames: 12, fps: 10, loop: true },
  eat: { row: 5, frames: 12, fps: 12, loop: true },
};
// one throw scatters a cloud of individual pellets; each pellet is a single bite
const PELLETS_PER_THROW = 12;
const PELLET_FOOD = 1;
const EAT_RATE = 1;

// ===================== loja do lago (partes separadas) =====================
// as peças do cenário são compradas com moedas e liberadas conforme o jogador
// coleciona espécies de peixe (variantes que já chegaram a ADULTO). Depois de
// comprida, cada peça ocupa sua posição fixa no lago (leiaute da montagem).
type SceneryItem = {
  id: string; src: string; x: number; y: number; w: number;
  flat?: number; rot?: number; floaty?: boolean; wmax?: number; z?: number;
  label: string; price: number; req: number; thumb: string;
  sway?: boolean; origin?: string; fx?: "stream" | "leaves" | "pipe"; dur?: number; hide?: boolean; bundle?: string;
};
const SCENERY: SceneryItem[] = [
  { id: "cerca-dir", src: "/scenery/bamboo-fence-right.png?v=2", x: 111, y: 21.9, w: 66.78, rot: 171, flat: 1.123, wmax: 1282, label: "Cerca do canto direito", price: 30, req: 3, thumb: "/scenery/thumbs/cerca-dir.png" },
  { id: "cerca-esq", src: "/scenery/bamboo-fence.png?v=2", x: 19.22, y: 8.64, w: 70.75, flat: 0.996, wmax: 1358, label: "Cerca do canto esquerdo", price: 30, req: 2, thumb: "/scenery/thumbs/cerca-esq.png" },
  { id: "ponte", src: "/scenery/bridge.png?v=3", x: 48.19, y: 5.05, w: 54.91, flat: 0.98, wmax: 1054, label: "Ponte vermelha", price: 60, req: 6, thumb: "/scenery/thumbs/ponte.png" },
  { id: "arvore", src: "/scenery/maple.webp?v=3", x: 2.07, y: -7.5, w: 61.53, flat: 1.025, wmax: 1181, wind: true, origin: "40% 95%", label: "Árvore de outono", price: 50, req: 4, thumb: "/scenery/thumbs/arvore.png" },
  { id: "pedra-arvore", src: "/scenery/tree-rock.png?v=2", x: 8.2, y: 55.8, w: 12.5, flat: 0.9, wmax: 240, z: 4, hide: true, bundle: "arvore", label: "Pedra da árvore", price: 50, req: 4, thumb: "/scenery/thumbs/arvore.png" },
  { id: "tablado", src: "/scenery/dock.png?v=2", x: 96.88, y: 32.48, w: 52.56, flat: 0.997, wmax: 1009, label: "Tablado de madeira", price: 40, req: 3, thumb: "/scenery/thumbs/tablado.png" },
  { id: "fonte-bambu", src: "/scenery/waterfall.png?v=2", x: 80.79, y: 17.42, w: 64.71, wmax: 1242, fx: "stream", label: "Fonte de bambu", price: 80, req: 5, thumb: "/scenery/thumbs/fonte-bambu.png" },
  { id: "samambaia-a", src: "/scenery/fern.png?v=2", x: 13.5, y: 50, w: 24, wmax: 460, z: 4, label: "Samambaia alta", price: 15, req: 0, thumb: "/scenery/thumbs/samambaia-a.png" },
  { id: "samambaia-b", src: "/scenery/fern.png?v=2", x: 1.38, y: 56.79, w: 14.78, rot: -35.6, wmax: 284, label: "Samambaia baixa", price: 15, req: 0, thumb: "/scenery/thumbs/samambaia-b.png" },
  { id: "pad-esq", src: "/scenery/lilypad.png?v=2", x: 20.53, y: 36.48, w: 47.87, rot: 1.79, flat: 1.17, floaty: true, dur: 26, wmax: 919, label: "Nenúfar grande", price: 20, req: 1, thumb: "/scenery/thumbs/pad-esq.png" },
  { id: "pedras-canto", src: "/scenery/rocks-corner.png?v=2", x: 12.4, y: 78.6, w: 37.56, flat: 0.923, wmax: 721, z: 11, label: "Pedras do canto", price: 35, req: 2, thumb: "/scenery/thumbs/pedras-canto.png" },
  { id: "bacia", src: "/scenery/basin.png?v=2", x: 86.1, y: 85.6, w: 55.74, flat: 0.998, wmax: 1070, z: 11, fx: "pipe", label: "Bacia de pedra", price: 45, req: 4, thumb: "/scenery/thumbs/bacia.png" },
  { id: "pad-dir", src: "/scenery/lilypad.png?v=2", x: 64.07, y: 90.55, w: 7.64, rot: -174.41, flat: 0.775, floaty: true, dur: 34, wmax: 147, label: "Nenúfar pequeno", price: 10, req: 1, thumb: "/scenery/thumbs/pad-dir.png" },
  { id: "lampada-parede", src: "/scenery/lamp-wall.png?v=2", x: 2.94, y: -0.88, w: 57.1, flat: 0.677, wmax: 1096, label: "Lâmpada de parede", price: 20, req: 1, thumb: "/scenery/thumbs/lampada-parede.png" },
  { id: "lanterna", src: "/scenery/lantern-red.png?v=2", x: 7.91, y: -2.97, w: 39.37, flat: 0.762, wmax: 756, label: "Lanterna de papel", price: 25, req: 1, thumb: "/scenery/thumbs/lanterna.png", sway: true, origin: "50.67% 45.17%" },
];
const SCENERY_BY_ID = Object.fromEntries(SCENERY.map((item) => [item.id, item])) as Record<string, SceneryItem>;
const SCENERY_STORAGE_KEY = "koi-cafe-scenery-v1";
// poça da bacia: os dois quadros com água acumulada ficam SEMPRE visíveis
// (ondulando devagar); o jato do cano cicla nos quadros de despejo
const BASIN_POOL_FRAMES = ["09", "10"];
const BASIN_POUR_FRAMES = ["01", "02", "04", "05", "06"];

// clicks on controls/overlays never plant objects into the water
const isUiTarget = (node: EventTarget | null) =>
  node instanceof Element && Boolean(node.closest("button,a,input,.platform,.intro,.glass-card,.bottom-console,.shop-tray,.modal-backdrop,.fish-card"));

const dayKey = (date = new Date()) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const TAU = Math.PI * 2;
const angleDiff = (a: number, b: number) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export default function Home() {
  const [intro, setIntro] = useState(true);
  const [introLeaving, setIntroLeaving] = useState(false);
  const [food, setFood] = useState<number>(DAILY_LIMIT);
  const [coins, setCoins] = useState<number>(MONETIZATION.wallet.startCoins);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(1);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [totalFed, setTotalFed] = useState(0);
  const [missionFed, setMissionFed] = useState(0);
  const [missionClaimed, setMissionClaimed] = useState(false);
  const [feedSel, setFeedSel] = useState<FeedKind>("comum");
  const [premiumCount, setPremiumCount] = useState(0);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [pellets, setPellets] = useState<Pellet[]>([]);
  const [target, setTarget] = useState({ x: 74, y: 25 });
  const [isAiming, setIsAiming] = useState(false);
  const [isEating, setIsEating] = useState(false);
  const [jumpBurst, setJumpBurst] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const [levelFlash, setLevelFlash] = useState(false);
  const [message, setMessage] = useState("Segure para mirar • perto de um peixe = ração só dele");
  const [storeOpen, setStoreOpen] = useState(false);
  const [collection, setCollection] = useState<number[]>([]);
  const [bought, setBought] = useState<string[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<"pecas" | "suprimentos">("pecas");
  const [remedios, setRemedios] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [som, setSom] = useState(true);
  const [idioma, setIdioma] = useState<"pt" | "en">("pt");
  const [boySide, setBoySide] = useState<"left" | "center" | "right">("center");
  const [growSplash, setGrowSplash] = useState<{ x: number; y: number; k: number } | null>(null);
  const hydrated = useRef(false);
  const collectionRef = useRef<number[]>([]);
  const loadedProgress = useRef<number[]>([]);
  const loadedSick = useRef<number[]>([]);
  const [fishView, setFishView] = useState<FishView[]>([]); // espelho do mundo para o cartão do peixe
  const bumpFishTick = () => setFishView(world.current.fishes.map((f) => ({ fid: f.fid, variant: f.variant, progress: f.progress, sick: f.sick })));
  const nextId = useRef(0);
  const tapOk = useRef(false);
  const tapStart = useRef({ t: 0, x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pelletEls = useRef(new Map<number, HTMLElement>());
  const now1 = () => performance.now();
  const world = useRef({
    w: 0, h: 0, dpr: 1, u: 1,
    platform: { x: 0, y: 0, r: 1 },
    aiming: false,
    aim: { x: 0, y: 0 },
    pellets: new Map<number, WorldPellet>(),
    throws: new Map<number, ThrowMeta>(),
    fishes: [] as Fish[],
    frames: [] as HTMLCanvasElement[][],
    framesSmall: [] as HTMLCanvasElement[][],
    animOffsets: {} as Record<AnimName, number>,
    ready: false,
    reduced: false,
    raf: 0,
    last: 0,
    spawnFish: null as null | ((progress?: number) => void),
    selectedFid: null as number | null,
  });

  useEffect(() => { world.current.selectedFid = selectedFid; }, [selectedFid]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autostart")) window.setTimeout(() => setIntro(false), 0);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      loadedProgress.current = Array.isArray(saved?.growth) ? saved.growth : [];
      loadedSick.current = Array.isArray(saved?.sick) ? saved.sick : [];
      const today = dayKey();
      if (saved) {
        if (saved.date === today) {
          setFood(MONETIZATION.paywallEnabled ? (saved.food ?? DAILY_LIMIT) : Number.POSITIVE_INFINITY);
          setCoins(saved.coins ?? MONETIZATION.wallet.startCoins); setXp(saved.xp ?? 0);
          setStreak(saved.streak ?? 1); setRewardClaimed(Boolean(saved.rewardClaimed)); setTotalFed(saved.totalFed ?? 0);
          setMissionFed(Math.min(MISSION_GOAL, saved.missionFed ?? 0)); setMissionClaimed(Boolean(saved.missionClaimed));
          setPremiumCount(saved.premium ?? 0);
          setCollection(Array.isArray(saved.collection) ? saved.collection : []);
          setRemedios(saved.remedios ?? 0);
          setSom(saved.som ?? true);
          setIdioma(saved.idioma === "en" ? "en" : "pt");
        } else {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          setFood(DAILY_LIMIT); setCoins(saved.coins ?? MONETIZATION.wallet.startCoins); setXp(saved.xp ?? 0);
          setStreak(saved.date === dayKey(yesterday) ? Math.min(MONETIZATION.streak.maxDays, (saved.streak ?? 0) + 1) : 1);
          setRewardClaimed(false); setTotalFed(saved.totalFed ?? 0);
          setMissionFed(0); setMissionClaimed(false);
          setPremiumCount(saved.premium ?? 0);
          setCollection(Array.isArray(saved.collection) ? saved.collection : []);
          setRemedios(saved.remedios ?? 0);
          setSom(saved.som ?? true);
          setIdioma(saved.idioma === "en" ? "en" : "pt");
        }
      }
    } catch { /* start fresh when local data is unavailable */ }
    try {
      const savedScenery = JSON.parse(localStorage.getItem(SCENERY_STORAGE_KEY) || "null");
      if (Array.isArray(savedScenery)) setBought(savedScenery.filter((id: string) => SCENERY_BY_ID[id]));
    } catch { /* lago novo quando o armazenamento falha */ }
    // pré-visualização: ?cenacompleta monta o lago com todas as peças
    if (window.location.search.includes("cenacompleta")) {
      setBought(SCENERY.map((item) => item.id));
      setCollection(KOI_VARIANTS.map((_, index) => index));
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const w = world.current;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: dayKey(), food, coins, xp, streak, rewardClaimed, totalFed, missionFed, missionClaimed, premium: premiumCount,
      growth: w.fishes.map((f) => Math.round(f.progress * 10) / 10),
      sick: w.fishes.map((f) => (f.sick ? 1 : 0)),
      collection,
      remedios,
      som,
      idioma,
    }));
  }, [food, coins, xp, streak, rewardClaimed, totalFed, missionFed, missionClaimed, premiumCount, fishView, collection, remedios, som, idioma]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(SCENERY_STORAGE_KEY, JSON.stringify(bought));
  }, [bought]);

  const level = Math.floor(xp / MONETIZATION.wallet.xpPerLevel) + 1;
  const levelProgress = xp % MONETIZATION.wallet.xpPerLevel;
  const prevLevel = useRef(1);

  useEffect(() => {
    if (level > prevLevel.current) {
      setLevelFlash(true);
      setMessage(`Nível ${level} alcançado! O cardume agradece`);
      window.setTimeout(() => setLevelFlash(false), 1600);
    }
    prevLevel.current = level;
  }, [level]);

  // mirror UI state into the animation world
  useEffect(() => { world.current.aiming = isAiming; }, [isAiming]);

  // menino senta virado para o lado em que a ração vai cair
  useEffect(() => {
    if (!isAiming) return;
    setBoySide(target.x < 45 ? "left" : "right");
  }, [isAiming, target]);
  useEffect(() => {
    const w = world.current;
    if (w.w) w.aim = { x: (target.x / 100) * w.w, y: (target.y / 100) * w.h };
  }, [target]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(12, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  };

  // keep the landing point in open water (never on top of the platform)
  const clampToWater = (px: number, py: number) => {
    const w = world.current;
    const dx = px - w.platform.x, dy = py - w.platform.y;
    const d = Math.hypot(dx, dy) || 1;
    const minD = w.platform.r * 1.1 + 8;
    if (d < minD) { px = w.platform.x + (dx / d) * minD; py = w.platform.y + (dy / d) * minD; }
    return {
      x: Math.max(w.w * 0.05, Math.min(w.w * 0.95, px)),
      y: Math.max(w.h * 0.1, Math.min(w.h * 0.94, py)),
    };
  };

  const startAim = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (MONETIZATION.paywallEnabled && food <= 0) return;
    if (feedSel === "premium" && premiumCount <= 0) {
      setMessage("Sem ração premium — compre por ◎30 no seletor de ração");
      return;
    }
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer já pode ter terminado */ }
    setIsEating(false); setJumpBurst(false); setIsAiming(true);
    setMessage("Os peixes próximos já estão de olho…");
  };

  const moveAim = (event: ReactPointerEvent<HTMLElement>) => {
    if (isAiming) setTarget(pointFromEvent(event));
  };

  const handleWorldPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // registra o toque — um toque rápido perto de um peixe abre o cartão dele
    tapOk.current = !isUiTarget(event.target);
    tapStart.current = { t: event.timeStamp, x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const wasAiming = isAiming;
    releaseFood(event);
    // toque rápido (sem arremesso) perto de um peixe → seleciona o peixe
    if (!wasAiming && tapOk.current) {
      const dt = event.timeStamp - tapStart.current.t;
      const dist = Math.hypot(event.clientX - tapStart.current.x, event.clientY - tapStart.current.y);
      if (dt < 350 && dist < 12) selectFishAt(pointFromEvent(event));
    }
    tapOk.current = false;
  };

  const handlePointerCancel = () => { setIsAiming(false); tapOk.current = false; };

  const buyScenery = (id: string) => {
    const item = SCENERY_BY_ID[id];
    if (!item || bought.includes(id)) return;
    if (collection.length < item.req) {
      setMessage(`★ Colete ${item.req} ${item.req === 1 ? "espécie" : "espécies"} para desbloquear esta peça — você tem ${collection.length}`);
      return;
    }
    if (coins < item.price) {
      setMessage(`◎${item.price} necessários — venda peixes adultos (◎${SELL_PRICE} cada)`);
      return;
    }
    setCoins((value) => value - item.price);
    setBought((items) => [...items, id]);
    setMessage(`${item.label} instalado no lago! (−◎${item.price})`);
  };

  const selectFishAt = (point: Vec) => {
    const w = world.current;
    if (!w.w) return;
    const px = (point.x / 100) * w.w, py = (point.y / 100) * w.h;
    const capR = Math.min(w.w, w.h) * 0.12;
    let best: Fish | null = null; let bd = capR;
    for (const f of w.fishes) {
      const d = Math.hypot(f.x - px, f.y - py);
      if (d < bd) { bd = d; best = f; }
    }
    if (best) {
      setSelectedFid(best.fid);
      bumpFishTick();
      const stage = stageOf(best.progress);
      setMessage(stage === 2 ? `${fishName(best)} está ADULTO — pronto para vender por ◎${SELL_PRICE}` : `${fishName(best)}: ${STAGE_NAMES[stage]} • ${progText(best.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO} jogadas`);
    } else {
      setSelectedFid(null);
    }
  };

  const buyPremium = () => {
    if (coins < PREMIUM_PRICE) { setMessage(`Moedas insuficientes — ração premium custa ◎${PREMIUM_PRICE}`); return false; }
    setCoins((value) => value - PREMIUM_PRICE);
    setPremiumCount((value) => value + 1);
    setMessage(`Ração premium +1 (−◎${PREMIUM_PRICE}) • cresce em 2/7 jogadas`);
    return true;
  };

  const onPremiumChip = () => {
    if (premiumCount > 0) { setFeedSel("premium"); setMessage("Ração premium selecionada — cresce em 2/7 jogadas"); return; }
    if (buyPremium()) setFeedSel("premium");
  };

  const releaseFood = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isAiming || (MONETIZATION.paywallEnabled && food <= 0)) return;
    const w = world.current;
    const usingPremium = feedSel === "premium";
    if (usingPremium) {
      if (premiumCount <= 0) { setMessage("Sem ração premium — compre por ◎30 no seletor de ração"); setIsAiming(false); return; }
      setPremiumCount((value) => value - 1);
    }
    const raw = pointFromEvent(event);
    const spot = clampToWater((raw.x / 100) * w.w, (raw.y / 100) * w.h);

    // mira direcionada: o peixe mais próximo do ponto de queda recebe a ração só dele
    const capR = Math.min(w.w, w.h) * 0.08;
    let targetFish: Fish | null = null; let td = capR;
    for (const f of w.fishes) {
      const d = Math.hypot(f.x - spot.x, f.y - spot.y);
      if (d < td) { td = d; targetFish = f; }
    }
    const throwId = nextId.current;
    w.throws.set(throwId, { feed: usingPremium ? "premium" : "comum", targetFid: targetFish ? targetFish.fid : null });
    if (w.throws.size > 120) { const oldest = w.throws.keys().next(); if (oldest.value !== undefined) w.throws.delete(oldest.value); }

    const missionReady = missionFed + 1 >= MISSION_GOAL && !missionClaimed;
    setTarget({ x: (spot.x / w.w) * 100, y: (spot.y / w.h) * 100 });
    setIsAiming(false); setJumpBurst(true); setIsEating(true); setThrowing(true);
    setFood((value) => value - 1); setXp((value) => value + MONETIZATION.wallet.xpPerFeed);
    setTotalFed((value) => value + 1); setMissionFed((value) => Math.min(MISSION_GOAL, value + 1));

    // one throw = a handful that bursts into individual pellets scattered at
    // random across a cloud around the landing point. Ração direcionada cai
    // bem fechada em volta do peixe; no cardume, espalha pela água.
    const newDrops: Pellet[] = [];
    const spread = Math.min(w.w, w.h) * (targetFish ? 0.038 : 0.085);
    for (let k = 0; k < PELLETS_PER_THROW; k++) {
      const id = nextId.current++;
      const ang = Math.random() * TAU;
      const dist = k === 0 ? 0 : spread * Math.sqrt(Math.random());
      let px = { x: spot.x + Math.cos(ang) * dist, y: spot.y + Math.sin(ang) * dist };
      const dx = px.x - w.platform.x, dy = px.y - w.platform.y;
      const d = Math.hypot(dx, dy) || 1;
      const minD = w.platform.r * 1.1 + 14;
      if (d < minD) {
        const ringAng = Math.atan2(dy, dx) + (k - (PELLETS_PER_THROW - 1) / 2) * 0.18;
        px = { x: w.platform.x + Math.cos(ringAng) * minD, y: w.platform.y + Math.sin(ringAng) * minD };
      }
      px = {
        x: Math.max(w.w * 0.05, Math.min(w.w * 0.95, px.x)),
        y: Math.max(w.h * 0.1, Math.min(w.h * 0.94, px.y)),
      };
      w.pellets.set(id, { x: px.x, y: px.y, born: performance.now(), food: PELLET_FOOD, eaters: 0, wobble: Math.random() * TAU, throwId });
      newDrops.push({ id, x: (px.x / w.w) * 100, y: (px.y / w.h) * 100, feed: usingPremium ? "premium" : "comum" });
    }
    setPellets((value) => [...value, ...newDrops]);
    for (const f of w.fishes) {
      if (Math.hypot(f.x - spot.x, f.y - spot.y) < Math.min(w.w, w.h) * 0.42) f.burst = 1;
    }

    if (targetFish) {
      const stage = stageOf(targetFish.progress);
      const progText2 = stage === 2 ? "ADULTO" : `${progText(targetFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}`;
      setMessage(`Ração ${usingPremium ? "premium " : ""}para ${fishName(targetFish)} (${progText2})${targetFish.sick ? " • DOENTE — não cresce sem remédio" : ""}`);
    } else {
      setMessage(`Ração ao cardume • crescimento mais lento (+4 jogadas)`);
    }

    // peixes podem adoecer: param de crescer até receberrem remédio (◎5)
    if (Math.random() < SICK_CHANCE) {
      const healthy = w.fishes.filter((f) => !f.sick);
      if (healthy.length) {
        const victim = healthy[Math.floor(Math.random() * healthy.length)];
        victim.sick = true;
        window.setTimeout(() => setMessage(`${fishName(victim)} ficou DOENTE! Toque nele e use o remédio (◎${MED_PRICE})`), 1200);
        bumpFishTick();
      }
    }

    window.setTimeout(() => setThrowing(false), 700);
    window.setTimeout(() => setJumpBurst(false), 1050);
    window.setTimeout(() => { setIsEating(false); setMessage(missionReady ? "Missão pronta! Resgate +25 moedas" : "Segure para mirar • perto de um peixe = ração só dele"); }, 1750);
  };

  // venda: só peixes ADULTOS, ◎10 cada (todos os variantes atuais são básicos)
  const sellSelectedFish = () => {
    const w = world.current;
    const idx = w.fishes.findIndex((f) => f.fid === selectedFid);
    if (idx < 0) return;
    const fish = w.fishes[idx];
    if (stageOf(fish.progress) < 2) return;
    w.fishes.splice(idx, 1);
    setSelectedFid(null);
    setCoins((value) => value + SELL_PRICE);
    setMessage(`${fishName(fish)} vendido por ◎${SELL_PRICE}! Novos peixes chegam em instantes`);
    bumpFishTick();
    window.setTimeout(() => {
      if (world.current.spawnFish) {
        world.current.spawnFish();
        setMessage("Um novo peixe MINI chegou ao lago");
        bumpFishTick();
      }
    }, 6000);
  };

  const medicateSelectedFish = () => {
    const fish = world.current.fishes.find((f) => f.fid === selectedFid);
    if (!fish || !fish.sick) return;
    if (remedios > 0) {
      setRemedios((value) => value - 1);
      fish.sick = false;
      setMessage(`${fishName(fish)} curado com o remédio do estoque!`);
      bumpFishTick();
      return;
    }
    if (coins < MED_PRICE) { setMessage(`Remédio custa ◎${MED_PRICE} — venda peixes adultos para juntar moedas`); return; }
    setCoins((value) => value - MED_PRICE);
    fish.sick = false;
    setMessage(`${fishName(fish)} curado! (−◎${MED_PRICE})`);
    bumpFishTick();
  };

  const buyRemedio = () => {
    if (coins < MED_PRICE) { setMessage(`Remédio custa ◎${MED_PRICE} — venda peixes adultos para juntar moedas`); return; }
    setCoins((value) => value - MED_PRICE);
    setRemedios((value) => value + 1);
    setMessage(`Remédio +1 no estoque (−◎${MED_PRICE}) — toque no peixe doente para aplicar`);
  };

  const claimReward = () => {
    if (rewardClaimed) return;
    setRewardClaimed(true); setCoins((value) => value + MONETIZATION.dailyReward.coins); setFood((value) => value + MONETIZATION.dailyReward.rations);
    setMessage(`Recompensa diária: +${MONETIZATION.dailyReward.coins} moedas`);
  };

  const claimMission = () => {
    if (missionClaimed || missionFed < MISSION_GOAL) return;
    setMissionClaimed(true); setCoins((value) => value + MISSION_REWARD);
    setMessage(`Missão cumprida: +${MISSION_REWARD} moedas Koi`);
  };

  const beginGame = () => {
    setIntroLeaving(true);
    window.setTimeout(() => setIntro(false), 450);
  };

  // peixe selecionado, lido do espelho do mundo (cartão sempre atualizado)
  const selectedFish = useMemo(
    () => fishView.find((f) => f.fid === selectedFid) ?? null,
    [fishView, selectedFid],
  );

  // ===================== fish world (canvas) =====================
  useEffect(() => {
    const w = world.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    w.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Slice every variety atlas into animation frames. Source fish point north.
    const animOrder: AnimName[] = ["swim", "fast", "idle", "turnR", "bob", "eat"];
    const FRAME_SRC = 512;
    const buildFrames = (atlases: HTMLImageElement[]) => {
      const offsets: Partial<Record<AnimName, number>> = {};
      let total = 0;
      for (const anim of animOrder) { offsets[anim] = total; total += ANIMS[anim].frames; }
      offsets.turnL = offsets.turnR;
      w.animOffsets = offsets as Record<AnimName, number>;
      w.frames = [];
      w.framesSmall = [];
      for (const img of atlases) {
        const list: HTMLCanvasElement[] = new Array(total);
        const cellW = img.naturalWidth / ATLAS_COLUMNS;
        const cellH = img.naturalHeight / ATLAS_ROWS;
        const frameScale = Math.min(FRAME_SRC / cellW, FRAME_SRC / cellH);
        const destW = cellW * frameScale;
        const destH = cellH * frameScale;
        for (const anim of animOrder) {
          const meta = ANIMS[anim];
          const base = offsets[anim]!;
          for (let i = 0; i < meta.frames; i++) {
            const s = document.createElement("canvas");
            s.width = FRAME_SRC; s.height = FRAME_SRC;
            const sc = s.getContext("2d")!;
            sc.imageSmoothingEnabled = true;
            sc.imageSmoothingQuality = "high";
            sc.drawImage(
              img,
              i * cellW, meta.row * cellH, cellW, cellH,
              (FRAME_SRC - destW) / 2, (FRAME_SRC - destH) / 2, destW, destH,
            );
            list[base + i] = s;
          }
        }
        w.frames.push(list);
        w.framesSmall.push(list.map((c) => {
          const half = document.createElement("canvas");
          half.width = FRAME_SRC / 2; half.height = FRAME_SRC / 2;
          const hc = half.getContext("2d")!;
          hc.imageSmoothingEnabled = true;
          hc.imageSmoothingQuality = "high";
          hc.drawImage(c, 0, 0, FRAME_SRC / 2, FRAME_SRC / 2);
          return half;
        }));
      }
      w.ready = true;
    };

    Promise.all(KOI_VARIANTS.map((variant) => new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = variant.file;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
    }))).then(buildFrames);

    const fishLen = (scale: number) => Math.min(w.w, w.h) * FISH_VIEWPORT_RATIO * scale;

    const makeFish = (progress: number): Fish => {
      const i = w.fishes.length;
      const scale = 0.55 + (i % 5) * 0.075;
      const ang = Math.random() * TAU;
      const rad = w.platform.r * 1.45 + Math.random() * Math.min(w.w, w.h) * 0.1;
      const x = w.platform.x + Math.cos(ang) * rad;
      const y = w.platform.y + Math.sin(ang) * rad;
      const heading = ang + Math.PI / 2 + (Math.random() - 0.5);
      const len = fishLen(scale);
      return {
        fid: nextId.current++,
        x, y, heading, speed: 30,
        len: len * sizeFactor(progress), renderLen: len * sizeFactor(progress), scale, baseLen: len,
        progress: Math.min(STAGE_ADULTO, progress), sick: loadedSick.current[i] === 1, lastThrow: -1,
        variant: i % KOI_VARIANTS.length, phase: Math.random() * TAU, seed: Math.random() * 10,
        wanderT: Math.random() * 20, state: "wander", targetPellet: -1, eatT: 0, burst: 0,
        anim: "swim", animT: Math.random(), turnT: 0, turning: 0,
        legDir: heading, legT: 1 + Math.random() * 2, legSpeed: 58 * w.u, resting: false,
        turnAcc: 0, turnSignAcc: 0,
      };
    };

    const spawnAll = () => {
      const count = Math.min(w.w, w.h) < 520 ? 17 : FISH_COUNT;
      for (let i = 0; i < count; i++) {
        const fish = makeFish(loadedProgress.current[i] ?? 0);
        fish.variant = i % KOI_VARIANTS.length;
        const ang = (i / count) * TAU + Math.random() * 0.5;
        const rad = w.platform.r * 1.45 + Math.random() * Math.min(w.w, w.h) * 0.1;
        fish.x = w.platform.x + Math.cos(ang) * rad;
        fish.y = w.platform.y + Math.sin(ang) * rad;
        fish.heading = ang + Math.PI / 2 + (Math.random() - 0.5);
        fish.legDir = fish.heading;
        w.fishes.push(fish);
      }
    };

    const measure = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      w.w = rect.width; w.h = rect.height;
      w.dpr = Math.min(2, window.devicePixelRatio || 1);
      w.u = Math.min(w.w, w.h) / 900;
      canvas.width = Math.round(w.w * w.dpr);
      canvas.height = Math.round(w.h * w.dpr);
      const plat = host.querySelector(".platform")?.getBoundingClientRect();
      if (plat) {
        w.platform = {
          x: plat.left + plat.width / 2 - rect.left,
          y: plat.top + plat.height / 2 - rect.top,
          r: plat.width / 2,
        };
      }
      if (!w.fishes.length) spawnAll();
      const salvos = loadedProgress.current
        .map((progress, index) => (progress >= STAGE_ADULTO ? index % KOI_VARIANTS.length : -1))
        .filter((variant) => variant >= 0);
      if (salvos.length && !collectionRef.current.length) {
        collectionRef.current = [...new Set(salvos)];
        setCollection(collectionRef.current);
      }
    };

    const steer = (f: Fish, desired: number, turnRate: number, dt: number) => {
      const d = angleDiff(desired, f.heading);
      f.heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, d));
    };

    const step = (dt: number) => {
      const now = performance.now();
      const perception = Math.hypot(w.w, w.h) * 0.55;
      const finished: number[] = [];
      for (const p of w.pellets.values()) p.eaters = 0;
      for (const f of w.fishes) {
        // Ease toward the new stage size instead of popping larger on a bite.
        // renderLen remains a single value so the sprite's aspect ratio cannot
        // become wider or taller independently while it grows.
        f.renderLen += (f.len - f.renderLen) * Math.min(1, dt * 4.5);
        f.wanderT += dt;
        f.burst = Math.max(0, f.burst - dt * 0.9);
        if (f.eatT > 0) f.eatT -= dt;

        let nearest: WorldPellet | null = null; let nd = Infinity; let nid = -1;
        for (const [pid, p] of w.pellets) {
          if (p.food <= 0) continue;
          const d = Math.hypot(f.x - p.x, f.y - p.y);
          if (d < nd) { nd = d; nearest = p; nid = pid; }
        }
        if (nearest && nd < perception) {
          f.state = "seek"; f.targetPellet = nid;
        } else if (w.aiming && Math.hypot(f.x - w.aim.x, f.y - w.aim.y) < perception * 1.3) {
          f.state = "curious";
        } else if (f.state !== "wander") {
          f.state = "wander";
        }

        if (f.state === "wander") {
          f.legT -= dt;
          if (f.legT <= 0) {
            if (Math.random() < 0.3) {
              f.legSpeed = 0;
              f.legT = 2.8 + Math.random() * 3.6;
              f.legDir = f.heading + (Math.random() - 0.5) * 0.5;
              f.resting = true;
            } else {
              if (f.resting) { f.legDir = f.heading + (Math.random() - 0.5) * 0.9; f.resting = false; }
              else if (Math.random() < 0.24) { f.legDir = f.heading + (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.9); }
              else { f.legDir = f.heading + (Math.random() - 0.5) * 0.3; }
              f.legT = 2.4 + Math.random() * 3.2;
              f.legSpeed = (44 + Math.random() * 32) * w.u;
            }
          }
        }
        let desired = f.legDir + Math.sin(f.wanderT * 1.2 + f.seed) * 0.06;
        let targetSpeed = f.legSpeed;
        let turnRate = 1.15;
        let frenzy = false;
        if (f.state === "seek" && nearest) {
          frenzy = true;
          const base = Math.atan2(nearest.y - f.y, nearest.x - f.x);
          desired = base + Math.sin(now * 0.021 + f.seed * 7) * 0.85;
          const ndNorm = nd / perception;
          const dash = 168 + 70 * f.burst + 60 * (1 - ndNorm);
          targetSpeed = dash * w.u * (nd < f.len * 0.55 ? 0.3 : 1);
          turnRate = 4.4;
        } else if (f.state === "curious") {
          desired = Math.atan2(w.aim.y - f.y, w.aim.x - f.x);
          const aimD = Math.hypot(w.aim.x - f.x, w.aim.y - f.y);
          targetSpeed = aimD < f.len * 1.7 ? 12 * w.u : 108 * w.u;
          turnRate = aimD < f.len * 1.7 ? 2.4 : 1.8;
        }
        if (f.sick) targetSpeed *= 0.55; // peixe doente nada murchinho

        let sx = 0, sy = 0, ax = 0, ay = 0, an = 0;
        for (const o of w.fishes) {
          if (o === f) continue;
          const dx = f.x - o.x, dy = f.y - o.y;
          const d = Math.hypot(dx, dy);
          const minD = (f.len + o.len) * 0.36;
          if (d > 0.001 && d < minD) {
            const k = (1 - d / minD) * (frenzy ? 3.4 : 2.1);
            sx += (dx / d) * k;
            sy += (dy / d) * k;
          }
          if (d < f.len * 1.6 && d > 0.001) {
            ax += Math.cos(o.heading); ay += Math.sin(o.heading); an++;
          }
        }
        let flockx = sx, flocky = sy;
        if (an > 0) {
          const wobble = frenzy ? 0.45 : 0.8;
          flockx += (ax / an) * 0.35 * wobble;
          flocky += (ay / an) * 0.35 * wobble;
        }
        const flockMag = Math.hypot(flockx, flocky);
        if (flockMag > 0.04) {
          desired = Math.atan2(Math.sin(desired) + flocky, Math.cos(desired) + flockx);
          turnRate = Math.max(turnRate, frenzy ? 6.2 : 3);
          if (flockMag > 1.1) targetSpeed = Math.max(targetSpeed, (frenzy ? 175 : 105) * w.u);
        }

        let avx = 0, avy = 0;
        const pdx = f.x - w.platform.x, pdy = f.y - w.platform.y;
        const pd = Math.hypot(pdx, pdy) || 1;
        const avoidR = w.platform.r + f.len * 0.65;
        if (pd < avoidR) { const k = (1 - pd / avoidR) * 2.6; avx += (pdx / pd) * k; avy += (pdy / pd) * k; }
        const m = Math.min(w.w, w.h) * 0.06;
        const mTop = 92 * w.u + 24;
        if (f.x < m) avx += ((m - f.x) / m) * 2.2;
        if (f.x > w.w - m) avx -= ((f.x - (w.w - m)) / m) * 2.2;
        if (f.y < mTop) avy += ((mTop - f.y) / mTop) * 2.2;
        if (f.y > w.h - m) avy -= ((f.y - (w.h - m)) / m) * 2.2;
        const avMag = Math.hypot(avx, avy);
        if (avMag > 0.05) {
          desired = Math.atan2(Math.sin(desired) + avy, Math.cos(desired) + avx);
          turnRate = Math.max(turnRate, 2.6);
          if (avMag > 1.2) targetSpeed = Math.max(targetSpeed, 95 * w.u);
        }

        if (f.turnT > 0.12) targetSpeed = Math.min(targetSpeed, 48 * w.u);
        steer(f, desired, turnRate, dt);
        f.speed += (targetSpeed - f.speed) * Math.min(1, dt * (frenzy ? 5 : 2.4));
        f.x += Math.cos(f.heading) * f.speed * dt;
        f.y += Math.sin(f.heading) * f.speed * dt;

        const turnDelta = angleDiff(f.heading, f.prevHeading ?? f.heading);
        f.turnAcc = f.turnAcc * Math.exp(-3.2 * dt) + Math.abs(turnDelta);
        f.turnSignAcc = f.turnSignAcc * Math.exp(-3.2 * dt) + turnDelta;
        f.prevHeading = f.heading;

        // feeding: first bite of a throw counts for that fish — direcionada
        // rende cheio para o peixe mirado; cardume (ou furto) rende 10/14
        if (nearest && nd < f.len * 0.4) {
          nearest.eaters += 1;
          if (f.eatT <= 0) {
            f.eatT = 0.62;
            nearest.food -= EAT_RATE;
            if (nearest.throwId !== f.lastThrow) {
              f.lastThrow = nearest.throwId;
              const meta = w.throws.get(nearest.throwId);
              if (meta && !f.sick) {
                const base = meta.feed === "premium" ? PREMIUM_VALUE : 1;
                const aimedAtMe = meta.targetFid === f.fid;
                const value = base * (aimedAtMe ? 1 : SCHOOL_FACTOR);
                const prevStage = stageOf(f.progress);
                f.progress = Math.min(STAGE_ADULTO, f.progress + value);
                f.len = f.baseLen * sizeFactor(f.progress);
                const nowStage = stageOf(f.progress);
                if (nowStage > prevStage) {
                  setGrowSplash({ x: (f.x / w.w) * 100, y: (f.y / w.h) * 100, k: f.fid * 1000 + Math.round(f.progress * 10) });
                  setMessage(nowStage === 2
                    ? `${fishName(f)} virou ADULTO — vale ◎${SELL_PRICE} na venda!`
                    : `${fishName(f)} cresceu: ${STAGE_NAMES[nowStage]}!`);
                  window.setTimeout(() => setGrowSplash(null), 950);
                  if (nowStage === 2 && !collectionRef.current.includes(f.variant)) {
                    collectionRef.current = [...collectionRef.current, f.variant];
                    setCollection(collectionRef.current);
                    window.setTimeout(() => setMessage(`★ ${VARIANT_NAMES[f.variant]} entrou na sua coleção! Novas peças na Loja do Lago`), 1400);
                  }
                }
                bumpFishTick();
              }
            }
            f.burst = Math.max(f.burst, 0.55);
            if (nearest.food <= 0) {
              w.pellets.delete(nid);
              finished.push(nid);
            }
          }
        }

        if (f.state !== "seek" && f.turnT <= 0 && f.turnAcc > 0.8) {
          f.turning = f.turnSignAcc >= 0 ? 1 : -1;
          f.turnT = ANIMS.turnR.frames / ANIMS.turnR.fps;
          f.animT = 0;
          f.turnAcc = 0; f.turnSignAcc = 0;
        }
        if (f.turnT > 0) f.turnT -= dt; else f.turning = 0;
        const aimD = Math.hypot(w.aim.x - f.x, w.aim.y - f.y);
        if (f.state === "seek" && nearest && nd < f.len * 0.9) f.anim = "eat";
        else if (f.state === "seek" && nearest && nd < f.len * 2.6) f.anim = "bob";
        else if (f.state === "seek") f.anim = "fast";
        else if (f.state === "curious" && aimD < f.len * 2.4) f.anim = "bob";
        else if (f.turning !== 0) f.anim = f.turning === 1 ? "turnR" : "turnL";
        else if (f.speed < 22 * w.u) f.anim = "idle";
        else f.anim = "swim";
        const meta = ANIMS[f.anim];
        f.animT = (f.animT + dt * meta.fps) % (meta.loop ? meta.frames * 2 - 2 : meta.frames + 0.999);
        if (!meta.loop && f.animT > meta.frames - 1) f.animT = meta.frames - 1;
      }

      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < w.fishes.length; i++) {
          for (let j = i + 1; j < w.fishes.length; j++) {
            const a = w.fishes[i], b = w.fishes[j];
            const probe = (f: Fish, t: number) => ({
              x: f.x - Math.cos(f.heading) * f.len * t,
              y: f.y - Math.sin(f.heading) * f.len * t,
              r: f.len * (t < 0.45 ? 0.19 : 0.13),
            });
            const pa = [probe(a, 0.25), probe(a, 0.65)];
            const pb = [probe(b, 0.25), probe(b, 0.65)];
            let worst = 0, nx = 0, ny = 0;
            for (const ca of pa) for (const cb of pb) {
              const ddx = cb.x - ca.x, ddy = cb.y - ca.y;
              const dd = Math.hypot(ddx, ddy) || 0.001;
              const overlap = ca.r + cb.r - dd;
              if (overlap > worst) { worst = overlap; nx = ddx / dd; ny = ddy / dd; }
            }
            if (worst <= 0) continue;
            const px = nx * worst * 0.5, py = ny * worst * 0.5;
            a.x -= px; a.y -= py;
            b.x += px; b.y += py;
          }
        }
      }
      if (finished.length) {
        for (const pid of finished) w.pellets.delete(pid);
        setPellets((value) => value.filter((item) => !finished.includes(item.id)));
      }
    };

    const drawLabel = (text: string, x: number, y: number) => {
      ctx.font = "800 12px Arial, Helvetica, sans-serif";
      const tw = ctx.measureText(text).width;
      const bx = Math.max(6, Math.min(w.w - tw - 22, x - tw / 2 - 8));
      const by = Math.max(8, y - 34);
      ctx.fillStyle = "rgba(9,38,52,.88)";
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 16, 20, 9);
      ctx.fill();
      ctx.fillStyle = "#f4ead7";
      ctx.fillText(text, bx + 8, by + 14);
    };

    const drawRing = (f: Fish, color: string, dash: [number, number]) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.arc(f.x, f.y - f.len * 0.05, f.len * 0.72, 0, TAU);
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(w.dpr, 0, 0, w.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, w.w, w.h);
      for (const [pid, p] of w.pellets) {
        const el = pelletEls.current.get(pid);
        if (!el) continue;
        const wob = Math.sin(now1() * 0.0021 + p.wobble) * 3;
        el.style.left = `${(p.x / w.w) * 100}%`;
        el.style.top = `${((p.y + wob) / w.h) * 100}%`;
      }
      if (!w.ready) return;

      // mira: destaca o peixe que receberia a ração direcionada
      let aimFish: Fish | null = null; let aimBd = Math.min(w.w, w.h) * 0.08;
      if (w.aiming) {
        for (const f of w.fishes) {
          const d = Math.hypot(f.x - w.aim.x, f.y - w.aim.y);
          if (d < aimBd) { aimBd = d; aimFish = f; }
        }
      }

      for (const f of w.fishes) {
        const meta = ANIMS[f.anim];
        const base = w.animOffsets[f.anim] ?? 0;
        const phase = f.animT < meta.frames ? f.animT : meta.frames * 2 - 2 - f.animT;
        const frameFloor = Math.min(meta.frames - 1, Math.floor(phase));
        const frameCeil = Math.min(meta.frames - 1, Math.ceil(phase));
        const frameMixRaw = phase - frameFloor;
        const frameMix = frameMixRaw * frameMixRaw * (3 - 2 * frameMixRaw);
        const idx = base + frameFloor;
        const nextIdx = base + frameCeil;
        const L = f.renderLen * 1.28;
        const LDevice = L * w.dpr;
        const pool = LDevice <= (FRAME_SRC / 2) * 1.25 ? w.framesSmall : w.frames;
        const frameCanvas = pool[f.variant]?.[idx];
        const nextFrameCanvas = pool[f.variant]?.[nextIdx];
        if (frameCanvas) {
          ctx.save();
          // submerso: alfa deixa a água da cena atravessar o peixe
          ctx.translate(f.x, f.y);
          ctx.rotate(f.heading + Math.PI / 2);
          if (f.anim === "turnL") ctx.scale(-1, 1);
          ctx.globalAlpha = 0.8 * (nextFrameCanvas && nextIdx !== idx ? 1 - frameMix : 1);
          ctx.drawImage(frameCanvas, -L / 2, -L / 2, L, L);
          if (nextFrameCanvas && nextIdx !== idx) {
            ctx.globalAlpha = 0.8 * frameMix;
            ctx.drawImage(nextFrameCanvas, -L / 2, -L / 2, L, L);
          }
          ctx.restore();
        }
        // peixe doente: cruz verde pulsando acima da cabeça
        if (f.sick) {
          const pulse = 0.7 + 0.3 * Math.sin(now1() * 0.006 + f.seed);
          const r = Math.max(7, f.len * 0.14);
          const bx = f.x + Math.cos(f.heading) * f.len * 0.3;
          const by = f.y + Math.sin(f.heading) * f.len * 0.3 - f.len * 0.55 - r;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = "#5fae54";
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = Math.max(1.6, r * 0.26);
          ctx.beginPath();
          ctx.moveTo(bx - r * 0.42, by); ctx.lineTo(bx + r * 0.42, by);
          ctx.moveTo(bx, by - r * 0.42); ctx.lineTo(bx, by + r * 0.42);
          ctx.stroke();
          ctx.restore();
        }
        if (w.selectedFid === f.fid) drawRing(f, "rgba(239,184,102,.95)", [7, 5]);
      }

      if (aimFish) {
        const stage = stageOf(aimFish.progress);
        const label = stage === 2
          ? `${VARIANT_NAMES[aimFish.variant].toUpperCase()} • ADULTO • venda ◎${SELL_PRICE}`
          : `${VARIANT_NAMES[aimFish.variant].toUpperCase()} • ${STAGE_NAMES[stage]} ${progText(aimFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}${aimFish.sick ? " • DOENTE" : ""}`;
        drawRing(aimFish, "rgba(255,255,255,.9)", [5, 4]);
        drawLabel(label, aimFish.x, aimFish.y - aimFish.len * 0.6);
      }
    };

    const frame = (t: number) => {
      w.raf = requestAnimationFrame(frame);
      if (!w.last) w.last = t;
      const dt = Math.min(0.05, (t - w.last) / 1000);
      w.last = t;
      if (dt > 0) step(dt);
      draw();
    };

    measure();
    w.spawnFish = (progress = 0) => {
      const fish = makeFish(progress);
      fish.variant = Math.floor(Math.random() * KOI_VARIANTS.length);
      fish.sick = false;
      w.fishes.push(fish);
    };
    (window as unknown as { __koiFish?: () => unknown }).__koiFish = () =>
      w.fishes.map((f) => ({ fid: f.fid, x: f.x, y: f.y, heading: f.heading, len: f.len, anim: f.anim, variant: f.variant, progress: f.progress, stage: stageOf(f.progress), sick: f.sick }));
    // debug hook: dirige a simulação manualmente (cheques automatizados e
    // ambientes com requestAnimationFrame suspenso)
    (window as unknown as { __koiStep?: (dt: number) => void }).__koiStep = (dt: number) => step(dt);
    window.addEventListener("resize", measure);
    w.raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(w.raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const selectedStage = selectedFish ? stageOf(selectedFish.progress) : 0;
  const stageProgressPct = selectedFish
    ? selectedStage === 0 ? (selectedFish.progress / STAGE_MEDIO) * 100
      : selectedStage === 1 ? ((selectedFish.progress - STAGE_MEDIO) / (STAGE_ADULTO - STAGE_MEDIO)) * 100
        : 100
    : 0;

  return (
    <main className="experience">
      <section
        className={`pond-world ${isAiming ? "aiming-time" : ""} ${isEating ? "eating-time" : ""} ${jumpBurst ? "jumping-time" : ""} ${throwing ? "throwing-time" : ""}`}
        onPointerDown={handleWorldPointerDown}
        onPointerMove={moveAim}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Tanque de carpas visto de cima"
      >
        <header className="topbar">
          <div className="brand"><span className="seal">鯉</span><div><strong>KOI CAFÉ</strong><small>CARP CAFÉ • TANQUE 07</small></div></div>
          <div className="wallet">
            <button className="wallet-coins" onClick={() => setStoreOpen(true)}><span>◉</span><strong>{coins}</strong><small>MOEDAS KOI</small></button>
            <button className="gear-btn" aria-label="Configurações" onClick={() => setSettingsOpen((v) => !v)}><span>⚙</span></button>
            {settingsOpen && (
              <div className="settings-pop" role="dialog" aria-label="Configurações">
                <div><span>SOM</span><button onClick={() => setSom((v) => !v)}>{som ? "LIGADO" : "MUDO"}</button></div>
                <div><span>IDIOMA</span><button onClick={() => setIdioma((i) => (i === "pt" ? "en" : "pt"))}>{idioma === "pt" ? "PT-BR" : "EN"}</button></div>
                <div><span>TREMER PEIXES</span><button onClick={() => setMessage("Os peixes continuam nadando livremente!")}>ON</button></div>
              </div>
            )}
          </div>
        </header>

        {/* água viva: textura em duas camadas com deriva lenta */}
        <div className="pond-water" aria-hidden>
          <img src="/scenery/water-bg.jpg?v=1" alt="" draggable={false} />
          <img className="pond-water-b" src="/scenery/water-bg.jpg?v=1" alt="" draggable={false} />
        </div>

        <canvas ref={canvasRef} className="fish-canvas" aria-hidden />

        {/* peças do lago compradas na Loja do Lago */}
        {SCENERY.filter((item) => bought.includes(item.bundle ?? item.id)).map((item) => {
          const style = {
            left: `${item.x}%`,
            top: `${item.y}%`,
            "--sw": item.w,
            "--swmax": item.wmax ?? 10000,
            "--rot": `${item.rot ?? 0}deg`,
            "--syf": item.flat ?? 1,
            "--sz": item.z ?? 3,
            "--origin": item.origin,
            "--bob-delay": `${(item.x % 7) * 0.7}s`,
            "--drift-dur": `${item.dur ?? 26}s`,
          } as CSSProperties;
          const cls = `scenery-item sc-${item.id} ${item.floaty ? "scenery-floaty" : ""} ${item.sway ? "scenery-sway" : ""} ${item.wind ? "scenery-wind" : ""}`;
          if (item.fx) {
            return (
              <div key={item.id} className={`${cls} scenery-fx scenery-fx-${item.fx}`} style={style} aria-hidden>
                <img src={item.src} alt="" draggable={false} />
                {item.fx === "stream" ? (
                  <>
                    <i className="fx-pond-cover" />
                    <i className="fx-water" />
                    <i className="fx-impact" />
                    <i className="fx-ripple" />
                    <i className="fx-ripple fx-ripple-b" />
                  </>
                ) : item.fx === "leaves" ? (
                  <>
                    <img className="fx-leaf f2" src="/scenery/maple-f2.webp?v=1" alt="" draggable={false} />
                    <img className="fx-leaf f3" src="/scenery/maple-f3.webp?v=1" alt="" draggable={false} />
                  </>
                ) : (
                  <>
                    {BASIN_POOL_FRAMES.map((sourceFrame, index) => (
                      <i
                        key={`pool-${sourceFrame}`}
                        className={`fx-pool p${index + 1}`}
                        style={{ backgroundImage: `url(/scenery/basin-water/frame-${sourceFrame}.png?v=2)` }}
                      />
                    ))}
                    {BASIN_POUR_FRAMES.map((sourceFrame, index) => (
                      <i
                        key={sourceFrame}
                        className={`fx-pf k${index + 1}`}
                        style={{ backgroundImage: `url(/scenery/basin-water/frame-${sourceFrame}.png?v=2)` }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          }
          return <img key={item.id} className={cls} src={item.src} alt="" draggable={false} style={style} />;
        })}

        {isAiming && <div className="aim-target" style={{ left: `${target.x}%`, top: `${target.y}%` }}><i /><span>SOLTE AQUI</span></div>}
        {pellets.map((pellet) => <span className={`food-drop ${pellet.feed === "premium" ? "premium" : ""}`} key={pellet.id} ref={(el) => { if (el) pelletEls.current.set(pellet.id, el); else pelletEls.current.delete(pellet.id); }} style={{ left: `${pellet.x}%`, top: `${pellet.y}%` }}><i /></span>)}
        {jumpBurst && <span className="splash" style={{ left: `${target.x}%`, top: `${target.y}%` }}><i /><i /><i /><b /></span>}
        {growSplash && <span className="splash grow" style={{ left: `${growSplash.x}%`, top: `${growSplash.y}%` }}><i /><i /><i /><b /></span>}

        <section className="platform" aria-label="Banco de pedra redondo com o jogador">
          <div className="platform-shadow" />
          <img className="bench" src="/banco.png?v=1" alt="" draggable={false} />
          <div className="boy-frame">
            <img
              className={`boy-pose ${throwing ? "boy-pose-throwing" : ""} ${boySide === "left" ? "boy-pose-left" : "boy-pose-right"}`}
              src={throwing
                ? boySide === "left" ? "/boy-throw-left.png?v=2" : "/boy-throw-right.png?v=2"
                : boySide === "left" && isAiming ? "/boy-sit-left.png?v=2" : "/boy-sit-right.png?v=2"}
              alt="Menino sentado no banco segurando o pote de ração"
              draggable={false}
            />
          </div>
        </section>

        {/* cartão do peixe selecionado: estágio, progresso, vender e medicar */}
        {selectedFish && (
          <aside className="fish-card glass-card" data-stage={selectedStage}>
            <header>
              <span className="fish-dot" style={{ background: KOI_VARIANTS[selectedFish.variant]?.color }} />
              <div><strong>{fishName(selectedFish)}</strong><small>{selectedFish.sick ? "DOENTE" : STAGE_NAMES[selectedStage]}</small></div>
              <button className="fish-close" onClick={() => setSelectedFid(null)} aria-label="Fechar cartão do peixe">×</button>
            </header>
            {selectedStage < 2 ? (
              <>
                <div className="fish-progress"><i style={{ width: `${stageProgressPct}%` }} /></div>
                <small className="fish-progress-label">
                  {progText(selectedFish.progress)}/{selectedStage === 0 ? STAGE_MEDIO : STAGE_ADULTO} jogadas {selectedStage === 0 ? `→ ${STAGE_NAMES[1]}` : `→ ${STAGE_NAMES[2]}`}
                  {feedSel === "premium" ? " • premium acelera (2/7)" : ""}
                </small>
              </>
            ) : (
              <p className="fish-sell-note">Pronto para vender: ◎{SELL_PRICE} (peixe básico)</p>
            )}
            {selectedFish.sick && <p className="fish-sick-note">✚ Doente — não cresce sem remédio</p>}
            <div className="fish-actions">
              {selectedStage === 2 && <button className="sell" onClick={sellSelectedFish}>VENDER ◎{SELL_PRICE}</button>}
              {selectedFish.sick && <button className="med" onClick={medicateSelectedFish}>MEDICAR ◎{MED_PRICE}</button>}
            </div>
            <small className="fish-hint">Comum: 3→médio, 10→adulto • cardume: +4 jogadas</small>
          </aside>
        )}

        {shopOpen && (
          <section className="shop-tray" aria-label="Loja do lago">
            <header>
              <strong>LOJA DO LAGO • ★ {collection.length}/{KOI_VARIANTS.length} ESPÉCIES • SALDO ◎{coins}</strong>
              <button onClick={() => setShopOpen(false)}>FECHAR</button>
            </header>
            <div className="shop-tabs">
              <button className={`shop-tab ${shopTab === "pecas" ? "active" : ""}`} onClick={() => setShopTab("pecas")}>PEÇAS DO CENÁRIO</button>
              <button className={`shop-tab ${shopTab === "suprimentos" ? "active" : ""}`} onClick={() => setShopTab("suprimentos")}>SUPRIMENTOS</button>
            </div>
            {shopTab === "pecas" ? (
              <>
                <p className="shop-hint">Crie peixes ADULTOS para colecionar espécies — cada nova espécie libera peças do cenário.</p>
                <div className="shop-grid">
                  {SCENERY.filter((item) => !item.hide).map((item) => {
                    const owned = bought.includes(item.id);
                    const locked = collection.length < item.req;
                    return (
                      <button
                        key={item.id}
                        className={`shop-item ${owned ? "owned" : ""} ${locked ? "locked" : ""}`}
                        onClick={() => { if (!owned) buyScenery(item.id); }}
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
                <button className="shop-item" onClick={buyPremium}>
                  <span className="shop-thumb shop-supply">🐠</span>
                  <strong>Ração premium +1</strong>
                  <small className="shop-desc">cresce em 2/7 jogadas • estoque ×{premiumCount}</small>
                  <span className="shop-state price-chip">◎{PREMIUM_PRICE}</span>
                </button>
                <button className="shop-item" onClick={buyRemedio}>
                  <span className="shop-thumb shop-supply">✚</span>
                  <strong>Remédio +1</strong>
                  <small className="shop-desc">cura um peixe doente • estoque ×{remedios}</small>
                  <span className="shop-state price-chip">◎{MED_PRICE}</span>
                </button>
              </div>
            )}
          </section>
        )}

        <div className="bottom-console">
          <div className="daily-ration">
            <div className="ration-ring" style={{ "--ration": "100%" } as CSSProperties}><strong>{feedSel === "premium" ? `×${premiumCount}` : "∞"}</strong><span>{feedSel === "premium" ? "prem." : "comum"}</span></div>
            <p><strong>{feedSel === "premium" ? "Ração premium" : "Ração comum"}</strong><small>{feedSel === "premium" ? "2/7 jogadas • ◎30" : "grátis • 3/10 jogadas"}</small></p>
          </div>
          <div className="feed-control">
            <p>{message}</p>
            <div className="feed-chips">
              <button className={`feed-chip ${feedSel === "comum" ? "active" : ""}`} onClick={() => { setFeedSel("comum"); setMessage("Ração comum: grátis, cresce em 3/10 jogadas"); }}>COMUM ∞</button>
              <button className={`feed-chip ${feedSel === "premium" ? "active" : ""}`} onClick={onPremiumChip}>PREMIUM ×{premiumCount} <b>◎{PREMIUM_PRICE}</b></button>
              <button className="feed-chip add" onClick={buyPremium} aria-label="Comprar mais ração premium">+1</button>
            </div>
            <button className="aim-button" onPointerDown={startAim} aria-pressed={isAiming}><span>✦</span>{isAiming ? "ARRASTE A MIRA…" : "SEGURE PARA ALIMENTAR"}</button>
          </div>
          <button className="store-button" onClick={() => setStoreOpen(true)}><span>♢</span><div><strong>LOJA KOI</strong><small>Pacotes e Clube</small></div><b>›</b></button>
          <button className="lago-btn" onClick={() => setShopOpen(true)}>
            <span className="lago-flower">✿</span>
            <b>LAGO</b>
            <i className="lago-badge">{collection.length}/{KOI_VARIANTS.length}★</i>
          </button>

          <div className="console-info">
            <span className="chip">★ {streak} {streak === 1 ? "dia" : "dias"}</span>
            <span className="chip">Missão {missionFed}/{MISSION_GOAL}</span>
            <span className="chip">Nível {level}</span>
            {missionFed >= MISSION_GOAL && !missionClaimed && <button className="chip claim" onClick={claimMission}>RESGATAR MISSÃO +{MISSION_REWARD}</button>}
            {!rewardClaimed && <button className="chip claim" onClick={claimReward}>SEQUÊNCIA +15</button>}
          </div>
        </div>

        {storeOpen && <div className="modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setStoreOpen(false); }}><section className="store-modal" role="dialog" aria-modal="true" aria-label="Loja Koi"><header><div><small>KOI CAFÉ</small><h2>Mais momentos no lago</h2><p>Escolha um pacote ou entre para o Clube Nishiki.</p></div><button className="close-modal" onClick={() => setStoreOpen(false)} aria-label="Fechar loja">×</button></header><div className="plans">{MONETIZATION.store.plans.map((plan) => <article className={plan.tag === "MAIS POPULAR" ? "featured-plan" : ""} key={plan.id}>{plan.tag && <span className="plan-tag">{plan.tag}</span>}<div className="plan-art"><i>✦</i><i>✦</i><i>✦</i></div><h3>{plan.name}</h3><p>{plan.detail}</p><strong>{plan.amount}</strong><button onClick={() => { setStoreOpen(false); setMessage(`${plan.name}: checkout de exemplo — nesta amostra as moedas vêm da venda de peixes`); }}>SELECIONAR</button></article>)}</div><footer><span>▣ Pagamento protegido</span><span>Sem anúncios invasivos</span><span>Cancele quando quiser</span></footer></section></div>}

        {intro && (
          <div className={`intro ${introLeaving ? "leaving" : ""}`}>
            <div className="intro-art" aria-hidden>
              <img className="ia-koi ia-koi-a" src="/koi-hero.png?v=1" alt="" draggable={false} />
              <img className="ia-koi ia-koi-b" src="/koi-hero.png?v=1" alt="" draggable={false} />
              <img className="ia-koi ia-koi-c" src="/koi-hero.png?v=1" alt="" draggable={false} />
              <img className="ia-koi ia-koi-d" src="/koi-hero.png?v=1" alt="" draggable={false} />
              <img className="ia-boy" src="/boy-idle.png?v=4" alt="" draggable={false} />
            </div>
            <div className="intro-panel">
              <small>CARP CAFÉ</small>
              <h1>Koi Café</h1>
              <p>Mire perto de um peixe para alimentar só ele: 3 jogadas e ele vira MÉDIO, 10 e vira ADULTO — vendido por ◎10. Jogar na água aberta alimenta o cardume (+4 jogadas). Cada espécie que chega a ADULTO entra na sua coleção e libera novas peças na Loja do Lago: ponte, samambaia, fonte de bambu e mais!</p>
              <button onClick={beginGame}>TOCAR PARA COMEÇAR</button>
              <span>Sample de gameplay • venda de peixes, remédios, ração premium e cenário completo</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
