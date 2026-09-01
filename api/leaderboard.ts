import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Kept self-contained so Vercel can load this ESM Function without pulling the
// browser game's module graph into the server bundle — the builder does not
// resolve imports outside api/, so the name screen below is a kept-in-sync
// copy of src/leaderboard/vulgarity.ts. A unit test guards both the score
// values and the screen against the shared client module.

// Mesma triagem de nomes do cliente, com as duas camadas que evitam o
// problema de Scunthorpe: raízes inambíguas casam em qualquer lugar,
// palavras curtas/arriscadas só casam uma letter-run inteira.
const VULGAR_ROOTS = [
  "fuck", "shit", "bitch", "cunt", "whore", "slut", "nigg", "faggot", "rapist",
  "cocksuck", "dickhead", "cumshot",
  "caralh", "buceta", "porra", "merda", "foda", "fode", "fude", "puta",
  "putinh", "bosta", "viado", "arrombad", "boquet", "punhet", "cacete", "cuzao",
];
const VULGAR_TOKENS = [
  "ass", "dick", "cock", "cum", "fag", "tits", "penis", "vagina", "boobs", "cu",
];
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "+": "t",
};

function normalizeName(name: string): string {
  const deaccented = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let out = "";
  for (const character of deaccented) out += LEET[character] ?? character;
  return out;
}

export function containsVulgarity(name: string): boolean {
  const raw = normalizeName(name);
  const variants = [raw, raw.replace(/(.)\1+/g, "$1"), raw.replace(/(.)\1{2,}/g, "$1$1")];
  for (const variant of variants) {
    for (const run of variant.split(/[^a-z]+/)) {
      if (!run) continue;
      if (VULGAR_TOKENS.includes(run) || VULGAR_ROOTS.some((root) => run.includes(root))) return true;
    }
  }
  const joined = raw.replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
  return VULGAR_ROOTS.some((root) => joined.includes(root));
}
export const SERVER_SCORE_RULES = {
  salePrices: [12, 20, 26, 32, 40, 48],
  dailyReward: 15,
  missionReward: 25,
  driftCoin: 5,
  xpPerFeed: 8,
} as const;

type LeaderboardCounters = {
  soldByVariant: number[];
  dailyRewards: number;
  missionRewards: number;
  driftCoins: number;
  totalFed: number;
  xp: number;
};

type LeaderboardEntry = { rank: number; name: string; score: number };
type LeaderboardSubmission = { playerId: string; name: string; counters: LeaderboardCounters };

const LEADERBOARD_VARIANT_COUNT = SERVER_SCORE_RULES.salePrices.length;

function scoreFromCounters(counters: LeaderboardCounters): number {
  const fishSales = SERVER_SCORE_RULES.salePrices.reduce(
    (total, price, variant) => total + price * (counters.soldByVariant[variant] ?? 0),
    0,
  );
  return fishSales
    + counters.dailyRewards * SERVER_SCORE_RULES.dailyReward
    + counters.missionRewards * SERVER_SCORE_RULES.missionReward
    + counters.driftCoins * SERVER_SCORE_RULES.driftCoin;
}

type StoredPlayer = {
  score: number;
  counters: LeaderboardCounters;
  created_at: string;
  updated_at: string;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const PLAYER_ID = /^[a-zA-Z0-9-]{16,80}$/;
const MAX_COUNTER = 1_000_000_000;

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });

const asInt = (value: unknown): number | null =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_COUNTER
    ? Number(value)
    : null;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const printable = Array.from(value).filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 32 && code !== 127;
  }).join("");
  const name = printable.trim().replace(/\s+/g, " ");
  const length = Array.from(name).length;
  if (length < 2 || length > 20) return null;
  // mesma triagem do campo de nome no cliente — o cliente nunca é confiável
  return containsVulgarity(name) ? null : name;
}

function readCounters(value: unknown): LeaderboardCounters | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.soldByVariant) || raw.soldByVariant.length !== LEADERBOARD_VARIANT_COUNT) return null;
  const soldByVariant = raw.soldByVariant.map(asInt);
  const dailyRewards = asInt(raw.dailyRewards);
  const missionRewards = asInt(raw.missionRewards);
  const driftCoins = asInt(raw.driftCoins);
  const totalFed = asInt(raw.totalFed);
  const xp = asInt(raw.xp);
  if (soldByVariant.some((count) => count === null)
    || dailyRewards === null || missionRewards === null || driftCoins === null
    || totalFed === null || xp === null) return null;
  return {
    soldByVariant: soldByVariant as number[],
    dailyRewards,
    missionRewards,
    driftCoins,
    totalFed,
    xp,
  };
}

function readSubmission(value: unknown): LeaderboardSubmission | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const playerId = typeof raw.playerId === "string" && PLAYER_ID.test(raw.playerId) ? raw.playerId : null;
  const name = cleanName(raw.name);
  const counters = readCounters(raw.counters);
  return playerId && name && counters ? { playerId, name, counters } : null;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function basicPlausibility(counters: LeaderboardCounters): string | null {
  if (counters.xp !== counters.totalFed * SERVER_SCORE_RULES.xpPerFeed) return "XP does not match feedings";
  if (counters.missionRewards > Math.floor(counters.totalFed / 10) + 1) return "Too many mission rewards";
  if (sum(counters.soldByVariant) > counters.totalFed * 5 + 3) return "Too many koi sales";
  return null;
}

