import { describe, expect, it } from "vitest";
import {
  LEGACY_PLAYER_KEY, LEGACY_SCENERY_KEY, PLAYER_KEY,
  applyDailyCycle, freshSave, readSave, writeSave, type Storage,
} from "@/game/systems/save";
import { dayKey } from "@/game/types";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

describe("save system", () => {
  it("round-trips through storage", () => {
    const storage = new MemoryStorage();
    const save = {
      ...freshSave(),
      player: { ...freshSave().player, coins: 77, xp: 130, premium: 2 },
      fishes: [
        { variant: 0, progress: 3, sick: false },
        { variant: 3, progress: 10, sick: true },
      ],
      scenery: ["ponte", "arvore"],
    };
    writeSave(storage, save);
    const loaded = readSave(storage);
    expect(loaded.player.coins).toBe(77);
    expect(loaded.player.xp).toBe(130);
    expect(loaded.player.premium).toBe(2);
    expect(loaded.fishes).toEqual(save.fishes);
    expect(loaded.scenery).toEqual(["ponte", "arvore"]);
  });

  it("migrates the v3 positional arrays into named fishes", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PLAYER_KEY, JSON.stringify({
      date: dayKey(),
      coins: 55,
      growth: [2, 10, 0.7],
      sick: [0, 1, 0],
      collection: [1, 2],
      premium: 2,
      remedios: 1,
    }));
    storage.setItem(LEGACY_SCENERY_KEY, JSON.stringify(["ponte"]));
    const loaded = readSave(storage);
    expect(loaded.version).toBe(4);
    // v3 implied variant = i % 6 at spawn time
    expect(loaded.fishes).toEqual([
      { variant: 0, progress: 2, sick: false },
      { variant: 1, progress: 10, sick: true },
      { variant: 2, progress: 0.7, sick: false },
    ]);
    expect(loaded.scenery).toEqual(["ponte"]);
    expect(loaded.player.coins).toBe(55);
    expect(loaded.player.collection).toEqual([1, 2]);
  });

  it("starts fresh when storage is empty or corrupt", () => {
    const storage = new MemoryStorage();
    expect(readSave(storage).fishes).toEqual([]);
    storage.setItem(PLAYER_KEY, "{not json");
    expect(readSave(storage).player.coins).toBe(freshSave().player.coins);
  });

  it("advances the streak when the last session was yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const save = { ...freshSave(dayKey(yesterday)), player: { ...freshSave().player, streak: 3, missionFed: 7, missionClaimed: true, rewardClaimed: true } };
    const rolled = applyDailyCycle(save, dayKey());
    expect(rolled.player.streak).toBe(4);
    expect(rolled.player.missionFed).toBe(0);
    expect(rolled.player.missionClaimed).toBe(false);
    expect(rolled.player.rewardClaimed).toBe(false);
  });

  it("resets the streak after a missed day", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const save = { ...freshSave(dayKey(threeDaysAgo)), player: { ...freshSave().player, streak: 9 } };
    expect(applyDailyCycle(save, dayKey()).player.streak).toBe(1);
  });

  it("keeps everything when the save is from today", () => {
    const save = { ...freshSave(), player: { ...freshSave().player, streak: 5, missionFed: 4 } };
    expect(applyDailyCycle(save, dayKey())).toEqual(save);
  });
});
