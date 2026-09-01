// Versioned save system. Storage is injected so tests can pass a plain map.
//
// v5 adds player.levelRewards (scenery level rewards already claimed). v4
// stored fishes as named entries {variant, progress, sick}; the legacy v3
// format kept parallel arrays indexed by spawn order (variant implied by
// i % 6), which broke whenever spawn order changed — hence the migration.
import { DAILY_LIMIT, ECONOMY, STARTING_INVENTORY } from "../data/economy";
import { completedLevels } from "../data/scenery";
import { dayKey, type FeedChoice } from "../types";
import { emptySoldByVariant } from "../../leaderboard/score";

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const PLAYER_KEY = "koi-cafe-player-v5";
export const V4_PLAYER_KEY = "koi-cafe-player-v4";
export const LEGACY_PLAYER_KEY = "koi-cafe-player-v3";
export const LEGACY_SCENERY_KEY = "koi-cafe-scenery-v1";
export const ALL_SAVE_KEYS = [PLAYER_KEY, V4_PLAYER_KEY, LEGACY_PLAYER_KEY, LEGACY_SCENERY_KEY] as const;
// revisão 8: kit da primeira jogada = 30 moedas, 20 porções de ração comum,
// ×1 porção de ração especial e ×1 mamadeira; o lago recomeça apenas com
// os 3 baby fish da espécie básica.
export const STARTER_KIT_VERSION = 8;

export type SavedFish = { variant: number; progress: number; sick: boolean };

export type SaveData = {
  version: 5;
  date: string;
  player: {
    starterKitVersion: number;
    coins: number; xp: number; streak: number;
    rewardClaimed: boolean; totalFed: number; totalSold: number;
    missionFed: number; missionClaimed: boolean;
    premium: number; remedios: number;
    collection: number[];
    fishUnlocked: number[];
    levelRewards: number[];
    playerName: string; leaderboardId: string;
    leaderboardSoldByVariant: number[];
    leaderboardDailyRewards: number; leaderboardMissionRewards: number;
    leaderboardDriftCoins: number;
    som: boolean; idioma: "pt" | "en";
    food: number;
  };
  fishes: SavedFish[];
  scenery: string[];
};

export const startCoins = ECONOMY.wallet.startCoins;

export function freshSave(date = dayKey()): SaveData {
  return {
    version: 5,
    date,
    player: {
      // primeira jogada: 30 moedas, 20 porções comuns, ×1 ração especial
      // e ×1 mamadeira
      starterKitVersion: STARTER_KIT_VERSION,
      coins: startCoins, xp: 0, streak: 1,
      rewardClaimed: false, totalFed: 0, totalSold: 0,
      missionFed: 0, missionClaimed: false,
      premium: STARTING_INVENTORY.specialRations,
      remedios: STARTING_INVENTORY.remedyBottles,
      collection: [], fishUnlocked: [0], levelRewards: [],
      playerName: "", leaderboardId: "",
      leaderboardSoldByVariant: emptySoldByVariant(),
      leaderboardDailyRewards: 0, leaderboardMissionRewards: 0,
      leaderboardDriftCoins: 0,
      som: true, idioma: "en",
      food: STARTING_INVENTORY.commonRations,
    },
    fishes: [],
    scenery: [],
  };
}

// Shape of the legacy v3 payload (parallel arrays indexed by spawn order).
type LegacyV3 = Partial<{
  date: string; coins: number; xp: number; streak: number;
  rewardClaimed: boolean; totalFed: number; totalSold: number; missionFed: number; missionClaimed: boolean;
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
    version: 5,
    date: typeof raw.date === "string" ? raw.date : dayKey(),
    player: {
      starterKitVersion: STARTER_KIT_VERSION,
      coins: typeof raw.coins === "number" ? raw.coins : startCoins,
      xp: raw.xp ?? 0,
      streak: raw.streak ?? 1,
      rewardClaimed: Boolean(raw.rewardClaimed),
      totalFed: raw.totalFed ?? 0,
      totalSold: raw.totalSold ?? 0,
      missionFed: Math.min(ECONOMY.mission.goal, raw.missionFed ?? 0),
      missionClaimed: Boolean(raw.missionClaimed),
      premium: raw.premium ?? 0,
      remedios: raw.remedios ?? 0,
      collection: Array.isArray(raw.collection) ? raw.collection : [],
      fishUnlocked: [0],
      levelRewards: completedLevels(sceneryFromLegacyKey),
      playerName: "",
      leaderboardId: "",
      leaderboardSoldByVariant: emptySoldByVariant(),
      leaderboardDailyRewards: 0,
      leaderboardMissionRewards: 0,
      leaderboardDriftCoins: 0,
      som: raw.som ?? true,
      idioma: raw.idioma === "pt" ? "pt" : "en",
      food: raw.food ?? DAILY_LIMIT,
    },
    fishes,
    scenery: sceneryFromLegacyKey,
  };
}

// v4 → v5: mark levels already completed by the saved scenery as claimed, so
// progressed players don't re-earn consumable rewards on their next purchase.
function migrateV4(raw: Record<string, unknown> & { player?: Record<string, unknown>; scenery?: unknown }, date = dayKey()): SaveData {
  const fresh = freshSave(date);
  const scenery = Array.isArray(raw.scenery)
    ? raw.scenery.filter((id): id is string => typeof id === "string")
    : [];
  return {
    ...fresh,
    ...raw,
    version: 5,
    date: typeof raw.date === "string" ? raw.date : date,
    player: { ...fresh.player, ...raw.player, levelRewards: completedLevels(scenery) },
    scenery,
  } as SaveData;
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
    if (raw?.version === 5) {
      const fresh = freshSave(date);
      const needsStarterKitUpdate = raw.player?.starterKitVersion !== STARTER_KIT_VERSION;
      save = {
        ...fresh,
        ...raw,
        // A revisão do kit recomeça o jogo: a loja de cenário volta ao estado
        // inicial (peças como silhuetas com cadeado) e o lago nasce de novo
        // apenas com os 3 baby fish da espécie básica.
        scenery: needsStarterKitUpdate ? [] : (raw.scenery ?? fresh.scenery),
        fishes: needsStarterKitUpdate ? [] : (raw.fishes ?? fresh.fishes),
        player: {
          ...fresh.player,
          ...raw.player,
          ...(needsStarterKitUpdate
            ? {
                starterKitVersion: STARTER_KIT_VERSION,
                coins: startCoins,
                food: STARTING_INVENTORY.commonRations,
                premium: STARTING_INVENTORY.specialRations,
                remedios: STARTING_INVENTORY.remedyBottles,
                levelRewards: [],
              }
            // saves antigos podiam serializar Infinity (comida livre) como null
            : { food: raw.player?.food ?? fresh.player.food }),
        },
      } as SaveData;
    }
    else {
      const raw4 = JSON.parse(storage.getItem(V4_PLAYER_KEY) || "null");
      if (raw4?.version === 4) save = migrateV4(raw4, date);
      else if (raw) save = migrateV3(raw, sceneryFromLegacyKey);
      else {
        const legacyRaw = JSON.parse(storage.getItem(LEGACY_PLAYER_KEY) || "null");
        if (legacyRaw) save = migrateV3(legacyRaw, sceneryFromLegacyKey);
      }
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
  feedSel?: FeedChoice;
};
