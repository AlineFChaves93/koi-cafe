// Regression guard: the pond has no fish-count cap. Purchases must always
// spawn, and every owned fish must survive the save → read → spawnSchool
// round-trip regardless of how large the school gets.
import { describe, expect, it } from "vitest";
import { gameBus } from "@/game/events";
import { GameState } from "@/game/state/GameState";
import { registerActions } from "@/game/systems/actions";
import { createWorld, spawnSchool } from "@/game/systems/fishSim";
import { readSave, writeSave, type SaveData, type Storage } from "@/game/systems/save";

const setup = () => {
  const world = createWorld(false);
  world.w = 1000;
  world.h = 800;
  const state = new GameState();
  const dispose = registerActions({ world, state, schedule: () => {} });
  return { world, state, dispose };
};

class MapStorage implements Storage {
  map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

const saveWithFishes = (fishes: SaveData["fishes"]): SaveData => ({
  version: 5,
  date: "2026-08-31",
  player: {
    starterKitVersion: 8,
    coins: 100, xp: 0, streak: 1,
    rewardClaimed: false, totalFed: 0, totalSold: 0,
    missionFed: 0, missionClaimed: false,
    premium: 0, remedios: 0,
    collection: [], fishUnlocked: [0], levelRewards: [],
    playerName: "", leaderboardId: "",
    leaderboardSoldByVariant: [0, 0, 0, 0, 0, 0],
    leaderboardDailyRewards: 0, leaderboardMissionRewards: 0,
    leaderboardDriftCoins: 0,
    som: true, idioma: "pt",
    food: 10,
  },
  fishes,
  scenery: [],
});

describe("no pond fish limit", () => {
  it("spawns every purchased fish — the school grows past any cap", () => {
    const { world, state, dispose } = setup();
    state.patch({ coins: 500 });

    for (let i = 0; i < 12; i += 1) gameBus.commands.emit("buy-fish", { variant: 0 });

    expect(world.fishes.length).toBe(12);
    expect(state.getSnapshot().coins).toBe(500 - 12 * 2);
    dispose();
  });

  it("restores the whole school through save → read → spawnSchool", () => {
    const storage = new MapStorage();
    writeSave(storage, saveWithFishes(
      Array.from({ length: 12 }, () => ({ variant: 0, progress: 0, sick: false })),
    ));

    const loaded = readSave(storage);
    expect(loaded.fishes.length).toBe(12);

    const world = createWorld(false);
    world.w = 1000;
    world.h = 800;
    spawnSchool(world, loaded.fishes);
    expect(world.fishes.length).toBe(12);
  });
});
