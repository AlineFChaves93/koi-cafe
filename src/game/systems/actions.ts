// Command handlers: everything the player can DO, ported from the old React
// handlers. Commands come in on the bus; effects go out as world mutations,
// GameState patches and bus events. Timers run through an injected scheduler
// so the real game uses the Phaser clock and tests can stub it.
import {
  BUCKET_PRICE, COMMON_RATION_PRICE, DAILY_LIMIT, DRIFT_COIN, ECONOMY, PREMIUM_PRICE, PREMIUM_POT_THROWS,
  RATION_BUCKET, STAGE_MEDIO, STAGE_ADULTO, STAGE_NAMES,
} from "../data/economy";
import { SCENERY_BY_ID, completedLevels, nextScenery, rewardForLevel } from "../data/scenery";
import { FISH_OFFER_BY_VARIANT, fishRequirementProgress, sellPriceFor } from "../data/fishShop";
import { KOI_VARIANTS } from "../data/variants";
import { gameBus } from "../events";
import type { GameState } from "../state/GameState";
import { fishName, fishPriceFor, medPriceFor, progText, stageOf } from "./economy";
import { clampToWater, findFishNear, scatterPellets, sicknessVictim } from "./feeding";
import { collectDriftCoin } from "./driftCoin";
import { spawnPurchasedFish } from "./fishSim";
import type { FeedChoice, Fish, FishView, SimWorld } from "../types";

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

function buyCommon(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.coins < COMMON_RATION_PRICE) {
    say(`Moedas insuficientes — um punhado custa ◎${COMMON_RATION_PRICE}`);
    return false;
  }
  state.patch({ coins: snap.coins - COMMON_RATION_PRICE, food: snap.food + 1 });
  say(`Punhado de ração +1 (−◎${COMMON_RATION_PRICE})`);
  return true;
}

function buyBucket(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.coins < BUCKET_PRICE) {
    say(`Moedas insuficientes — um balde custa ◎${BUCKET_PRICE}`);
    return false;
  }
  state.patch({ coins: snap.coins - BUCKET_PRICE, food: snap.food + RATION_BUCKET });
  say(`Balde de ração +${RATION_BUCKET} porções (−◎${BUCKET_PRICE})`);
  return true;
}

function buyPremium(ctx: GameContext): boolean {
  const { state } = ctx;
  if (state.getSnapshot().coins < PREMIUM_PRICE) {
    say(`Moedas insuficientes — ração especial custa ◎${PREMIUM_PRICE}`);
    return false;
  }
  state.patch({
    coins: state.getSnapshot().coins - PREMIUM_PRICE,
    premiumCount: state.getSnapshot().premiumCount + 1,
  });
  say(`Ração especial +1 (−◎${PREMIUM_PRICE}) • baby fish vira médio em 1 porção • peixes não adoecem`);
  return true;
}

// ===================== arremesso de ração =====================
// O console nunca pode ficar "morto": quando o item escolhido acaba, a seleção
// volta sozinha para a ração comum e o contorno acompanha.
function fallBackToCommon(ctx: GameContext): void {
  if (ctx.state.getSnapshot().feedSel === "comum") return;
  ctx.state.patch({ feedSel: "comum" });
}

// Balde do dia: com o paywall desligado a ração é o balde gratuito — quando
// as porções acabam, o balde renova na hora e a alimentação nunca trava.
// Com o paywall ligado vale o limite diário: acabou, espera o dia virar.
function ensureCommonRations(ctx: GameContext): boolean {
  const snap = ctx.state.getSnapshot();
  if (snap.food > 0) return true;
  if (ECONOMY.paywallEnabled) {
    say("O balde de ração acabou — você ganha um novo amanhã");
    return false;
  }
  ctx.state.patch({ food: DAILY_LIMIT });
  // adiada para não ser engolida pela mensagem de mira que vem logo em seguida
  ctx.schedule(250, () => say(`Balde do dia renovado: +${DAILY_LIMIT} porções de ração`));
  return true;
}

