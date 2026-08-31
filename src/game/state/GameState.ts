// Single owner of player/economy state. The React overlay subscribes via
// useSyncExternalStore; the command layer mutates through patch(). Every
// mutation emits state:changed and schedules a debounced save.
import { SCENERY } from "../data/scenery";
import { ECONOMY } from "../data/economy";
import { KOI_VARIANTS } from "../data/variants";
import { gameBus, type PlayerSnapshot } from "../events";
import { applyDailyCycle, readSave, writeSave, type SavedFish, type Storage } from "../systems/save";
import { dayKey } from "../types";

const levelOf = (xp: number) => Math.floor(xp / ECONOMY.wallet.xpPerLevel) + 1;

function defaults(): PlayerSnapshot {
  return {
    food: ECONOMY.paywallEnabled ? ECONOMY.rations.freeDailyLimit : Number.POSITIVE_INFINITY,
    coins: ECONOMY.wallet.startCoins,
    xp: 0, streak: 1,
    rewardClaimed: false, totalFed: 0,
    missionFed: 0, missionClaimed: false,
    premiumCount: 0, remedios: 0,
    collection: [], bought: [],
    feedSel: "comum", som: true, idioma: "pt",
    selectedFid: null,
  };
}

export class GameState {
  private snapshot: PlayerSnapshot = defaults();
  private listeners = new Set<() => void>();
  private storage: Storage | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private serializeFishes: () => SavedFish[] = () => [];
  private prevLevel = 1;
  private initialized = false;

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  patch(patch: Partial<PlayerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.notify();
  }

  addXp(amount: number): void {
    const xp = this.snapshot.xp + amount;
    this.snapshot = { ...this.snapshot, xp };
    const level = levelOf(xp);
    if (level > this.prevLevel) {
      gameBus.events.emit("message", { text: `Nível ${level} alcançado! O cardume agradece` });
    }
    this.prevLevel = level;
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
    gameBus.events.emit("state:changed", this.snapshot);
    this.scheduleSave();
  }

  initialize(storage: Storage, opts: { fullPreview?: boolean } = {}): { fishes: SavedFish[] } {
    this.storage = storage;
    let save = applyDailyCycle(readSave(storage));
    if (opts.fullPreview) {
      // pré-visualização: monta o lago com todas as peças
      save = {
        ...save,
        scenery: SCENERY.map((item) => item.id),
        player: { ...save.player, collection: KOI_VARIANTS.map((_, index) => index) },
      };
    }
    this.prevLevel = levelOf(save.player.xp);
    this.snapshot = {
      ...this.snapshot,
      food: save.player.food,
      coins: save.player.coins,
      xp: save.player.xp,
      streak: save.player.streak,
      rewardClaimed: save.player.rewardClaimed,
      totalFed: save.player.totalFed,
      missionFed: save.player.missionFed,
      missionClaimed: save.player.missionClaimed,
      premiumCount: save.player.premium,
      remedios: save.player.remedios,
      collection: save.player.collection,
      bought: save.scenery,
      som: save.player.som,
      idioma: save.player.idioma,
    };
    this.initialized = true;
    gameBus.events.emit("state:changed", this.snapshot);
    gameBus.events.emit("scenery:changed", { bought: this.snapshot.bought });
    this.scheduleSave();
    return { fishes: save.fishes };
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  registerFishSerializer(fn: () => SavedFish[]): void {
    this.serializeFishes = fn;
  }

  // Fish data changed without a player-state mutation (growth, sickness) —
  // request a debounced save so the pond persists.
  requestSave(): void {
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (!this.storage) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 400);
  }

  saveNow(): void {
    if (!this.storage) return;
    const s = this.snapshot;
    writeSave(this.storage, {
      version: 4,
      date: dayKey(),
      player: {
        coins: s.coins, xp: s.xp, streak: s.streak,
        rewardClaimed: s.rewardClaimed, totalFed: s.totalFed,
        missionFed: s.missionFed, missionClaimed: s.missionClaimed,
        premium: s.premiumCount, remedios: s.remedios,
        collection: s.collection, som: s.som, idioma: s.idioma,
        food: s.food,
      },
      fishes: this.serializeFishes(),
      scenery: s.bought,
    });
  }
}

export const gameState = new GameState();
