import { afterEach, describe, expect, it, vi } from "vitest";
import { SCENERY } from "@/game/data/scenery";
import { KOI_VARIANTS } from "@/game/data/variants";
import { GameState } from "@/game/state/GameState";
import { PLAYER_KEY, freshSave, type Storage } from "@/game/systems/save";

class TrackingStorage implements Storage {
  writes = 0;
  private readonly values = new Map<string, string>([
    [PLAYER_KEY, JSON.stringify(freshSave())],
  ]);

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }
}

describe("GameState preview mode", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the complete scene without writing synthetic unlocks to the save", () => {
    vi.useFakeTimers();
    const storage = new TrackingStorage();
    const state = new GameState();

    state.initialize(storage, { fullPreview: true });

    expect(state.getSnapshot().bought).toEqual(SCENERY.map((item) => item.id));
    expect(state.getSnapshot().collection).toEqual(KOI_VARIANTS.map((_, index) => index));

    state.patch({ coins: 999 });
    vi.advanceTimersByTime(1_000);
    state.saveNow();

    expect(storage.writes).toBe(0);
  });
});

describe("GameState initialization", () => {
  afterEach(() => vi.useRealTimers());

  it("notifies subscribers with the loaded save, not the starter defaults", () => {
    vi.useFakeTimers();
    const storage = new TrackingStorage();
    storage.setItem(PLAYER_KEY, JSON.stringify({
      ...freshSave(),
      player: { ...freshSave().player, coins: 500, premium: 7, food: 100 },
      scenery: ["samambaia-a", "pad-esq"],
    }));
    const state = new GameState();
    const seen: Array<{ coins: number; premiumCount: number }> = [];
    const unsubscribe = state.subscribe(() => {
      const snap = state.getSnapshot();
      seen.push({ coins: snap.coins, premiumCount: snap.premiumCount });
    });

    // O HUD assina antes do boot do Phaser; o initialize tem que avisá-lo,
    // senão a interface segue nos valores padrão até o primeiro clique.
    state.initialize(storage);

    expect(seen).toContainEqual({ coins: 500, premiumCount: 7 });
    unsubscribe();
  });
});
