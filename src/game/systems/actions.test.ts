import { afterEach, describe, expect, it, vi } from "vitest";
import { gameBus } from "@/game/events";
import { DAILY_LIMIT, RATION_BUCKET } from "@/game/data/economy";
import { LEVEL_COMMON_FEED_REWARD, LEVEL_PREMIUM_FEED_REWARD, SCENERY } from "@/game/data/scenery";
import { GameState } from "@/game/state/GameState";
import { registerActions } from "@/game/systems/actions";
import { createWorld, makeFish } from "@/game/systems/fishSim";

const setup = () => {
  const world = createWorld(false);
  world.w = 1000;
  world.h = 800;
  const state = new GameState();
  const dispose = registerActions({ world, state, schedule: () => {} });
  return { world, state, dispose };
};

const buy = (id: string) => gameBus.commands.emit("buy-scenery", { id });

describe("buy store supplies", () => {
  it("charges the requested coin prices and adds each item to stock", () => {
    const { state, dispose } = setup();
    const { food: initialFood, premiumCount: initialPremium } = state.getSnapshot();

    gameBus.commands.emit("buy-remedy");
    expect(state.getSnapshot()).toMatchObject({ coins: 27, remedios: 2 });

    gameBus.commands.emit("buy-common");
    expect(state.getSnapshot()).toMatchObject({ coins: 24, food: initialFood + 1 });

    gameBus.commands.emit("buy-bucket");
    expect(state.getSnapshot()).toMatchObject({ coins: 19, food: initialFood + 1 + RATION_BUCKET });

    gameBus.commands.emit("buy-premium");
    expect(state.getSnapshot()).toMatchObject({ coins: 9, premiumCount: initialPremium + 1 });
    dispose();
  });
});

