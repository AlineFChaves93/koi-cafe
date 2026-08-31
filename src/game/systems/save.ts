// Versioned save system. Storage is injected so tests can pass a plain map.
//
// v4 stores fishes as named entries {variant, progress, sick}; the legacy v3
// format kept parallel arrays indexed by spawn order (variant implied by
// i % 6), which broke whenever spawn order changed — hence the migration.
import { DAILY_LIMIT, ECONOMY } from "../data/economy";
import { dayKey, type FeedKind } from "../types";

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const PLAYER_KEY = "koi-cafe-player-v4";
export const LEGACY_PLAYER_KEY = "koi-cafe-player-v3";
export const LEGACY_SCENERY_KEY = "koi-cafe-scenery-v1";

export type SavedFish = { variant: number; progress: number; sick: boolean };

export type SaveData = {
  version: 4;
  date: string;
  player: {
    coins: number; xp: number; streak: number;
    rewardClaimed: boolean; totalFed: number;
    missionFed: number; missionClaimed: boolean;
    premium: number; remedios: number;
    collection: number[];
    som: boolean; idioma: "pt" | "en";
    food: number;
  };
  fishes: SavedFish[];
  scenery: string[];
};

export const startCoins = ECONOMY.wallet.startCoins;

export function freshSave(date = dayKey()): SaveData {
  return {
    version: 4,
    date,
    player: {
      coins: startCoins, xp: 0, streak: 1,
      rewardClaimed: false, totalFed: 0,
      missionFed: 0, missionClaimed: false,
      premium: 0, remedios: 0,
      collection: [],
      som: true, idioma: "pt",
      food: DAILY_LIMIT,
    },
    fishes: [],
    scenery: [],
  };
}

// Shape of the legacy v3 payload (parallel arrays indexed by spawn order).
type LegacyV3 = Partial<{
  date: string; coins: number; xp: number; streak: number;
  rewardClaimed: boolean; totalFed: number; missionFed: number; missionClaimed: boolean;
  premium: number; remedios: number; collection: number[];
  som: boolean; idioma: string; growth: unknown[]; sick: unknown[]; food: number;
}>;

function migrateV3(raw: LegacyV3, sceneryFromLegacyKey: string[]): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const growth: unknown[] = Array.isArray(raw.growth) ? raw.growth : [];
  const sick: unknown[] = Array.isArray(raw.sick) ? raw.sick : [];
  // v3 arrays were positional: variant came from i % 6 at spawn time.
  const fishes: SavedFish[] = growth.slice(0, 24).map((progress, index) => ({
    variant: index % 6,
    progress: Math.min(10, Math.round(Number(progress ?? 0) * 10) / 10),
    sick: sick[index] === 1,
  }));
  return {
    version: 4,
    date: typeof raw.date === "string" ? raw.date : dayKey(),
    player: {
      coins: typeof raw.coins === "number" ? raw.coins : startCoins,
      xp: raw.xp ?? 0,
      streak: raw.streak ?? 1,
      rewardClaimed: Boolean(raw.rewardClaimed),
      totalFed: raw.totalFed ?? 0,
      missionFed: Math.min(ECONOMY.mission.goal, raw.missionFed ?? 0),
      missionClaimed: Boolean(raw.missionClaimed),
      premium: raw.premium ?? 0,
      remedios: raw.remedios ?? 0,
      collection: Array.isArray(raw.collection) ? raw.collection : [],
      som: raw.som ?? true,
      idioma: raw.idioma === "en" ? "en" : "pt",
      food: ECONOMY.paywallEnabled ? (raw.food ?? DAILY_LIMIT) : Number.POSITIVE_INFINITY,
    },
    fishes,
    scenery: sceneryFromLegacyKey,
  };
}

export function readSave(storage: Storage, date = dayKey()): SaveData {
  let sceneryFromLegacyKey: string[] = [];
  try {
    const legacyScenery = JSON.parse(storage.getItem(LEGACY_SCENERY_KEY) || "null");
    if (Array.isArray(legacyScenery)) sceneryFromLegacyKey = legacyScenery.filter((id: unknown): id is string => typeof id === "string");
  } catch { /* lago novo quando o armazenamento falha */ }

  let save: SaveData | null = null;
  try {
    const raw = JSON.parse(storage.getItem(PLAYER_KEY) || "null");
    if (raw?.version === 4) save = { ...freshSave(date), ...raw } as SaveData;
    else if (raw) save = migrateV3(raw, sceneryFromLegacyKey);
    else {
      const legacyRaw = JSON.parse(storage.getItem(LEGACY_PLAYER_KEY) || "null");
      if (legacyRaw) save = migrateV3(legacyRaw, sceneryFromLegacyKey);
    }
  } catch { /* start fresh when local data is unavailable */ }
  return save ?? freshSave(date);
}

// Daily rollover: resets mission/daily-reward claims, renews rations and
// advances (or resets) the streak exactly like the previous hydrate logic.
export function applyDailyCycle(save: SaveData, today = dayKey()): SaveData {
  if (save.date === today) return save;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    ...save,
    date: today,
    player: {
      ...save.player,
      food: DAILY_LIMIT,
      streak: save.date === dayKey(yesterday)
        ? Math.min(ECONOMY.streak.maxDays, (save.player.streak ?? 0) + 1)
        : 1,
      rewardClaimed: false,
      missionFed: 0,
      missionClaimed: false,
    },
  };
}

export function writeSave(storage: Storage, save: SaveData): void {
  try {
    storage.setItem(PLAYER_KEY, JSON.stringify(save));
  } catch { /* keep playing when storage is full or blocked */ }
}

export type SaveInput = {
  date?: string;
  player: Omit<SaveData["player"], "food"> & { food?: number };
  fishes: SavedFish[];
  scenery: string[];
  feedSel?: FeedKind;
};
