import { ECONOMY } from "../game/data/economy";
import { FISH_OFFERS } from "../game/data/fishShop";
import type { PlayerSnapshot } from "../game/events";

export const LEADERBOARD_VARIANT_COUNT = FISH_OFFERS.length;
export const LEADERBOARD_SALE_PRICES = FISH_OFFERS.map(({ sellPrice }) => sellPrice);

export type LeaderboardCounters = {
  soldByVariant: number[];
  dailyRewards: number;
  missionRewards: number;
  driftCoins: number;
  totalFed: number;
  xp: number;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
};

export type LeaderboardSubmission = {
  playerId: string;
  name: string;
  counters: LeaderboardCounters;
};

export const emptySoldByVariant = (): number[] =>
  Array.from({ length: LEADERBOARD_VARIANT_COUNT }, () => 0);

export function countersFromSnapshot(state: PlayerSnapshot): LeaderboardCounters {
  return {
    soldByVariant: state.leaderboardSoldByVariant,
    dailyRewards: state.leaderboardDailyRewards,
    missionRewards: state.leaderboardMissionRewards,
    driftCoins: state.leaderboardDriftCoins,
    totalFed: state.totalFed,
    xp: state.xp,
  };
}

export function scoreFromCounters(counters: LeaderboardCounters): number {
  const fishSales = LEADERBOARD_SALE_PRICES.reduce(
    (total, price, variant) => total + price * (counters.soldByVariant[variant] ?? 0),
    0,
  );
  return fishSales
    + counters.dailyRewards * ECONOMY.dailyReward.coins
    + counters.missionRewards * ECONOMY.mission.rewardCoins
    + counters.driftCoins * ECONOMY.wallet.coinsPerDrift;
}