describe("buy scenery levels", () => {
  afterEach(() => vi.restoreAllMocks());

  it("charges the level price and places the piece in the lake", () => {
    const { state, dispose } = setup();
    buy("samambaia-a");
    expect(state.getSnapshot().coins).toBe(25); // 30 iniciais − ◎5 do nível 1
    expect(state.getSnapshot().bought).toEqual(["samambaia-a"]);
    dispose();
  });

  it("refuses a piece that is not the next in the sequence", () => {
    const { state, dispose } = setup();
    buy("pad-esq"); // segunda peça do nível 1: exige a primeira posicionada
    expect(state.getSnapshot().bought).toEqual([]);
    expect(state.getSnapshot().coins).toBe(30);
    dispose();
  });

  it("completing level 1 liberates the next mystery species", () => {
    const { state, dispose } = setup();
    buy("samambaia-a");
    buy("pad-esq");
    expect(state.getSnapshot().levelRewards).toEqual([1]);
    dispose();
  });

  it("refuses the mystery fry while the required level is still incomplete", () => {
    const { world, state, dispose } = setup();
    state.patch({ coins: 500, bought: ["samambaia-a", "pad-esq", "arvore", "ponte", "cerca-esq", "pedras-canto"] });
    gameBus.commands.emit("buy-fish", { variant: 3 }); // nível 5 com 1/2 peças

    expect(state.getSnapshot().fishUnlocked).toEqual([0]);
    expect(world.fishes.filter((f) => f.variant === 3)).toEqual([]);
    expect(state.getSnapshot().coins).toBe(500);
    dispose();
  });

  it("sells the mystery fry the moment the required level completes", () => {
    const { world, state, dispose } = setup();
    state.patch({
      coins: 500,
      bought: ["samambaia-a", "pad-esq", "arvore", "ponte", "cerca-esq", "pedras-canto", "fonte-bambu"],
      levelRewards: [1, 2, 3, 4, 5],
    });
    gameBus.commands.emit("buy-fish", { variant: 3 }); // nível 5 completo: 2/2 peças

    expect(state.getSnapshot().fishUnlocked).toContain(3);
    expect(world.fishes.some((f) => f.variant === 3)).toBe(true);
    expect(state.getSnapshot().coins).toBe(500 - 22); // buyPrice da oferta
    dispose();
  });

  it("refuses the Tancho until the player raised 4 species to adult", () => {
    const { world, state, dispose } = setup();
    state.patch({ coins: 500, collection: [0, 1, 2] });
    gameBus.commands.emit("buy-fish", { variant: 5 }); // coleção 3/4

    expect(state.getSnapshot().fishUnlocked).toEqual([0]);
    expect(world.fishes.filter((f) => f.variant === 5)).toEqual([]);
    expect(state.getSnapshot().coins).toBe(500);
    dispose();
  });

  it("sells the Tancho once 4 species reached the collection", () => {
    const { world, state, dispose } = setup();
    state.patch({ coins: 500, collection: [0, 1, 2, 4] });
    gameBus.commands.emit("buy-fish", { variant: 5 });

    expect(state.getSnapshot().fishUnlocked).toContain(5);
    expect(world.fishes.some((f) => f.variant === 5)).toBe(true);
    expect(state.getSnapshot().coins).toBe(500 - 34); // buyPrice da oferta
    dispose();
  });

  it("grants 15 common and three premium feed on every completed level", () => {
    const { state, dispose } = setup();
    const ids = SCENERY.map((item) => item.id);
    // tudo até a ponte (nível 3) posicionado; falta o nível 4
    const untilLevel3 = ids.slice(0, 4);
    state.patch({ bought: ids.slice(0, 3), levelRewards: [1, 2], coins: 500, food: 0, premiumCount: 0 });
    buy(untilLevel3[3]);
    expect(state.getSnapshot()).toMatchObject({
      food: LEVEL_COMMON_FEED_REWARD,
      premiumCount: LEVEL_PREMIUM_FEED_REWARD,
    });
    expect(state.getSnapshot().levelRewards).toEqual([1, 2, 3]);

    buy(ids[4]);
    expect(state.getSnapshot()).toMatchObject({
      food: LEVEL_COMMON_FEED_REWARD * 2,
      premiumCount: LEVEL_PREMIUM_FEED_REWARD * 2,
    });
    expect(state.getSnapshot().levelRewards).toEqual([1, 2, 3, 4]);

    state.patch({ bought: ids.slice(0, 7), levelRewards: [1, 2, 3, 4, 5], coins: 500, food: 0, premiumCount: 0 });
    buy(ids[7]);
    expect(state.getSnapshot()).toMatchObject({
      food: LEVEL_COMMON_FEED_REWARD,
      premiumCount: LEVEL_PREMIUM_FEED_REWARD,
    });
    expect(state.getSnapshot().levelRewards).toEqual([1, 2, 3, 4, 5, 6]);
    dispose();
  });
});

describe("medicate with the stocked mamadeira", () => {
  afterEach(() => vi.restoreAllMocks());

  it("cures the fish, consumes stock and emits fish:cured", () => {
    const { world, state, dispose } = setup();
    const fish = makeFish(world, { variant: 0, sick: true });
    world.fishes.push(fish);
    state.patch({ remedios: 1 });
    const cured: number[] = [];
    const off = gameBus.events.on("fish:cured", ({ fid }) => cured.push(fid));

    gameBus.commands.emit("medicate-fish", { fid: fish.fid });

    expect(fish.sick).toBe(false);
    expect(state.getSnapshot().remedios).toBe(0);
    expect(cured).toEqual([fish.fid]);
    off();
    dispose();
  });
});

