import { describe, expect, it } from "vitest";
import { emptySoldByVariant, scoreFromCounters } from "./score";

describe("leaderboard gross earnings", () => {
  it("recalculates the score from its auditable earning components", () => {
    expect(scoreFromCounters({
      soldByVariant: [2, 1, 0, 0, 0, 1],
      dailyRewards: 2,
      missionRewards: 3,
      driftCoins: 4,
      totalFed: 80,
      xp: 640,
    })).toBe(2 * 12 + 20 + 48 + 2 * 15 + 3 * 25 + 4 * 5);
  });

  it("starts at zero instead of counting the starter wallet", () => {
    expect(scoreFromCounters({
      soldByVariant: emptySoldByVariant(),
      dailyRewards: 0,
      missionRewards: 0,
      driftCoins: 0,
      totalFed: 0,
      xp: 0,
    })).toBe(0);
  });
});

