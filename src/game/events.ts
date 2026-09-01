// Typed event bus between the game core and the React UI overlay.
// Commands flow UI → game; events flow game → UI. Nothing crosses back.
import type { FeedChoice, FishView } from "./types";

export type CommandMap = {
  "aim:start": void;
  "aim:move": { x: number; y: number }; // viewport percent
  "aim:end": { x: number; y: number };
  "aim:cancel": void;
  "tap": { x: number; y: number };
  "select-fish": { fid: number | null };
  "sell-fish": { fid: number };
  "buy-fish": { variant: number };
  "medicate-fish": { fid: number };
  "buy-scenery": { id: string };
  "buy-common": void;
  "buy-bucket": void;
  "buy-premium": void;
  "buy-remedy": void;
  "claim-daily": void;
  "claim-mission": void;
  // escolhe o item do console — só isso; o arremesso vem do botão central
  "set-feed": { feed: FeedChoice };
};

export type PlayerSnapshot = {
  food: number; coins: number; xp: number; streak: number;
  rewardClaimed: boolean; totalFed: number;
  totalSold: number;
  missionFed: number; missionClaimed: boolean;
  premiumCount: number; remedios: number;
  collection: number[]; bought: string[];
  fishUnlocked: number[];
  levelRewards: number[];
  playerName: string; leaderboardId: string;
  leaderboardSoldByVariant: number[];
  leaderboardDailyRewards: number; leaderboardMissionRewards: number;
  leaderboardDriftCoins: number;
  feedSel: FeedChoice; som: boolean; idioma: "pt" | "en";
  selectedFid: number | null;
};

export type EventMap = {
  "message": { text: string };
  "state:changed": PlayerSnapshot;
  "fishes:changed": { fishes: FishView[] };
  "feed:thrown": { xPct: number; yPct: number; premium: boolean };
  // mamadeira lançada pelo botão central: voa do menino até o peixe doente
  "remedy:thrown": { fid: number; x: number; y: number };
  "scenery:changed": { bought: string[] };
  "fish:sold": { x: number; y: number; amount: number };
  "fish:bought": { x: number; y: number };
  "fish:cured": { fid: number };
  "coin:collected": { x: number; y: number; amount: number };
  "wallet:flare": { amount: number };
};

// void payloads become zero-argument calls at the type level.
type Args<T> = T extends void ? [] : [payload: T];
type AnyHandler = (...args: never[]) => void;

class Emitter<M extends Record<string, unknown>> {
  private handlers = new Map<keyof M, Set<AnyHandler>>();

  on<K extends keyof M>(key: K, handler: (...args: Args<M[K]>) => void): () => void {
    const set = this.handlers.get(key) ?? new Set();
    set.add(handler as unknown as AnyHandler);
    this.handlers.set(key, set);
    return () => this.off(key, handler);
  }

  off<K extends keyof M>(key: K, handler: (...args: Args<M[K]>) => void): void {
    this.handlers.get(key)?.delete(handler as unknown as AnyHandler);
  }

  emit<K extends keyof M>(key: K, ...args: Args<M[K]>): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const handler of [...set]) (handler as (...args: unknown[]) => void)(...args);
  }
}

export type GameBus = {
  commands: Emitter<CommandMap>;
  events: Emitter<EventMap>;
};

export function createBus(): GameBus {
  return { commands: new Emitter(), events: new Emitter() };
}

// Singleton bus for the single-game page. Created at module load — pure, no
// engine — so both the React UI and the Phaser scenes can import it freely.
export const gameBus = createBus();
