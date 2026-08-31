// Command handlers: everything the player can DO, ported from the old React
// handlers. Commands come in on the bus; effects go out as world mutations,
// GameState patches and bus events. Timers run through an injected scheduler
// so the real game uses the Phaser clock and tests can stub it.
import {
  ECONOMY, MED_PRICE, PREMIUM_PRICE, SELL_PRICE,
  STAGE_MEDIO, STAGE_ADULTO, STAGE_NAMES,
} from "../data/economy";
import { SCENERY_BY_ID } from "../data/scenery";
import { gameBus } from "../events";
import type { GameState } from "../state/GameState";
import { fishName, progText, stageOf } from "./economy";
import { clampToWater, findFishNear, rollSickness, scatterPellets } from "./feeding";
import { spawnReplacement } from "./fishSim";
import type { FishView, SimWorld } from "../types";

const MISSION_GOAL = ECONOMY.mission.goal;
const MISSION_REWARD = ECONOMY.mission.rewardCoins;
const DEFAULT_HINT = "Segure para mirar • perto de um peixe = ração só dele";

export type GameContext = {
  world: SimWorld;
  state: GameState;
  schedule: (delayMs: number, fn: () => void) => void;
};

const fishViews = (world: SimWorld): FishView[] =>
  world.fishes.map((f) => ({ fid: f.fid, variant: f.variant, progress: f.progress, sick: f.sick }));

const emitFishes = (world: SimWorld) => gameBus.events.emit("fishes:changed", { fishes: fishViews(world) });
const say = (text: string) => gameBus.events.emit("message", { text });

function buyPremium(ctx: GameContext): boolean {
  const { state } = ctx;
  if (state.getSnapshot().coins < PREMIUM_PRICE) {
    say(`Moedas insuficientes — ração premium custa ◎${PREMIUM_PRICE}`);
    return false;
  }
  state.patch({
    coins: state.getSnapshot().coins - PREMIUM_PRICE,
    premiumCount: state.getSnapshot().premiumCount + 1,
  });
  say(`Ração premium +1 (−◎${PREMIUM_PRICE}) • cresce em 2/7 jogadas`);
  return true;
}

// ===================== arremesso de ração =====================
function releaseFood(ctx: GameContext, xPct: number, yPct: number): void {
  const { world, state } = ctx;
  const snap = state.getSnapshot();
  if (!world.aiming || (ECONOMY.paywallEnabled && snap.food <= 0)) return;
  const usingPremium = snap.feedSel === "premium";
  if (usingPremium) {
    if (snap.premiumCount <= 0) {
      say("Sem ração premium — compre por ◎30 no seletor de ração");
      world.aiming = false;
      return;
    }
    state.patch({ premiumCount: snap.premiumCount - 1 });
  }

  const spot = clampToWater(world, (xPct / 100) * world.w, (yPct / 100) * world.h);
  const targetFish = findFishNear(world, spot.x, spot.y, 0.08);

  const throwId = world.nextId++;
  world.throws.set(throwId, { feed: usingPremium ? "premium" : "comum", targetFid: targetFish ? targetFish.fid : null });
  if (world.throws.size > 120) {
    const oldest = world.throws.keys().next();
    if (oldest.value !== undefined) world.throws.delete(oldest.value);
  }

  const missionReady = snap.missionFed + 1 >= MISSION_GOAL && !snap.missionClaimed;
  state.patch({
    food: snap.food - 1,
    totalFed: snap.totalFed + 1,
    missionFed: Math.min(MISSION_GOAL, snap.missionFed + 1),
  });
  state.addXp(ECONOMY.wallet.xpPerFeed);

  scatterPellets(world, spot, usingPremium ? "premium" : "comum", throwId);

  for (const f of world.fishes) {
    if (Math.hypot(f.x - spot.x, f.y - spot.y) < Math.min(world.w, world.h) * 0.42) f.burst = 1;
  }
  world.aiming = false;
  gameBus.events.emit("feed:thrown", { xPct: (spot.x / world.w) * 100, yPct: (spot.y / world.h) * 100, premium: usingPremium });

  if (targetFish) {
    const stage = stageOf(targetFish.progress);
    const prog = stage === 2 ? "ADULTO" : `${progText(targetFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}`;
    say(`Ração ${usingPremium ? "premium " : ""}para ${fishName(targetFish.variant, targetFish.fid)} (${prog})${targetFish.sick ? " • DOENTE — não cresce sem remédio" : ""}`);
  } else {
    say("Ração ao cardume • crescimento mais lento (+4 jogadas)");
  }

  const victim = rollSickness(world);
  if (victim) {
    victim.sick = true;
    ctx.schedule(1200, () => say(`${fishName(victim.variant, victim.fid)} ficou DOENTE! Toque nele e use o remédio (◎${MED_PRICE})`));
    emitFishes(world);
  }

  ctx.schedule(1750, () => say(missionReady ? "Missão pronta! Resgate +25 moedas" : DEFAULT_HINT));
}