function historyPlausibility(next: LeaderboardCounters, previous: StoredPlayer, now: number): string | null {
  const prev = previous.counters;
  const arraysMonotonic = next.soldByVariant.every((count, index) => count >= (prev.soldByVariant[index] ?? 0));
  if (!arraysMonotonic
    || next.dailyRewards < prev.dailyRewards
    || next.missionRewards < prev.missionRewards
    || next.driftCoins < prev.driftCoins
    || next.totalFed < prev.totalFed
    || next.xp < prev.xp) return "Lifetime counters moved backwards";

  const elapsed = Math.max(0, (now - new Date(previous.updated_at).getTime()) / 1000);
  const age = Math.max(0, (now - new Date(previous.created_at).getTime()) / 1000);
  const score = scoreFromCounters(next);
  const scoreDelta = score - previous.score;
  const soldDelta = sum(next.soldByVariant) - sum(prev.soldByVariant);

  if (scoreDelta < 0) return "Score moved backwards";
  if (score > 1_000 + age * 4) return "Score grew faster than possible";
  if (scoreDelta > 250 + elapsed * 6) return "Score jump is too large";
  if (next.totalFed - prev.totalFed > 20 + elapsed * 4) return "Too many feedings in the interval";
  if (soldDelta > 10 + elapsed * 2) return "Too many koi sales in the interval";
  if (next.driftCoins - prev.driftCoins > 2 + Math.ceil(elapsed / 9)) return "Too many drift coins";
  if (next.dailyRewards - prev.dailyRewards > 1 + Math.floor(elapsed / 86_400)) return "Too many daily rewards";
  if (next.missionRewards - prev.missionRewards > 1 + Math.floor(elapsed / 86_400)) return "Too many mission rewards";
  return null;
}

type Sql = NeonQueryFunction<false, false>;

async function ensureSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS koi_leaderboard (
      player_id TEXT PRIMARY KEY,
      display_name VARCHAR(80) NOT NULL,
      score BIGINT NOT NULL DEFAULT 0,
      counters JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS koi_leaderboard_rank_idx
    ON koi_leaderboard (score DESC, updated_at ASC)
  `;
}

let schemaReady: Promise<void> | null = null;

async function getLeaderboard(sql: Sql, request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("limit"));
  const limit = requested === 3 ? 3 : 20;
  const rows = await sql`
    SELECT display_name, score
    FROM koi_leaderboard
    ORDER BY score DESC, updated_at ASC
    LIMIT ${limit}
  ` as unknown as Array<{ display_name: string; score: string | number }>;
  const entries: LeaderboardEntry[] = rows.map((row, index) => ({
    rank: index + 1,
    name: row.display_name,
    score: Number(row.score),
  }));
  return json({ entries }, 200, { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" });
}

async function submitScore(sql: Sql, request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const submission = readSubmission(raw);
  if (!submission) return json({ error: "Invalid leaderboard submission" }, 400);

  const simpleFailure = basicPlausibility(submission.counters);
  if (simpleFailure) return json({ accepted: false, error: simpleFailure }, 422);

  const existingRows = await sql`
    SELECT score, counters, created_at, updated_at
    FROM koi_leaderboard
    WHERE player_id = ${submission.playerId}
    LIMIT 1
  ` as unknown as StoredPlayer[];
  const previous = existingRows[0];
  const score = scoreFromCounters(submission.counters);
  if (!previous && score > 1_000) {
    return json({ accepted: false, error: "Initial score is too large" }, 422);
  }
  if (previous) {
    const historyFailure = historyPlausibility(submission.counters, previous, Date.now());
    if (historyFailure) return json({ accepted: false, error: historyFailure }, 422);
  }

  await sql`
    INSERT INTO koi_leaderboard (player_id, display_name, score, counters)
    VALUES (${submission.playerId}, ${submission.name}, ${score}, ${JSON.stringify(submission.counters)}::jsonb)
    ON CONFLICT (player_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      score = EXCLUDED.score,
      counters = EXCLUDED.counters,
      updated_at = NOW()
  `;
  return json({ accepted: true, score });
}

async function deletePlayer(sql: Sql, request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const playerId = raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).playerId === "string"
    ? (raw as Record<string, string>).playerId
    : "";
  if (!PLAYER_ID.test(playerId)) return json({ error: "Invalid player ID" }, 400);
  await sql`DELETE FROM koi_leaderboard WHERE player_id = ${playerId}`;
  return json({ deleted: true });
}

export default {
  async fetch(request: Request) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return json({ error: "Leaderboard database is not configured" }, 503);
    const sql = neon(databaseUrl);
    try {
      schemaReady ??= ensureSchema(sql);
      await schemaReady;
      if (request.method === "GET") return getLeaderboard(sql, request);
      if (request.method === "POST") return submitScore(sql, request);
      if (request.method === "DELETE") return deletePlayer(sql, request);
      return json({ error: "Method not allowed" }, 405, { allow: "GET, POST, DELETE" });
    } catch (error) {
      console.error("Leaderboard request failed", error);
      return json({ error: "Leaderboard unavailable" }, 503);
    }
  },
};
