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
  // master switch: while false, feeding is free — the daily bucket renews the
  // moment it runs dry and never locks the player out. Flip to true to
  // re-enable the daily cap (and with it the wait-until-tomorrow lockout) for
  // release.
  paywallEnabled: false,
  wallet: { startCoins: 30, coinsPerFeed: 2, coinsPerDrift: 5, xpPerFeed: 8, xpPerLevel: 100 },
  rations: { freeDailyLimit: 30, renewAt: "meia-noite" },
  dailyReward: { coins: 15, rations: 5 },
  mission: { goal: 10, rewardCoins: 25 },
  streak: { maxDays: 30 },
  store: {
    provider: "stripe",
    plans: [
      { id: "br.com.koicafe.handful", name: "Punhado", amount: "R$ 4,90", detail: "+40 porções de ração", kind: "consumable" },
      { id: "br.com.koicafe.bucket", name: "Balde Carp", amount: "R$ 9,90", detail: "+100 porções + 80 moedas", tag: "MAIS POPULAR", kind: "consumable" },
      { id: "br.com.koicafe.club", name: "Clube Carp", amount: "R$ 19,90/mês", detail: "100 porções/dia + 2× moedas", tag: "MELHOR VALOR", kind: "subscription" },
    ] as Plan[],
  },
} as const;

// Recompensas dos níveis do cenário: 1 balde de ração comum = 10 porções
// (mesmo valor do balde da loja).
export const RATION_BUCKET = 10;

// modo sem paywall: a ração vem do balde gratuito (10 porções), renovado
// a cada dia pelo ciclo diário; com paywall, vale o limite grátis.
export const DAILY_LIMIT = ECONOMY.paywallEnabled ? ECONOMY.rations.freeDailyLimit : RATION_BUCKET;

// kit da primeira jogada: 20 porções de ração comum, ×1 porção de ração
// especial e ×1 mamadeira — além das 30 moedas iniciais.
export const STARTING_INVENTORY = {
  commonRations: 20,
  specialRations: 1,
  remedyBottles: 1,
} as const;

// ===================== economia do sample =====================
// baby fish → (3 jogadas de ração comum) → médio → (+5 porções) → grande
// (STAGE_ADULTO = 3 + 5 = 8). ração especial: 1 porção leva o baby fish
// direto para médio (valor 3); do médio, 2 porções fecham o grande (3+3=6,
// +3 estoura o 8).
// jogada no cardume (sem peixe na mira): rende 10/14 → grande em ~11 jogadas (+3).
export const SELL_PRICE = 10; // peixe básico grande
// Itens avulsos comprados com moedas na Loja Carp.
export const COMMON_RATION_PRICE = 3; // 1 punhado de ração comum
export const BUCKET_PRICE = 5; // 1 balde de ração comum (+10 porções)
export const MEDICINE_PRICE = 3; // 1 mamadeira
export const BASIC_FISH_EARLY_PRICE = 2; // baby fish da raça básica (Platina)
export const BASIC_FISH_LATE_PRICE = 5;
export const PREMIUM_PRICE = 10; // 1 porção de ração especial
export const STAGE_MEDIO = 3; // baby fish → médio: 3 porções de ração comum
export const STAGE_ADULTO = 8; // médio → grande: +5 porções (8 no total)
export const PREMIUM_VALUE = 3; // baby fish vira médio já na primeira porção especial
export const SCHOOL_FACTOR = 10 / 14; // cardume: crescimento mais lento
export const THROWS_PER_SICKNESS = 4; // a cada 4 jogadas de ração comum, um peixe adoece — baby, médio ou grande
export const STAGE_NAMES = ["BABY FISH", "MÉDIO", "GRANDE"] as const;
export const FISH_VIEWPORT_RATIO = 0.075;

// moeda flutuante: de vez em quando uma moeda dourada cruza o lago levada
// pela correnteza e um toque a resgata. Com o cofre exatamente zerado ela
// vem muito mais vezes — a correnteza nunca deixa o jogador sem resgate.
export const DRIFT_COIN = {
  value: ECONOMY.wallet.coinsPerDrift, // moedas pescadas por resgate
  delaySeconds: [40, 75],       // cadência normal (segundos entre moedas)
  brokeDelaySeconds: [9, 15],   // cadência com o cofre em 0 moedas
  firstDelaySeconds: 12,        // primeira visita da sessão (descoberta)
  crossSeconds: 16,             // tempo de travessia do lago
  bobAmp: 0.012,                // ondulação vertical (fração do menor lado)
  bobFreq: 1.7,                 // frequência da ondulação (rad/s)
  grabRadius: 42,               // raio de resgate do toque (px do mundo)
} as const;

// one throw scatters a cloud of individual pellets; each pellet is a single bite.
// ração comum solta 5 grãos; o balde premium solta 15.
export const PELLETS_PER_THROW = { comum: 5, premium: 15 } as const;
export const PELLET_FOOD = 1;
export const EAT_RATE = 1;