// toque rápido perto de um peixe → abre o cartão dele
function tapSelect(ctx: GameContext, xPct: number, yPct: number): void {
  const { world, state } = ctx;
  if (!world.w) return;
  const px = (xPct / 100) * world.w, py = (yPct / 100) * world.h;
  const best = findFishNear(world, px, py, 0.12);
  if (best) {
    state.patch({ selectedFid: best.fid });
    emitFishes(world);
    const stage = stageOf(best.progress);
    say(stage === 2
      ? `${fishName(best.variant, best.fid)} está ADULTO — pronto para vender por ◎${SELL_PRICE}`
      : `${fishName(best.variant, best.fid)}: ${STAGE_NAMES[stage]} • ${progText(best.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO} jogadas`);
  } else {
    state.patch({ selectedFid: null });
  }
}

// venda: só peixes ADULTOS, ◎10 cada (todos os variantes atuais são básicos)
function sellFish(ctx: GameContext, fid: number): void {
  const { world, state } = ctx;
  const idx = world.fishes.findIndex((f) => f.fid === fid);
  if (idx < 0) return;
  const fish = world.fishes[idx];
  if (stageOf(fish.progress) < 2) return;
  world.fishes.splice(idx, 1);
  state.patch({ selectedFid: null, coins: state.getSnapshot().coins + SELL_PRICE });
  say(`${fishName(fish.variant, fish.fid)} vendido por ◎${SELL_PRICE}! Novos peixes chegam em instantes`);
  emitFishes(world);
  ctx.schedule(6000, () => {
    spawnReplacement(world);
    say("Um novo peixe MINI chegou ao lago");
    emitFishes(world);
  });
}

function medicateFish(ctx: GameContext, fid: number): void {
  const { world, state } = ctx;
  const fish = world.fishes.find((f) => f.fid === fid);
  if (!fish || !fish.sick) return;
  const snap = state.getSnapshot();
  if (snap.remedios > 0) {
    state.patch({ remedios: snap.remedios - 1 });
    fish.sick = false;
    say(`${fishName(fish.variant, fish.fid)} curado com o remédio do estoque!`);
    emitFishes(world);
    return;
  }
  if (snap.coins < MED_PRICE) {
    say(`Remédio custa ◎${MED_PRICE} — venda peixes adultos para juntar moedas`);
    return;
  }
  state.patch({ coins: snap.coins - MED_PRICE });
  fish.sick = false;
  say(`${fishName(fish.variant, fish.fid)} curado! (−◎${MED_PRICE})`);
  emitFishes(world);
}

function buyRemedy(ctx: GameContext): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.coins < MED_PRICE) {
    say(`Remédio custa ◎${MED_PRICE} — venda peixes adultos para juntar moedas`);
    return;
  }
  state.patch({ coins: snap.coins - MED_PRICE, remedios: snap.remedios + 1 });
  say(`Remédio +1 no estoque (−◎${MED_PRICE}) — toque no peixe doente para aplicar`);
}

