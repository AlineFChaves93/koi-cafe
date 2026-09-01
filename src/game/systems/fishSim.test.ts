import { describe, expect, it } from "vitest";
import { createWorld, makeFish, spawnSchool, stepFishSim } from "@/game/systems/fishSim";
import type { WorldPellet } from "@/game/types";

function seededWorld() {
  const world = createWorld(false);
  world.w = 1000;
  world.h = 800;
  world.u = Math.min(1000, 800) / 900;
  world.platform = { x: 500, y: 400, r: 100 };
  spawnSchool(world);
  return world;
}

const pelletAt = (throwId: number, x: number, y: number): WorldPellet => ({
  x, y, born: 0, food: 1, eaters: 0, wobble: 0, throwId, feed: "comum",
});

describe("fish simulation", () => {
  it("makes the smallest base fish 50% larger", () => {
    const world = seededWorld();
    world.fishes = [];
    const fish = makeFish(world);
    expect(fish.scale).toBeCloseTo(0.55 * 1.5);
  });

  it("a fresh pond starts the first play with only 3 baby fish", () => {
    const world = seededWorld();
    world.fishes = [];
    spawnSchool(world);
    expect(world.fishes).toHaveLength(3);
    for (const fish of world.fishes) {
      expect(fish.progress).toBe(0);
      expect(fish.variant).toBe(0);
      expect(Math.hypot(fish.x - world.platform.x, fish.y - world.platform.y)).toBeGreaterThan(world.platform.r);
    }
  });

  it("restores exactly the saved fishes when a save exists", () => {
    const world = seededWorld();
    world.fishes = [];
    spawnSchool(world, [
      { variant: 0, progress: 3, sick: false },
      { variant: 2, progress: 8, sick: true },
    ]);
    expect(world.fishes).toHaveLength(2);
    expect(world.fishes[1].progress).toBe(8);
    expect(world.fishes[1].sick).toBe(true);
  });

  it("a fish eats a pellet in reach and grows", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    world.throws.set(1, { feed: "comum", targetFid: fish.fid });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBeGreaterThan(0);
    expect(world.pellets.size).toBe(0);
    expect(world.events.some((e) => e.type === "pellets:finished")).toBe(true);
    expect(world.events.some((e) => e.type === "fishes:changed")).toBe(true);
    stepFishSim(world, 0.016, 16);
    expect(fish.anim).toBe("eat");
    stepFishSim(world, 1, 1016);
    expect(fish.anim).not.toBe("eat");
  });

  it("does not seek food from across the pond", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    world.pellets.set(1, pelletAt(1, fish.x + Math.min(world.w, world.h) * 0.3, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.state).toBe("wander");
  });

  it("bobs when aimed food is held just overhead", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    world.aiming = true;
    world.aim = { x: fish.x + fish.len * 1.8, y: fish.y };
    stepFishSim(world, 0.016, 0);
    expect(fish.state).toBe("curious");
    expect(fish.anim).toBe("bob");
  });

  it("follows aimed food beyond the pellet detection radius", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    const initialHeading = fish.heading;
    world.aiming = true;
    world.aim = { x: fish.x, y: fish.y + Math.min(world.w, world.h) * 0.4 };
    stepFishSim(world, 0.05, 0);
    expect(fish.state).toBe("curious");
    expect(fish.heading).not.toBe(initialHeading);
  });

  it("a bite stolen from a school throw is worth 10/14", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    world.throws.set(1, { feed: "comum", targetFid: null });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBeCloseTo(10 / 14, 5);
  });

  it("a sick fish does not grow from eating", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    fish.sick = true;
    world.throws.set(1, { feed: "premium", targetFid: fish.fid });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBe(0);
    expect(world.pellets.size).toBe(0);
  });

  it("caps growth at GRANDE and reports the stage change", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    fish.progress = 7.9;
    world.throws.set(1, { feed: "comum", targetFid: fish.fid });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBe(8);
    const grew = world.events.find((e) => e.type === "fish:grew");
    expect(grew && grew.type === "fish:grew" && grew.stage).toBe(2);
    expect(world.events.some((e) => e.type === "collection:unlocked")).toBe(true);
  });

  it("one especial (premium) throw takes a baby fish straight to MÉDIO", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    world.throws.set(1, { feed: "premium", targetFid: fish.fid });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBe(3);
    const grew = world.events.find((e) => e.type === "fish:grew");
    expect(grew && grew.type === "fish:grew" && grew.stage).toBe(1);
  });

  it("overlapping fish are pushed apart by the collision pass", () => {
    const world = seededWorld();
    const a = world.fishes[0];
    const b = world.fishes[1];
    a.x = b.x = 260;
    a.y = b.y = 260;
    a.heading = b.heading = 0; // mesma direção: cápsulas totalmente sobrepostas
    stepFishSim(world, 0.016, 0);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1);
  });
});
