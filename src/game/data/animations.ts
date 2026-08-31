import type { AnimName } from "../types";

// Normalized koi atlases use a fixed 12 × 6 grid; short rows leave the
// trailing cells blank. Row order: swim, fast, idle, turn, bob, eat.
export const ATLAS_COLUMNS = 12;
export const ATLAS_ROWS = 6;

export type AnimMeta = { row: number; frames: number; fps: number; loop: boolean };

// Default frame counts per row (matches the platinum/tancho atlases).
export const ANIMS: Record<Exclude<AnimName, "turnL">, AnimMeta> = {
  swim: { row: 0, frames: 8, fps: 10, loop: true },
  fast: { row: 1, frames: 6, fps: 12, loop: true },
  idle: { row: 2, frames: 12, fps: 6, loop: true },
  turnR: { row: 3, frames: 12, fps: 10, loop: false },
  bob: { row: 4, frames: 12, fps: 10, loop: true },
  eat: { row: 5, frames: 12, fps: 12, loop: true },
};

// Atlases whose source sheets had fewer sprites per row; playing the default
// count would flash a blank cell at the end of the row.
const SHORT_ROWS: Record<string, Partial<Record<"swim" | "fast", number>>> = {
  kohaku: { swim: 7, fast: 5 },
  sanke: { swim: 8, fast: 5 },
};

export function animsForVariant(variantKey: string): Record<AnimName, AnimMeta> {
  const short = SHORT_ROWS[variantKey] ?? {};
  const base = { ...ANIMS } as Record<AnimName, AnimMeta>;
  if (short.swim) base.swim = { ...base.swim, frames: short.swim };
  if (short.fast) base.fast = { ...base.fast, frames: short.fast };
  // turnL mirrors the turnR row at render time.
  base.turnL = { ...base.turnR };
  return base;
}