function releaseFood(ctx: GameContext, xPct: number, yPct: number): void {
  const { world, state } = ctx;
  let snap = state.getSnapshot();
  if (!world.aiming) return;
  const usingPremium = snap.feedSel === "premium";
  if (usingPremium) {
    if (snap.premiumCount <= 0) {
      say(`Sem ração especial — compre por ◎${PREMIUM_PRICE} na Loja Koi`);
      world.aiming = false;
      fallBackToCommon(ctx);
      return;
    }
  } else if (snap.food <= 0) {
    if (!ensureCommonRations(ctx)) {
      world.aiming = false;
      return;
    }
    snap = state.getSnapshot();
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
    food: usingPremium ? snap.food : snap.food - 1,
    premiumCount: usingPremium ? snap.premiumCount - 1 : snap.premiumCount,
    totalFed: snap.totalFed + 1,
    missionFed: Math.min(MISSION_GOAL, snap.missionFed + 1),
  });
  state.addXp(ECONOMY.wallet.xpPerFeed);
  if (usingPremium && snap.premiumCount - 1 <= 0) {
    fallBackToCommon(ctx);
    ctx.schedule(900, () => say("Ração especial acabou — o console voltou para a comum"));
  }

  scatterPellets(world, spot, usingPremium ? "premium" : "comum", throwId);

  for (const f of world.fishes) {
    if (Math.hypot(f.x - spot.x, f.y - spot.y) < Math.min(world.w, world.h) * 0.42) f.burst = 1;
  }
  world.aiming = false;
  gameBus.events.emit("feed:thrown", { xPct: (spot.x / world.w) * 100, yPct: (spot.y / world.h) * 100, premium: usingPremium });

  if (targetFish) {
    const stage = stageOf(targetFish.progress);
    const prog = stage === 2 ? STAGE_NAMES[2] : `${progText(targetFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}`;
    say(`Ração ${usingPremium ? "especial " : ""}para ${fishName(targetFish.variant, targetFish.fid)} (${prog})${targetFish.sick ? " • 🍼 DOENTE — dê a mamadeira para curar" : ""}`);
  } else {
    say("Ração ao cardume • crescimento mais lento (+3 jogadas)");
  }

  // ração especial não adoece os peixes — só a comum alimenta o ciclo: a cada
  // 4 arremessos, um peixe adoece, seja baby, médio ou grande
  let victim: Fish | null = null;
  if (!usingPremium) {
    world.comumThrows += 1;
    victim = sicknessVictim(world);
  }
  if (victim) {
    const caught: Fish = victim;
    caught.sick = true;
    const hint = snap.remedios > 0
      ? "Toque nele e dê a mamadeira do estoque (essa é grátis!)"
      : `Toque nele e dê a mamadeira (◎${medPriceFor(snap.bought)})`;
    ctx.schedule(1200, () => say(`${fishName(caught.variant, caught.fid)} ficou DOENTE! ${hint}`));
    emitFishes(world);
  }

  ctx.schedule(1750, () => say(missionReady ? "Missão pronta! Resgate +25 moedas" : DEFAULT_HINT));
}

// mamadeira pelo botão central: solta a mira perto de um peixe doente e o
// menino arremessa a mamadeira até ele (a cena anima e aplica a cura)
function releaseRemedy(ctx: GameContext, xPct: number, yPct: number): void {
  const { world, state } = ctx;
  if (!world.aiming) return;
  world.aiming = false;
  const snap = state.getSnapshot();
  const price = medPriceFor(snap.bought);
  if (snap.remedios <= 0 && snap.coins < price) {
    say(`Mamadeira custa ◎${price} — venda peixes grandes para juntar moedas`);
    return;
  }
  const px = (xPct / 100) * world.w;
  const py = (yPct / 100) * world.h;
  const captureR = Math.min(world.w, world.h) * 0.13;
  let sick: Fish | null = null;
  let sickD = Infinity;
  for (const f of world.fishes) {
    if (!f.sick) continue;
    const d = Math.hypot(f.x - px, f.y - py);
    if (d < captureR && d < sickD) {
      sick = f;
      sickD = d;
    }
  }
  if (!sick) {
    say("Solte a mamadeira sobre um peixe doente");
    return;
  }
  gameBus.events.emit("remedy:thrown", { fid: sick.fid, x: sick.x, y: sick.y });
}

