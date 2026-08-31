// Economy values, progression thresholds and the store catalog.
// Single source of truth for everything money- and growth-related.

export type Plan = {
  id: string;
  name: string;
  amount: string;
  detail: string;
  tag?: string;
  kind: "consumable" | "subscription";
};

export const ECONOMY = {
  currency: "BRL",
  // master switch: while false, feeding is free (no daily cap, no store button).
  // Flip to true to re-enable the paywall for release.
  paywallEnabled: false,
  wallet: { startCoins: 20, coinsPerFeed: 2, xpPerFeed: 8, xpPerLevel: 100 },
  rations: { freeDailyLimit: 30, renewAt: "meia-noite" },
  dailyReward: { coins: 15, rations: 5 },
  mission: { goal: 10, rewardCoins: 25 },
  streak: { maxDays: 30 },
  store: {
    provider: "stripe",
    plans: [
      { id: "br.com.koicafe.handful", name: "Punhado", amount: "R$ 4,90", detail: "+40 porções de ração", kind: "consumable" },
      { id: "br.com.koicafe.bucket", name: "Balde Koi", amount: "R$ 9,90", detail: "+100 porções + 80 moedas", tag: "MAIS POPULAR", kind: "consumable" },
      { id: "br.com.koicafe.club", name: "Clube Nishiki", amount: "R$ 19,90/mês", detail: "100 porções/dia + 2× moedas", tag: "MELHOR VALOR", kind: "subscription" },
    ] as Plan[],
  },
} as const;

export const DAILY_LIMIT = ECONOMY.paywallEnabled ? ECONOMY.rations.freeDailyLimit : Number.POSITIVE_INFINITY;

// ===================== economia do sample =====================
// mini → (3 jogadas comuns) → médio → (10 jogadas no total) → adulto.
// ração premium: médio em 2 jogadas, adulto em 7 (valor 1.5× por jogada).
// jogada no cardume (sem peixe na mira): rende 10/14 → adulto em 14 jogadas (+4).
export const SELL_PRICE = 10; // peixe básico adulto
export const MED_PRICE = 5; // remédio para peixe comum
export const PREMIUM_PRICE = 30; // 1 jogada de ração premium
export const STAGE_MEDIO = 3;
export const STAGE_ADULTO = 10;
export const PREMIUM_VALUE = 1.5; // 1.5×2=3 (médio em 2) e 1.5×7=10.5 (adulto em 7)
export const SCHOOL_FACTOR = 10 / 14; // cardume: adulto em 14 jogadas
export const SICK_CHANCE = 0.08; // por jogada, um peixe saudável pode adoecer
export const STAGE_NAMES = ["MINI", "MÉDIO", "ADULTO"] as const;
export const FISH_VIEWPORT_RATIO = 0.075;

// one throw scatters a cloud of individual pellets; each pellet is a single bite
export const PELLETS_PER_THROW = 12;
export const PELLET_FOOD = 1;
export const EAT_RATE = 1;
export const FISH_COUNT = 12;
