import { describe, expect, it } from "vitest";
import { PELLETS_PER_THROW, THROWS_PER_SICKNESS } from "../data/economy";
import { createWorld, makeFish } from "./fishSim";
import { scatterPellets, sicknessVictim } from "./feeding";

describe("scatterPellets", () => {
  it("a comum throw scatters 5 pellets and a premium throw 15", () => {
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;

    world.throws.set(1, { feed: "comum", targetFid: null });
    const comum = scatterPellets(world, { x: 500, y: 400 }, "comum", 1);
    expect(PELLETS_PER_THROW.comum).toBe(5);
    expect(comum).toHaveLength(5);
    expect(comum.every((id) => world.pellets.get(id)?.feed === "comum")).toBe(true);

    world.throws.set(2, { feed: "premium", targetFid: null });
    const premium = scatterPellets(world, { x: 500, y: 400 }, "premium", 2);
    expect(PELLETS_PER_THROW.premium).toBe(15);
    expect(premium.every((id) => world.pellets.get(id)?.feed === "premium")).toBe(true);
  });
});

describe("sicknessVictim", () => {
  it("sickens a fish on every 4th comum throw, whatever its stage", () => {
    expect(THROWS_PER_SICKNESS).toBe(4);
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    // cardume misto: baby, médio e grande — todos podem adoecer
    const baby = makeFish(world, { variant: 0, progress: 0 });
    const medio = makeFish(world, { variant: 1, progress: 5 });
    const grande = makeFish(world, { variant: 2, progress: 8 });
    world.fishes.push(baby, medio, grande);

    world.comumThrows = 3;
    expect(sicknessVictim(world, () => 0.99)).toBeNull(); // ainda no 3º arremesso

    world.comumThrows = 4;
    expect(sicknessVictim(world, () => 0.99)).toBe(grande); // 0.99 → 3ª saudável

    grande.sick = true;
    world.comumThrows = 8;
    expect(sicknessVictim(world, () => 0.99)).toBe(medio); // estágio não protege
  });

  it("spares the pond when everyone is already sick", () => {
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    const fish = makeFish(world, { variant: 0, sick: true });
    world.fishes.push(fish);
    world.comumThrows = 4;
    expect(sicknessVictim(world)).toBeNull();
  });
});