// moeda da correnteza: o toque nela tem prioridade sobre a seleção de peixe
function tryCollectDriftCoin(ctx: GameContext, xPct: number, yPct: number): boolean {
  const { world, state } = ctx;
  if (!world.w) return false;
  const grabbed = collectDriftCoin(world, (xPct / 100) * world.w, (yPct / 100) * world.h);
  if (!grabbed) return false;
  const snap = state.getSnapshot();
  state.patch({ coins: snap.coins + DRIFT_COIN.value });
  gameBus.events.emit("coin:collected", { x: grabbed.x, y: grabbed.y, amount: DRIFT_COIN.value });
  gameBus.events.emit("wallet:flare", { amount: DRIFT_COIN.value });
  say(`Moeda pescada da correnteza! +◎${DRIFT_COIN.value}`);
  return true;
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
      ? `${fishName(best.variant, best.fid)} está ${STAGE_NAMES[2]} — pronto para vender por ◎${sellPriceFor(best.variant)}`
      : `${fishName(best.variant, best.fid)}: ${STAGE_NAMES[stage]} • ${progText(best.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO} porções${best.sick ? " • 🍼 precisa de mamadeira" : ""}`);
  } else {
    state.patch({ selectedFid: null });
  }
}

// venda: só peixes GRANDES; espécies mais raras sustentam margens maiores.
function sellFish(ctx: GameContext, fid: number): void {
  const { world, state } = ctx;
  const idx = world.fishes.findIndex((f) => f.fid === fid);
  if (idx < 0) return;
  const fish = world.fishes[idx];
  if (stageOf(fish.progress) < 2) return;
  const price = sellPriceFor(fish.variant);
  world.fishes.splice(idx, 1);
  const snap = state.getSnapshot();
  state.patch({ selectedFid: null, coins: snap.coins + price, totalSold: snap.totalSold + 1 });
  gameBus.events.emit("fish:sold", { x: fish.x, y: fish.y, amount: price });
  gameBus.events.emit("wallet:flare", { amount: price });
  say(`${fishName(fish.variant, fish.fid)} vendido por ◎${price}! Use as moedas para escolher seu próximo peixe`);
  emitFishes(world);
}

function buyFish(ctx: GameContext, variant: number): void {
  const { world, state } = ctx;
  const offer = FISH_OFFER_BY_VARIANT[variant];
  const snap = state.getSnapshot();
  if (!offer || !KOI_VARIANTS[variant]) return;
  const requirement = fishRequirementProgress(offer.requirement, snap, world.fishes.length);
  if (!requirement.met) {
    say(`🔒 ${offer.requirement?.kind === "level" ? "Nível incompleto" : "Conquista necessária"}: ${requirement.label}`);
    return;
  }
  const firstDiscovery = variant !== 0 && !snap.fishUnlocked.includes(variant);
  const fishUnlocked = firstDiscovery ? [...snap.fishUnlocked, variant] : snap.fishUnlocked;
  const price = fishPriceFor(offer, snap.bought);
  if (snap.coins < price) {
    say(`◎${price} necessários — faltam ◎${price - snap.coins}`);
    return;
  }
  const fish = spawnPurchasedFish(world, variant);
  state.patch({ coins: snap.coins - price, fishUnlocked });
  emitFishes(world);
  say(firstDiscovery
    ? `✨ Mistério revelado: ${KOI_VARIANTS[variant].name}! Um baby fish chegou ao lago`
    : `${KOI_VARIANTS[variant].name} baby fish chegou ao lago (−◎${price})`);
  gameBus.events.emit("fish:bought", { x: fish.x, y: fish.y });
}

