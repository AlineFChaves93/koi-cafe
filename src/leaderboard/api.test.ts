import { afterEach, describe, expect, it } from "vitest";
import leaderboard, { SERVER_SCORE_RULES, containsVulgarity as serverContainsVulgarity } from "../../api/leaderboard";
import { containsVulgarity } from "./vulgarity";
import { ECONOMY } from "@/game/data/economy";
import { FISH_OFFERS } from "@/game/data/fishShop";

describe("leaderboard API configuration", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("fails closed without breaking the client when the database is not connected", async () => {
    delete process.env.DATABASE_URL;
    const response = await leaderboard.fetch(new Request("https://example.test/api/leaderboard"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Leaderboard database is not configured" });
  });

  it("keeps the standalone Function rules aligned with the game economy", () => {
    expect(SERVER_SCORE_RULES).toEqual({
      salePrices: FISH_OFFERS.map(({ sellPrice }) => sellPrice),
      dailyReward: ECONOMY.dailyReward.coins,
      missionReward: ECONOMY.mission.rewardCoins,
      driftCoin: ECONOMY.wallet.coinsPerDrift,
      xpPerFeed: ECONOMY.wallet.xpPerFeed,
    });
  });

  it("keeps the standalone Function name screen aligned with the shared filter", () => {
    const samples = [
      "Tani", "São Paulo", "Class", "bass player", "cocker", "cuidar",
      "fuck", "FUCK YOU", "merda", "c@ralho", "fu ck", "fuuuck", "assss",
      "puta", "putinha", "cú", "cu",
    ];
    for (const name of samples) {
      expect(serverContainsVulgarity(name), name).toBe(containsVulgarity(name));
    }
  });
});
