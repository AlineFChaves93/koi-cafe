import { describe, expect, it } from "vitest";
import { createWorld, spawnSchool, stepFishSim } from "@/game/systems/fishSim";
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
  it("spawns the school around the platform", () => {
    const world = seededWorld();
    expect(world.fishes.length).toBeGreaterThanOrEqual(12);
    for (const fish of world.fishes) {
      expect(Math.hypot(fish.x - world.platform.x, fish.y - world.platform.y)).toBeGreaterThan(world.platform.r);
    }
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

  it("caps growth at ADULTO and reports the stage change", () => {
    const world = seededWorld();
    const fish = world.fishes[0];
    fish.progress = 9.9;
    world.throws.set(1, { feed: "comum", targetFid: fish.fid });
    world.pellets.set(1, pelletAt(1, fish.x + fish.len * 0.2, fish.y));
    stepFishSim(world, 0.016, 0);
    expect(fish.progress).toBe(10);
    const grew = world.events.find((e) => e.type === "fish:grew");
    expect(grew && grew.type === "fish:grew" && grew.stage).toBe(2);
    expect(world.events.some((e) => e.type === "collection:unlocked")).toBe(true);
  });

  it("overlapping fish are pushed apart by the collision pass", () => {
    const world = seededWorld();
    const a = world.fishes[0];
    const b = world.fishes[1];
    a.x = b.x = 260;
    a.y = b.y = 260;
    stepFishSim(world, 0.016, 0);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1);
  });
});
