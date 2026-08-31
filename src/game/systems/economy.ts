// Pure progression/economy rules — no engine, no DOM, fully unit-testable.
import { PREMIUM_VALUE, SCHOOL_FACTOR, STAGE_ADULTO, STAGE_MEDIO } from "../data/economy";
import { VARIANT_NAMES } from "../data/variants";
import type { FeedKind } from "../types";

export const stageOf = (progress: number): 0 | 1 | 2 =>
  progress >= STAGE_ADULTO ? 2 : progress >= STAGE_MEDIO ? 1 : 0;

// Keep growth noticeable without letting adult fish overwhelm the pond. The
// same factor is used for both canvas axes, so fish always grow uniformly.
export const sizeFactor = (progress: number) => 0.78 + 0.27 * Math.min(1, progress / STAGE_ADULTO);

export const fishName = (variant: number, fid: number) => `${VARIANT_NAMES[variant]} #${fid}`;

// progresso legível: inteiro quando fecha, uma casa decimal quando a ração
// premium (1.5) ou o cardume (0.7) deixam o número quebrado
export const progText = (progress: number) =>
  Number.isInteger(progress) ? String(progress) : progress.toFixed(1);

// Growth value of one counted bite: premium is worth 1.5×; a throw aimed at
// another fish (school feeding / stolen bite) is worth 10/14.
export function growthValue(feed: FeedKind, aimedAtMe: boolean): number {
  const base = feed === "premium" ? PREMIUM_VALUE : 1;
  return base * (aimedAtMe ? 1 : SCHOOL_FACTOR);
}
