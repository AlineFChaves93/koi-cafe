// ===================== loja do lago (partes separadas) =====================
// As peças formam 7 níveis sequenciais: a próxima peça só destrava quando a
// anterior é comprada E posicionada no lago (a compra já posiciona na montagem,
// então "bought" = "no lago"). Ao completar um nível — todas as peças dele no
// lago — o jogador leva a recompensa do nível (nova espécie de peixe, baldes
// de ração comum ou potes de ração especial).
//
// Positions are viewport percentages (x/y relative to canvas center, w relative
// to canvas width) exactly as the previous CSS layout expressed them.
export const sceneWidthFor = (width: number, height: number): number =>
  Math.min(width, height * (16 / 9));

export type SceneryItem = {
  id: string; src: string; x: number; y: number; w: number;
  flat?: number; rot?: number; floaty?: boolean; wmax?: number; z?: number; flipX?: boolean;
  label: string; price: number; level: number; thumb: string;
  sway?: boolean; origin?: string; dur?: number; wind?: boolean;
};

// A ordem do array é a ordem de desbloqueio da loja.
export const SCENERY: SceneryItem[] = [
  { id: "samambaia-a", src: "/assets/scenery/fern.png", x: 5.5, y: 40, w: 24, wmax: 460, z: 4, label: "Samambaia alta", price: 5, level: 1, thumb: "/assets/scenery/thumbs/samambaia-a.png" },
  { id: "pad-esq", src: "/assets/scenery/lilypad.png", x: 20.53, y: 36.48, w: 47.87, rot: 1.79, flat: 1.17, floaty: true, dur: 26, wmax: 919, label: "Nenúfar grande", price: 5, level: 1, thumb: "/assets/scenery/thumbs/pad-esq.png" },
  { id: "arvore", src: "/assets/scenery/maple.webp", x: 2.07, y: -7.5, w: 61.53, flat: 1.025, wmax: 1181, z: 3.1, wind: true, origin: "40% 95%", label: "Árvore de outono", price: 10, level: 2, thumb: "/assets/scenery/thumbs/arvore.png" },
  { id: "ponte", src: "/assets/scenery/bridge.png", x: 48.19, y: 5.05, w: 54.91, flat: 0.98, wmax: 1054, label: "Ponte vermelha", price: 10, level: 3, thumb: "/assets/scenery/thumbs/ponte.png" },
  { id: "cerca-esq", src: "/assets/scenery/bamboo-fence.png", x: 19.22, y: 8.64, w: 70.75, flat: 0.996, wmax: 1358, z: 3.05, label: "Cerca do canto esquerdo", price: 15, level: 4, thumb: "/assets/scenery/thumbs/cerca-esq.png" },
  { id: "pedras-canto", src: "/assets/scenery/rocks-corner.png", x: 12.4, y: 78.6, w: 37.56, flat: 0.923, wmax: 721, z: 11, label: "Pedras do canto", price: 15, level: 5, thumb: "/assets/scenery/thumbs/pedras-canto.png" },
  { id: "fonte-bambu", src: "/assets/scenery/fountain.png", x: 84.5, y: 21.5, w: 40, wmax: 520, z: 3.15, label: "Fonte de bambu", price: 15, level: 5, thumb: "/assets/scenery/thumbs/fonte-bambu.png" },
  { id: "cerca-dir", src: "/assets/scenery/bamboo-fence-right.png", x: 85.9, y: 21.5, w: 66.78, flat: 1.123, wmax: 1282, z: 3.05, flipX: true, label: "Cerca do canto direito", price: 20, level: 6, thumb: "/assets/scenery/thumbs/cerca-dir.png" },
  { id: "tablado", src: "/assets/scenery/dock.png", x: 96.88, y: 32.48, w: 52.56, flat: 0.997, wmax: 1009, label: "Tablado de madeira", price: 25, level: 7, thumb: "/assets/scenery/thumbs/tablado.png" },
  { id: "bacia", src: "/assets/scenery/basin.png", x: 86.1, y: 85.6, w: 55.74, flat: 0.998, wmax: 1070, z: 11, label: "Bacia de pedra", price: 30, level: 7, thumb: "/assets/scenery/thumbs/bacia.png" },
];

export const SCENERY_BY_ID = Object.fromEntries(SCENERY.map((item) => [item.id, item])) as Record<string, SceneryItem>;

// ===================== níveis e recompensas =====================
// fish: espécies liberadas na loja de peixes (a do nível 7 fecha a coleção);
// rations: baldes de ração comum (porções); premium: potes de ração especial.
export type LevelReward =
  | { kind: "fish"; variants: number[] }
  | { kind: "rations"; buckets: number }
  | { kind: "premium"; pots: number };

export type SceneryLevel = { level: number; reward: LevelReward };

export const SCENERY_LEVELS: readonly SceneryLevel[] = [
  { level: 1, reward: { kind: "fish", variants: [1] } },
  { level: 2, reward: { kind: "fish", variants: [2] } },
  { level: 3, reward: { kind: "rations", buckets: 1 } },
  { level: 4, reward: { kind: "rations", buckets: 2 } },
  { level: 5, reward: { kind: "fish", variants: [3] } },
  { level: 6, reward: { kind: "premium", pots: 1 } },
  { level: 7, reward: { kind: "fish", variants: [4] } },
] as const;

export const LEVEL_NUMBERS = SCENERY_LEVELS.map(({ level }) => level);
export const MAX_LEVEL = LEVEL_NUMBERS[LEVEL_NUMBERS.length - 1] ?? 1;

export const rewardForLevel = (level: number): LevelReward | undefined =>
  SCENERY_LEVELS.find((entry) => entry.level === level)?.reward;

export const piecesOfLevel = (level: number): SceneryItem[] =>
  SCENERY.filter((item) => item.level === level);

export const levelProgress = (level: number, bought: string[]): { current: number; total: number } => {
  const pieces = piecesOfLevel(level);
  return { current: pieces.filter((item) => bought.includes(item.id)).length, total: pieces.length };
};

// Nível completo = todas as peças do nível posicionadas no lago.
export const completedLevels = (bought: string[]): number[] =>
  LEVEL_NUMBERS.filter((level) => {
    const { current, total } = levelProgress(level, bought);
    return current === total;
  });

// Próxima peça da sequência: a primeira que ainda não está no lago. A loja
// tranca sempre a seguinte, mesmo entre peças do mesmo nível.
export const nextScenery = (bought: string[]): SceneryItem | undefined =>
  SCENERY.find((item) => !bought.includes(item.id));

// ===================== plataforma (banco + menino) =====================
// Responsive spec ported from the previous CSS: first matching row wins.
export type PlatformSpec = { maxW: number; topPct: number; vw: number; max: number };
export const PLATFORM_LAYOUT: PlatformSpec[] = [
  { maxW: 520, topPct: 43, vw: 0.56, max: Number.POSITIVE_INFINITY },
  { maxW: 820, topPct: 44, vw: 0.48, max: 330 },
  { maxW: Number.POSITIVE_INFINITY, topPct: 53.98, vw: 0.2453, max: 471 },
];
export const PLATFORM_X_PCT = 50.03;

// Boy pose boxes, in percent of the platform box (ported from CSS).
export const BOY_LAYOUT = {
  frame: { leftPct: 16, topPct: -13, sizePct: 68 },
  sit: { leftPct: 0, topPct: 0, sizePct: 100 },
  throwLeft: { leftPct: -6.7, topPct: 15.5, sizePct: 88 },
  throwRight: { leftPct: 18.7, topPct: 15.5, sizePct: 88 },
};