function medicateFish(ctx: GameContext, fid: number): void {
  const { world, state } = ctx;
  const fish = world.fishes.find((f) => f.fid === fid);
  if (!fish || !fish.sick) return;
  const snap = state.getSnapshot();
  if (snap.remedios > 0) {
    state.patch({ remedios: snap.remedios - 1 });
    if (snap.remedios - 1 <= 0) fallBackToCommon(ctx);
    fish.sick = false;
    say(`${fishName(fish.variant, fish.fid)} curado com a mamadeira do estoque!`);
    gameBus.events.emit("fish:cured", { fid });
    emitFishes(world);
    return;
  }
  const price = medPriceFor(snap.bought);
  if (snap.coins < price) {
    say(`Mamadeira custa ◎${price} — venda peixes grandes para juntar moedas`);
    return;
  }
  state.patch({ coins: snap.coins - price });
  fish.sick = false;
  say(`${fishName(fish.variant, fish.fid)} curado com a mamadeira! (−◎${price})`);
  gameBus.events.emit("fish:cured", { fid });
  emitFishes(world);
}

function buyRemedy(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  const price = medPriceFor(snap.bought);
  if (snap.coins < price) {
    say(`Mamadeira custa ◎${price} — venda peixes grandes para juntar moedas`);
    return false;
  }
  state.patch({ coins: snap.coins - price, remedios: snap.remedios + 1 });
  say(`Mamadeira +1 no estoque (−◎${price}) — mire no peixe doente e solte para curar`);
  return true;
}

function buyScenery(ctx: GameContext, id: string): void {
  const { state } = ctx;
  const item = SCENERY_BY_ID[id];
  const snap = state.getSnapshot();
  if (!item || snap.bought.includes(id)) return;
  // desbloqueio sequencial: só a próxima peça da ordem pode ser comprada —
  // comprar e posicionar a anterior destrava a seguinte, mesmo no mesmo nível
  if (nextScenery(snap.bought)?.id !== id) {
    say("🔒 Compre e posicione a peça anterior do lago para destravar esta");
    return;
  }
  if (snap.coins < item.price) {
    say(`◎${item.price} necessários — venda peixes grandes para juntar moedas`);
    return;
  }
  const bought = [...snap.bought, id];
  state.patch({ coins: snap.coins - item.price, bought });
  gameBus.events.emit("scenery:changed", { bought });
  say(`✨ Novidade no lago: ${item.label}! (−◎${item.price})`);
  grantLevelRewards(ctx, bought);
}

// Ao posicionar a última peça de um nível, entrega a recompensa dele: espécies
// liberadas na loja de peixes, baldes de ração comum ou potes de ração especial.
function grantLevelRewards(ctx: GameContext, bought: string[]): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  const done = completedLevels(bought).filter((level) => !snap.levelRewards.includes(level));
  if (!done.length) return;
  let { food, premiumCount } = snap;
  const levelRewards = [...snap.levelRewards];
  for (const level of done) {
    levelRewards.push(level);
    const reward = rewardForLevel(level);
    if (!reward) continue;
    if (reward.kind === "rations") {
      const portions = reward.buckets * RATION_BUCKET;
      food += portions;
      say(`🎁 Nível ${level} completo: +${reward.buckets} ${reward.buckets === 1 ? "balde" : "baldes"} de ração (+${portions} porções)`);
    } else if (reward.kind === "premium") {
      const throwsCount = reward.pots * PREMIUM_POT_THROWS;
      premiumCount += throwsCount;
      say(`🎁 Nível ${level} completo: +${reward.pots} ${reward.pots === 1 ? "pote" : "potes"} de ração especial (+${throwsCount} arremessos premium)`);
    } else {
      const names = reward.variants.map((variant) => KOI_VARIANTS[variant]?.name ?? "?").join(" e ");
      say(`🎁 Nível ${level} completo: ${names} ${reward.variants.length > 1 ? "disponíveis" : "disponível"} na loja de peixes!`);
    }
  }
  state.patch({ levelRewards, food, premiumCount });
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