describe("aim commands", () => {
  it("copies the held-food cursor position into the fish simulation", () => {
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    const dispose = registerActions({ world, state: new GameState(), schedule: () => {} });

    gameBus.commands.emit("aim:start");
    gameBus.commands.emit("aim:move", { x: 35, y: 60 });

    expect(world.aiming).toBe(true);
    expect(world.aim).toEqual({ x: 350, y: 480 });
    dispose();
  });

  it("premium casts even when the comum bucket is empty", () => {
    const { world, state, dispose } = setup();
    state.patch({ food: 0, premiumCount: 1, feedSel: "premium" });

    gameBus.commands.emit("aim:start");
    expect(world.aiming).toBe(true);
    gameBus.commands.emit("aim:end", { x: 50, y: 50 });

    expect(world.aiming).toBe(false);
    expect(state.getSnapshot().premiumCount).toBe(0);
    expect(world.pellets.size).toBeGreaterThan(0);
    dispose();
  });

  it("renews the free daily bucket when comum rations run out (no paywall)", () => {
    const { world, state, dispose } = setup();
    state.patch({ food: 0, feedSel: "comum" });

    gameBus.commands.emit("aim:start");
    expect(world.aiming).toBe(true);
    expect(state.getSnapshot().food).toBe(DAILY_LIMIT);

    gameBus.commands.emit("aim:end", { x: 50, y: 50 });
    expect(state.getSnapshot().food).toBe(DAILY_LIMIT - 1);
    expect(world.pellets.size).toBeGreaterThan(0);
    dispose();
  });

  it("selection falls back to comum when premium runs out", () => {
    const { world, state, dispose } = setup();
    state.patch({ food: 2, premiumCount: 1, feedSel: "premium" });

    gameBus.commands.emit("aim:start");
    gameBus.commands.emit("aim:end", { x: 50, y: 50 });

    expect(state.getSnapshot().premiumCount).toBe(0);
    expect(state.getSnapshot().feedSel).toBe("comum");
    // o botão central segue útil: a próxima mira já é de ração comum
    gameBus.commands.emit("aim:start");
    expect(world.aiming).toBe(true);
    dispose();
  });

  it("aiming with an exhausted premium selection falls back and feeds comum", () => {
    const { world, state, dispose } = setup();
    state.patch({ food: 1, premiumCount: 0, feedSel: "premium" });

    gameBus.commands.emit("aim:start");
    expect(world.aiming).toBe(true);
    expect(state.getSnapshot().feedSel).toBe("comum");
    gameBus.commands.emit("aim:end", { x: 50, y: 50 });

    expect(state.getSnapshot().food).toBe(0);
    expect(world.pellets.size).toBeGreaterThan(0);
    dispose();
  });

  it("using the last stocked mamadeira returns the console to comum", () => {
    const { world, state, dispose } = setup();
    const fish = makeFish(world, { variant: 0, sick: true });
    world.fishes.push(fish);
    state.patch({ remedios: 1, feedSel: "remedio" });

    gameBus.commands.emit("medicate-fish", { fid: fish.fid });

    expect(fish.sick).toBe(false);
    expect(state.getSnapshot().feedSel).toBe("comum");
    dispose();
  });
});

describe("feeding sickness", () => {
  afterEach(() => vi.restoreAllMocks());

  const throwOnce = (state: GameState, feed: "comum" | "premium") => {
    if (feed === "premium") state.patch({ premiumCount: state.getSnapshot().premiumCount + 1 });
    state.patch({ feedSel: feed });
    gameBus.commands.emit("aim:start");
    gameBus.commands.emit("aim:end", { x: 50, y: 50 });
  };

  it("the 4th comum throw makes a healthy fish sick", () => {
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    const state = new GameState();
    state.patch({ food: 4 });
    const dispose = registerActions({ world, state, schedule: () => {} });
    world.fishes.push(makeFish(world, { variant: 0 }));

    for (let throwIndex = 1; throwIndex <= 3; throwIndex += 1) {
      throwOnce(state, "comum");
      expect(world.fishes[0].sick).toBe(false);
    }
    throwOnce(state, "comum");
    expect(world.fishes[0].sick).toBe(true);
    dispose();
  });

  it("premium food never makes fish sick and does not count on the sickness cycle", () => {
    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    const state = new GameState();
    state.patch({ food: 4 });
    const dispose = registerActions({ world, state, schedule: () => {} });
    world.fishes.push(makeFish(world, { variant: 0 }));

    // três arremessos comuns + um especial: o ciclo de 4 não deve avançar
    for (let throwIndex = 0; throwIndex < 3; throwIndex += 1) throwOnce(state, "comum");
    throwOnce(state, "premium");
    expect(world.fishes[0].sick).toBe(false);
    expect(world.comumThrows).toBe(3);

    throwOnce(state, "comum");
    expect(world.fishes[0].sick).toBe(true);
    dispose();
  });
});
