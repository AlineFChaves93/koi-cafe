import { levelProgress } from "../data/scenery";
import type { PlayerSnapshot } from "../events";

export type FishRequirement =
  | { kind: "pond"; amount: number }
  | { kind: "level"; level: number }
  | { kind: "sold"; amount: number }
  | { kind: "fed"; amount: number }
  | { kind: "collection"; amount: number };

export type FishOffer = {
  variant: number;
  buyPrice: number;
  sellPrice: number;
  requirement?: FishRequirement;
};

// Platina is the reliable economy loop. Four species are mystery discoveries
// tied to the scenery levels: complete the level, buy the hidden fry, then the
// species is revealed and remains available for repeat purchases.
// Nível 7 (tablado + bacia) libera a Kohaku.
// O Tancho é a conquista de colecionador: crie 4 espécies adultas para
// destravá-lo — o último cardume fecha a coleção em 6/6.
// O buyPrice da raça básica vale até o lago atingir o nível 3 (ver fishPriceFor).
export const FISH_OFFERS: readonly FishOffer[] = [
  { variant: 0, buyPrice: 2, sellPrice: 12 },
  { variant: 1, buyPrice: 14, sellPrice: 20, requirement: { kind: "level", level: 1 } },
  { variant: 2, buyPrice: 18, sellPrice: 26, requirement: { kind: "level", level: 2 } },
  { variant: 3, buyPrice: 22, sellPrice: 32, requirement: { kind: "level", level: 5 } },
  { variant: 4, buyPrice: 28, sellPrice: 40, requirement: { kind: "level", level: 7 } },
  { variant: 5, buyPrice: 34, sellPrice: 48, requirement: { kind: "collection", amount: 4 } },
] as const;

export const FISH_OFFER_BY_VARIANT = Object.fromEntries(
  FISH_OFFERS.map((offer) => [offer.variant, offer]),
) as Record<number, FishOffer>;

export function fishRequirementProgress(
  requirement: FishRequirement | undefined,
  state: PlayerSnapshot,
  pondCount: number,
): { current: number; target: number; label: string; met: boolean } {
  if (!requirement) return { current: 1, target: 1, label: "Disponível", met: true };
  const current =
    requirement.kind === "pond" ? pondCount
      : requirement.kind === "level" ? levelProgress(requirement.level, state.bought).current
        : requirement.kind === "sold" ? state.totalSold
          : requirement.kind === "fed" ? state.totalFed
            : state.collection.length;
  const noun =
    requirement.kind === "pond" ? "peixes no lago"
      : requirement.kind === "level" ? `peças no nível ${requirement.level}`
        : requirement.kind === "sold" ? "peixes vendidos"
          : requirement.kind === "fed" ? "arraçoadas"
            : "espécies adultas";
  const target = requirement.kind === "level"
    ? levelProgress(requirement.level, state.bought).total
    : requirement.amount;
  return {
    current,
    target,
    label: `${Math.min(current, target)}/${target} ${noun}`,
    met: current >= target,
  };
}

export const sellPriceFor = (variant: number) =>
  FISH_OFFER_BY_VARIANT[variant]?.sellPrice ?? FISH_OFFERS[0].sellPrice;
