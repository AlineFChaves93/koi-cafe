// Pure progression/economy rules — no engine, no DOM, fully unit-testable.
import {
  BASIC_FISH_LATE_PRICE, MEDICINE_PRICE,
  PREMIUM_VALUE, SCHOOL_FACTOR, STAGE_ADULTO, STAGE_MEDIO,
} from "../data/economy";
import { LEVEL_NUMBERS, nextScenery } from "../data/scenery";
import type { FishOffer } from "../data/fishShop";
import { VARIANT_NAMES } from "../data/variants";
import type { FeedKind } from "../types";

export const stageOf = (progress: number): 0 | 1 | 2 =>
  progress >= STAGE_ADULTO ? 2 : progress >= STAGE_MEDIO ? 1 : 0;

// Baby fish start at 0.78 × 1.5 = 1.17 and adults end at 1.05 × 2 = 2.10.
// The same factor is used for both canvas axes, so fish always grow uniformly.
export const sizeFactor = (progress: number) => 1.17 + 0.93 * Math.min(1, progress / STAGE_ADULTO);

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

// ===================== preços por progresso =====================
// O baby fish básico começa barato; a mamadeira mantém o preço fixo da loja.
export const EARLY_GAME_LEVEL = 3;

// nível atual do lago = nível da próxima peça da sequência (7 quando completo)
export const sceneryLevelOf = (bought: string[]): number =>
  nextScenery(bought)?.level ?? LEVEL_NUMBERS[LEVEL_NUMBERS.length - 1];

export const isEarlyGame = (bought: string[]): boolean =>
  sceneryLevelOf(bought) < EARLY_GAME_LEVEL;

export function medPriceFor(bought: string[]): number {
  void bought;
  return MEDICINE_PRICE;
}

export const fishPriceFor = (offer: FishOffer, bought: string[]): number =>
  offer.variant === 0 && !isEarlyGame(bought) ? BASIC_FISH_LATE_PRICE : offer.buyPrice;
