export type Plan = {
  id: string;
  name: string;
  amount: string;
  detail: string;
  tag?: string;
  kind: "consumable" | "subscription";
};

/**
 * Single source of truth for the game economy and store catalog.
 * On the web the checkout provider is Stripe; inside the native iOS shell
 * (TestFlight/App Store) the same plan ids map to StoreKit products, so the
 * catalog can be mirrored 1:1 in App Store Connect.
 */
export const MONETIZATION = {
  currency: "BRL",
  // master switch: while false, feeding is free (no daily cap, no store button).
  // Flip to true (or delete) to re-enable the paywall for release.
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

export const PLANS = MONETIZATION.store.plans;
