// Name screening shared by the intro name field (client) and the leaderboard
// Function (server). Zero imports on purpose: the server bundle must stay free
// of the game's module graph, so this file may never depend on anything.
//
// Two tiers keep innocent words out of the blast radius (the Scunthorpe
// problem): unambiguous roots match anywhere inside the normalized name, while
// short/risky words only match a whole letter-run ("class" stays fine, "ass"
// does not). Normalization also undoes the usual evasions: accents (merdã),
// leetspeak (sh1t, c@ralho), repeated letters (fuuuck, assss) and separators
// ("f u c k").

// Match anywhere: safe to embed because no innocuous EN/PT word contains them.
const VULGAR_ROOTS = [
  // english
  "fuck", "shit", "bitch", "cunt", "whore", "slut", "nigg", "faggot", "rapist",
  "cocksuck", "dickhead", "cumshot",
  // português
  "caralh", "buceta", "porra", "merda", "foda", "fode", "fude", "puta",
  "putinh", "bosta", "viado", "arrombad", "boquet", "punhet", "cacete", "cuzao",
] as const;

// Match a whole letter-run only: too short or too innocent-prone as substrings.
const VULGAR_TOKENS = [
  "ass", "dick", "cock", "cum", "fag", "tits", "penis", "vagina", "boobs", "cu",
] as const;

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "+": "t",
};

// lowercase, de-accented, leetspeak undone, only a–z survives
function normalize(name: string): string {
  const deaccented = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let out = "";
  for (const character of deaccented) out += LEET[character] ?? character;
  return out;
}

// letter runs of the normalized text: ["f u ck"] → ["f", "u", "ck"]
const letterRuns = (text: string): string[] =>
  text.split(/[^a-z]+/).filter(Boolean);

// collapse every run of equal letters to one: "fuuuck" → "fuck"
const squashRuns = (text: string): string =>
  text.replace(/(.)\1+/g, "$1");

// collapse runs longer than two: "assss" → "ass"
const capRuns = (text: string): string =>
  text.replace(/(.)\1{2,}/g, "$1$1");

export function containsVulgarity(name: string): boolean {
  const raw = normalize(name);
  const variants = [raw, squashRuns(raw), capRuns(raw)];
  const roots: readonly string[] = VULGAR_ROOTS;
  const tokens: ReadonlySet<string> = new Set(VULGAR_TOKENS);
  for (const variant of variants) {
    for (const run of letterRuns(variant)) {
      if (tokens.has(run) || roots.some((root) => run.includes(root))) return true;
    }
  }
  // separators ("f u c k") vanish when only letters remain; only unambiguous
  // roots get this concatenated pass, so "a ss am" can never resurrect "ass"
  const joined = squashRuns(raw.replace(/[^a-z]/g, ""));
  return roots.some((root) => joined.includes(root));
}
