// Feeding geometry: where a throw lands, which fish it targets and how the
// pellet cloud scatters. Pure helpers used by the command handlers.
import { PELLETS_PER_THROW, PELLET_FOOD, THROWS_PER_SICKNESS } from "../data/economy";
import type { Fish, SimWorld, WorldPellet } from "../types";
import { TAU } from "../types";

// keep the landing point in open water (never on top of the platform)
export function clampToWater(world: SimWorld, px: number, py: number): { x: number; y: number } {
  const w = world;
  const dx = px - w.platform.x, dy = py - w.platform.y;
  const d = Math.hypot(dx, dy) || 1;
  const minD = w.platform.r * 1.1 + 8;
  if (d < minD) { px = w.platform.x + (dx / d) * minD; py = w.platform.y + (dy / d) * minD; }
  return {
    x: Math.max(w.w * 0.05, Math.min(w.w * 0.95, px)),
    y: Math.max(w.h * 0.1, Math.min(w.h * 0.94, py)),
  };
}

// mira direcionada: the fish closest to the landing point gets the food
export function findFishNear(world: SimWorld, x: number, y: number, capFactor: number): Fish | null {
  const capR = Math.min(world.w, world.h) * capFactor;
  let best: Fish | null = null; let bd = capR;
  for (const f of world.fishes) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

// One throw = a handful that bursts into individual pellets scattered at
// random across a cloud around the landing point. Ração direcionada cai bem
// fechada em volta do peixe; no cardume, espalha pela água.
export function scatterPellets(world: SimWorld, spot: { x: number; y: number }, feed: WorldPellet["feed"], throwId: number): number[] {
  const w = world;
  const ids: number[] = [];
  const aimed = w.throws.get(throwId)?.targetFid != null;
  const spread = Math.min(w.w, w.h) * (aimed ? 0.038 : 0.085);
  const count = PELLETS_PER_THROW[feed];
  for (let k = 0; k < count; k++) {
    const id = w.nextId++;
    const ang = Math.random() * TAU;
    const dist = k === 0 ? 0 : spread * Math.sqrt(Math.random());
    let px = { x: spot.x + Math.cos(ang) * dist, y: spot.y + Math.sin(ang) * dist };
    const dx = px.x - w.platform.x, dy = px.y - w.platform.y;
    const d = Math.hypot(dx, dy) || 1;
    const minD = w.platform.r * 1.1 + 14;
    if (d < minD) {
      const ringAng = Math.atan2(dy, dx) + (k - (count - 1) / 2) * 0.18;
      px = { x: w.platform.x + Math.cos(ringAng) * minD, y: w.platform.y + Math.sin(ringAng) * minD };
    }
    px = {
      x: Math.max(w.w * 0.05, Math.min(w.w * 0.95, px.x)),
      y: Math.max(w.h * 0.1, Math.min(w.h * 0.94, px.y)),
    };
    w.pellets.set(id, { x: px.x, y: px.y, born: performance.now(), food: PELLET_FOOD, eaters: 0, wobble: Math.random() * TAU, throwId, feed });
    ids.push(id);
  }
  return ids;
}

// A cada 4 arremessos de ração comum um peixe adoece — independentemente de
// estar baby, médio ou grande. O sorteio só escolhe a vítima entre os saudáveis.
export function sicknessVictim(world: SimWorld, random: () => number = Math.random): Fish | null {
  if (world.comumThrows === 0 || world.comumThrows % THROWS_PER_SICKNESS !== 0) return null;
  const healthy = world.fishes.filter((f) => !f.sick);
  if (!healthy.length) return null;
  return healthy[Math.floor(random() * healthy.length)];
}
