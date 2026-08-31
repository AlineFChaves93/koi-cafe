// Fish simulation: steering/flocking AI, pellet seeking, feeding accounting
// and capsule collision resolution. Ported near-verbatim from the original
// canvas implementation — behavior is meant to be identical.
//
// The tick only mutates the plain SimWorld and pushes SimEvents; the scene
// drains the event queue afterwards (FX, messages, state). No DOM, no React,
// no Phaser — this module is unit-testable headless.
import { ANIMS } from "../data/animations";
import { EAT_RATE, FISH_VIEWPORT_RATIO, STAGE_ADULTO } from "../data/economy";
import { KOI_VARIANTS } from "../data/variants";
import { growthValue, sizeFactor, stageOf } from "./economy";
import type { SavedFish } from "./save";
import { angleDiff, TAU, type Fish, type SimWorld, type WorldPellet } from "../types";

export function createWorld(reduced: boolean): SimWorld {
  return {
    w: 0, h: 0, u: 1,
    platform: { x: 0, y: 0, r: 1 },
    aiming: false,
    aim: { x: 0, y: 0 },
    pellets: new Map(),
    throws: new Map(),
    fishes: [],
    nextId: 0,
    reduced,
    events: [],
  };
}

export const fishLen = (world: SimWorld, scale: number) =>
  Math.min(world.w, world.h) * FISH_VIEWPORT_RATIO * scale;

export function makeFish(world: SimWorld, opts: { variant?: number; progress?: number; sick?: boolean } = {}): Fish {
  const i = world.fishes.length;
  const scale = 0.55 + (i % 5) * 0.075;
  const ang = Math.random() * TAU;
  const rad = world.platform.r * 1.45 + Math.random() * Math.min(world.w, world.h) * 0.1;
  const x = world.platform.x + Math.cos(ang) * rad;
  const y = world.platform.y + Math.sin(ang) * rad;
  const heading = ang + Math.PI / 2 + (Math.random() - 0.5);
  const progress = Math.min(STAGE_ADULTO, opts.progress ?? 0);
  const len = fishLen(world, scale);
  return {
    fid: world.nextId++,
    x, y, heading, speed: 30,
    len: len * sizeFactor(progress), renderLen: len * sizeFactor(progress), scale, baseLen: len,
    progress, sick: opts.sick ?? false, lastThrow: -1,
    variant: opts.variant ?? i % KOI_VARIANTS.length, phase: Math.random() * TAU, seed: Math.random() * 10,
    wanderT: Math.random() * 20, state: "wander", targetPellet: -1, eatT: 0, burst: 0,
    anim: "swim", turnT: 0, turning: 0,
    legDir: heading, legT: 1 + Math.random() * 2, legSpeed: 58 * world.u, resting: false,
    turnAcc: 0, turnSignAcc: 0,
  };
}

export function spawnSchool(world: SimWorld, saved?: SavedFish[]): void {
  const count = Math.min(world.w, world.h) < 520 ? 17 : Math.max(12, saved?.length ?? 12);
  for (let i = 0; i < count; i++) {
    const restored = saved?.[i];
    const fish = makeFish(world, restored ?? {});
    fish.variant = restored?.variant ?? i % KOI_VARIANTS.length;
    const ang = (i / count) * TAU + Math.random() * 0.5;
    const rad = world.platform.r * 1.45 + Math.random() * Math.min(world.w, world.h) * 0.1;
    fish.x = world.platform.x + Math.cos(ang) * rad;
    fish.y = world.platform.y + Math.sin(ang) * rad;
    fish.heading = ang + Math.PI / 2 + (Math.random() - 0.5);
    fish.legDir = fish.heading;
    world.fishes.push(fish);
  }
}

// Reposição após venda: um peixe MINI de espécie aleatória chega ao lago.
export function spawnReplacement(world: SimWorld): Fish {
  const fish = makeFish(world, { variant: Math.floor(Math.random() * KOI_VARIANTS.length), progress: 0, sick: false });
  world.fishes.push(fish);
  return fish;
}

const steer = (f: Fish, desired: number, turnRate: number, dt: number) => {
  const d = angleDiff(desired, f.heading);
  f.heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, d));
};

export function stepFishSim(world: SimWorld, dt: number, nowMs: number): void {
  const now = nowMs;
  const w = world;
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
            const value = growthValue(meta.feed, meta.targetFid === f.fid);
            const prevStage = stageOf(f.progress);
            f.progress = Math.min(STAGE_ADULTO, f.progress + value);
            f.len = f.baseLen * sizeFactor(f.progress);
            const nowStage = stageOf(f.progress);
            if (nowStage > prevStage) {
              w.events.push({ type: "fish:grew", fid: f.fid, variant: f.variant, x: f.x, y: f.y, stage: nowStage, progress: f.progress });
              if (nowStage === 2) w.events.push({ type: "collection:unlocked", variant: f.variant });
            }
            w.events.push({ type: "fishes:changed" });
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
    w.events.push({ type: "pellets:finished", ids: finished });
  }
}
