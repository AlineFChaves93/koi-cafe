// ===================== loja do lago (partes separadas) =====================
// as peças do cenário são compradas com moedas e liberadas conforme o jogador
// coleciona espécies de peixe (variantes que já chegaram a ADULTO). Depois de
// comprida, cada peça ocupa sua posição fixa no lago (leiaute da montagem).
//
// Positions are viewport percentages (x/y relative to canvas center, w relative
// to canvas width) exactly as the previous CSS layout expressed them.
export type SceneryItem = {
  id: string; src: string; x: number; y: number; w: number;
  flat?: number; rot?: number; floaty?: boolean; wmax?: number; z?: number;
  label: string; price: number; req: number; thumb: string;
  sway?: boolean; origin?: string; fx?: "stream" | "pipe"; dur?: number; hide?: boolean; bundle?: string; wind?: boolean;
};

export const SCENERY: SceneryItem[] = [
  { id: "cerca-dir", src: "/assets/scenery/bamboo-fence-right.png", x: 111, y: 21.9, w: 66.78, rot: 171, flat: 1.123, wmax: 1282, label: "Cerca do canto direito", price: 30, req: 3, thumb: "/assets/scenery/thumbs/cerca-dir.png" },
  { id: "cerca-esq", src: "/assets/scenery/bamboo-fence.png", x: 19.22, y: 8.64, w: 70.75, flat: 0.996, wmax: 1358, label: "Cerca do canto esquerdo", price: 30, req: 2, thumb: "/assets/scenery/thumbs/cerca-esq.png" },
  { id: "ponte", src: "/assets/scenery/bridge.png", x: 48.19, y: 5.05, w: 54.91, flat: 0.98, wmax: 1054, label: "Ponte vermelha", price: 60, req: 6, thumb: "/assets/scenery/thumbs/ponte.png" },
  { id: "arvore", src: "/assets/scenery/maple.webp", x: 2.07, y: -7.5, w: 61.53, flat: 1.025, wmax: 1181, wind: true, origin: "40% 95%", label: "Árvore de outono", price: 50, req: 4, thumb: "/assets/scenery/thumbs/arvore.png" },
  { id: "tablado", src: "/assets/scenery/dock.png", x: 96.88, y: 32.48, w: 52.56, flat: 0.997, wmax: 1009, label: "Tablado de madeira", price: 40, req: 3, thumb: "/assets/scenery/thumbs/tablado.png" },
  { id: "fonte-bambu", src: "/assets/scenery/waterfall.png", x: 80.79, y: 17.42, w: 64.71, wmax: 1242, fx: "stream", label: "Fonte de bambu", price: 80, req: 5, thumb: "/assets/scenery/thumbs/fonte-bambu.png" },
  { id: "samambaia-a", src: "/assets/scenery/fern.png", x: 13.5, y: 50, w: 24, wmax: 460, z: 4, label: "Samambaia alta", price: 15, req: 0, thumb: "/assets/scenery/thumbs/samambaia-a.png" },
  { id: "samambaia-b", src: "/assets/scenery/fern.png", x: 1.38, y: 56.79, w: 14.78, rot: -35.6, wmax: 284, label: "Samambaia baixa", price: 15, req: 0, thumb: "/assets/scenery/thumbs/samambaia-b.png" },
  { id: "pad-esq", src: "/assets/scenery/lilypad.png", x: 20.53, y: 36.48, w: 47.87, rot: 1.79, flat: 1.17, floaty: true, dur: 26, wmax: 919, label: "Nenúfar grande", price: 20, req: 1, thumb: "/assets/scenery/thumbs/pad-esq.png" },
  { id: "pedras-canto", src: "/assets/scenery/rocks-corner.png", x: 12.4, y: 78.6, w: 37.56, flat: 0.923, wmax: 721, z: 11, label: "Pedras do canto", price: 35, req: 2, thumb: "/assets/scenery/thumbs/pedras-canto.png" },
  { id: "bacia", src: "/assets/scenery/basin.png", x: 86.1, y: 85.6, w: 55.74, flat: 0.998, wmax: 1070, z: 11, fx: "pipe", label: "Bacia de pedra", price: 45, req: 4, thumb: "/assets/scenery/thumbs/bacia.png" },
  { id: "pad-dir", src: "/assets/scenery/lilypad.png", x: 64.07, y: 90.55, w: 7.64, rot: -174.41, flat: 0.775, floaty: true, dur: 34, wmax: 147, label: "Nenúfar pequeno", price: 10, req: 1, thumb: "/assets/scenery/thumbs/pad-dir.png" },
  { id: "lampada-parede", src: "/assets/scenery/lamp-wall.png", x: 2.94, y: -0.88, w: 57.1, flat: 0.677, wmax: 1096, label: "Lâmpada de parede", price: 20, req: 1, thumb: "/assets/scenery/thumbs/lampada-parede.png" },
  { id: "lanterna", src: "/assets/scenery/lantern-red.png", x: 7.91, y: -2.97, w: 39.37, flat: 0.762, wmax: 756, label: "Lanterna de papel", price: 25, req: 1, thumb: "/assets/scenery/thumbs/lanterna.png", sway: true, origin: "50.67% 45.17%" },
];

export const SCENERY_BY_ID = Object.fromEntries(SCENERY.map((item) => [item.id, item])) as Record<string, SceneryItem>;

// poça da bacia: os dois quadros com água acumulada ficam SEMPRE visíveis
// (ondulando devagar); o jato do cano cicla nos quadros de despejo
export const BASIN_POOL_FRAMES = ["09", "10"];
export const BASIN_POUR_FRAMES = ["01", "02", "04", "05", "06"];

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