function buyScenery(ctx: GameContext, id: string): void {
  const { state } = ctx;
  const item = SCENERY_BY_ID[id];
  const snap = state.getSnapshot();
  if (!item || snap.bought.includes(id)) return;
  if (snap.collection.length < item.req) {
    say(`★ Colete ${item.req} ${item.req === 1 ? "espécie" : "espécies"} para desbloquear esta peça — você tem ${snap.collection.length}`);
    return;
  }
  if (snap.coins < item.price) {
    say(`◎${item.price} necessários — venda peixes adultos (◎${SELL_PRICE} cada)`);
    return;
  }
  const bought = [...snap.bought, id];
  state.patch({ coins: snap.coins - item.price, bought });
  gameBus.events.emit("scenery:changed", { bought });
  say(`${item.label} instalado no lago! (−◎${item.price})`);
}

function claimDaily(ctx: GameContext): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.rewardClaimed) return;
  state.patch({
    rewardClaimed: true,
    coins: snap.coins + ECONOMY.dailyReward.coins,
    food: snap.food + ECONOMY.dailyReward.rations,
  });
  say(`Recompensa diária: +${ECONOMY.dailyReward.coins} moedas`);
}

function claimMission(ctx: GameContext): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.missionClaimed || snap.missionFed < MISSION_GOAL) return;
  state.patch({ missionClaimed: true, coins: snap.coins + MISSION_REWARD });
  say(`Missão cumprida: +${MISSION_REWARD} moedas Koi`);
}

function setFeed(ctx: GameContext, feed: "comum" | "premium"): void {
  const { state } = ctx;
  if (feed === "premium") {
    if (state.getSnapshot().premiumCount > 0) {
      state.patch({ feedSel: "premium" });
      say("Ração premium selecionada — cresce em 2/7 jogadas");
      return;
    }
    if (buyPremium(ctx)) state.patch({ feedSel: "premium" });
    return;
  }
  state.patch({ feedSel: "comum" });
  say("Ração comum: grátis, cresce em 3/10 jogadas");
}

// ===================== registro dos comandos =====================
export function registerActions(ctx: GameContext): () => void {
  const offs = [
    gameBus.commands.on("aim:start", () => {
      const snap = ctx.state.getSnapshot();
      if (ECONOMY.paywallEnabled && snap.food <= 0) return;
      if (snap.feedSel === "premium" && snap.premiumCount <= 0) {
        say("Sem ração premium — compre por ◎30 no seletor de ração");
        return;
      }
      ctx.world.aiming = true;
      say("Os peixes próximos já estão de olho…");
    }),
    gameBus.commands.on("aim:cancel", () => { ctx.world.aiming = false; }),
    gameBus.commands.on("aim:end", ({ x, y }) => releaseFood(ctx, x, y)),
    gameBus.commands.on("tap", ({ x, y }) => tapSelect(ctx, x, y)),
    gameBus.commands.on("select-fish", ({ fid }) => ctx.state.patch({ selectedFid: fid })),
    gameBus.commands.on("sell-fish", ({ fid }) => sellFish(ctx, fid)),
    gameBus.commands.on("medicate-fish", ({ fid }) => medicateFish(ctx, fid)),
    gameBus.commands.on("buy-scenery", ({ id }) => buyScenery(ctx, id)),
    gameBus.commands.on("buy-premium", () => buyPremium(ctx)),
    gameBus.commands.on("buy-remedy", () => buyRemedy(ctx)),
    gameBus.commands.on("claim-daily", () => claimDaily(ctx)),
    gameBus.commands.on("claim-mission", () => claimMission(ctx)),
    gameBus.commands.on("set-feed", ({ feed }) => setFeed(ctx, feed)),
  ];
  return () => offs.forEach((off) => off());
}