function setFeed(ctx: GameContext, feed: FeedChoice): void {
  const { state } = ctx;
  if (feed === "premium") {
    if (state.getSnapshot().premiumCount > 0) {
      state.patch({ feedSel: "premium" });
      say("Ração especial selecionada — 1 porção vira o peixe médio • não adoece");
      return;
    }
    if (buyPremium(ctx)) state.patch({ feedSel: "premium" });
    return;
  }
  if (feed === "remedio") {
    if (state.getSnapshot().remedios > 0 || buyRemedy(ctx)) {
      state.patch({ feedSel: "remedio" });
      say("Mamadeira selecionada — segure, mire no peixe doente e solte");
    }
    return;
  }
  state.patch({ feedSel: "comum" });
  say("Ração comum: 3 porções viram médio • +5 viram grande");
}

// ===================== registro dos comandos =====================
export function registerActions(ctx: GameContext): () => void {
  const offs = [
    gameBus.commands.on("aim:start", () => {
      const snap = ctx.state.getSnapshot();
      if (snap.feedSel === "remedio") {
        const price = medPriceFor(snap.bought);
        if (snap.remedios <= 0 && snap.coins < price) {
          say(`Mamadeira custa ◎${price} — venda peixes grandes para juntar moedas`);
          return;
        }
        ctx.world.aiming = true;
        say("Solte a mamadeira em cima do peixe doente");
        return;
      }
      if (snap.feedSel === "premium") {
        if (snap.premiumCount > 0) {
          ctx.world.aiming = true;
          say("Os peixes próximos já estão de olho…");
          return;
        }
        // especial acabou: cai para a comum em vez de deixar o botão morto
        say("Ração especial acabou — usando a comum");
        fallBackToCommon(ctx);
      }
      // daqui em diante a seleção é a comum: o estoque que importa é o do balde
      if (!ensureCommonRations(ctx)) return;
      ctx.world.aiming = true;
      say("Os peixes próximos já estão de olho…");
    }),
    gameBus.commands.on("aim:move", ({ x, y }) => {
      ctx.world.aim = {
        x: (x / 100) * ctx.world.w,
        y: (y / 100) * ctx.world.h,
      };
    }),
    gameBus.commands.on("aim:cancel", () => { ctx.world.aiming = false; }),
    gameBus.commands.on("aim:end", ({ x, y }) => {
      if (ctx.state.getSnapshot().feedSel === "remedio") releaseRemedy(ctx, x, y);
      else releaseFood(ctx, x, y);
    }),
    gameBus.commands.on("tap", ({ x, y }) => {
      if (tryCollectDriftCoin(ctx, x, y)) return;
      tapSelect(ctx, x, y);
    }),
    gameBus.commands.on("select-fish", ({ fid }) => ctx.state.patch({ selectedFid: fid })),
    gameBus.commands.on("sell-fish", ({ fid }) => sellFish(ctx, fid)),
    gameBus.commands.on("buy-fish", ({ variant }) => buyFish(ctx, variant)),
    gameBus.commands.on("medicate-fish", ({ fid }) => medicateFish(ctx, fid)),
    gameBus.commands.on("buy-scenery", ({ id }) => buyScenery(ctx, id)),
    gameBus.commands.on("buy-common", () => buyCommon(ctx)),
    gameBus.commands.on("buy-bucket", () => buyBucket(ctx)),
    gameBus.commands.on("buy-premium", () => buyPremium(ctx)),
    gameBus.commands.on("buy-remedy", () => buyRemedy(ctx)),
    gameBus.commands.on("claim-daily", () => claimDaily(ctx)),
    gameBus.commands.on("claim-mission", () => claimMission(ctx)),
    gameBus.commands.on("set-feed", ({ feed }) => setFeed(ctx, feed)),
  ];
  return () => offs.forEach((off) => off());
}
