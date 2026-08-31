// Shared game types. The simulation layer (systems/, state/, data/) operates
// exclusively on these plain structures — no engine types leak in here.

export type FeedKind = "comum" | "premium";
export type FishState = "wander" | "curious" | "seek";
export type AnimName = "swim" | "fast" | "idle" | "eat" | "bob" | "turnR" | "turnL";

export type Fish = {
  fid: number;
  x: number; y: number; heading: number; speed: number;
  len: number; renderLen: number; scale: number; variant: number;
  phase: number; seed: number; wanderT: number;
  state: FishState; targetPellet: number; eatT: number; burst: number;
  anim: AnimName; turnT: number; turning: 0 | 1 | -1;
  baseLen: number; progress: number; sick: boolean; lastThrow: number;
  prevHeading?: number;
  legDir: number; legT: number; legSpeed: number; resting: boolean;
  turnAcc: number; turnSignAcc: number;
};

export type WorldPellet = {
  x: number; y: number; born: number; food: number; eaters: number;
  wobble: number; throwId: number; feed: FeedKind;
};

export type ThrowMeta = { feed: FeedKind; targetFid: number | null };

export type Disc = { x: number; y: number; r: number };

// Events produced inside the simulation tick. PondScene drains this queue
// after each step and translates entries into FX, messages and state updates —
// the tick itself never touches the UI.
export type SimEvent =
  | { type: "fish:grew"; fid: number; variant: number; x: number; y: number; stage: number; progress: number }
  | { type: "collection:unlocked"; variant: number }
  | { type: "pellets:finished"; ids: number[] }
  | { type: "fishes:changed" };

export type SimWorld = {
  w: number; h: number; u: number;
  platform: Disc;
  aiming: boolean;
  aim: { x: number; y: number };
  pellets: Map<number, WorldPellet>;
  throws: Map<number, ThrowMeta>;
  fishes: Fish[];
  nextId: number;
  reduced: boolean;
  events: SimEvent[];
};

// UI mirror of a fish (the fish card only needs these fields).
export type FishView = { fid: number; variant: number; progress: number; sick: boolean };

export const TAU = Math.PI * 2;

export const angleDiff = (a: number, b: number) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
