// Command handlers: everything the player can DO, ported from the old React
// handlers. Commands come in on the bus; effects go out as world mutations,
// GameState patches and bus events. Timers run through an injected scheduler
// so the real game uses the Phaser clock and tests can stub it.
import {
  BUCKET_PRICE, COMMON_RATION_PRICE, DAILY_LIMIT, DRIFT_COIN, ECONOMY, PREMIUM_PRICE,
  RATION_BUCKET, STAGE_MEDIO, STAGE_ADULTO,
} from "../data/economy";
import {
  LEVEL_COMMON_FEED_REWARD, LEVEL_PREMIUM_FEED_REWARD, SCENERY_BY_ID,
  completedLevels, nextScenery, rewardForLevel,
} from "../data/scenery";
import { FISH_OFFER_BY_VARIANT, fishRequirementProgress, sellPriceFor } from "../data/fishShop";
import { KOI_VARIANTS } from "../data/variants";
import { gameBus } from "../events";
import { makeT, sceneryName, stageName, variantName, type StringKey } from "../i18n";
import type { GameState } from "../state/GameState";
import { fishName, fishPriceFor, medPriceFor, progText, stageOf } from "./economy";
import { clampToWater, findFishNear, scatterPellets, sicknessVictim } from "./feeding";
import { collectDriftCoin } from "./driftCoin";
import { spawnPurchasedFish } from "./fishSim";
import type { FeedChoice, Fish, FishView, SimWorld } from "../types";

const MISSION_GOAL = ECONOMY.mission.goal;
const MISSION_REWARD = ECONOMY.mission.rewardCoins;

export type GameContext = {
  world: SimWorld;
  state: GameState;
  schedule: (delayMs: number, fn: () => void) => void;
};

const fishViews = (world: SimWorld): FishView[] =>
  world.fishes.map((f) => ({ fid: f.fid, variant: f.variant, progress: f.progress, sick: f.sick }));

const emitFishes = (world: SimWorld) => gameBus.events.emit("fishes:changed", { fishes: fishViews(world) });
const say = (text: string) => gameBus.events.emit("message", { text });
// mensagem flutuante já traduzida no idioma escolhido nas configurações
const sayT = (ctx: GameContext, key: StringKey, params?: Record<string, string | number>) =>
  say(makeT(ctx.state.getSnapshot().idioma)(key, params));

function buyCommon(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.coins < COMMON_RATION_PRICE) {
    sayT(ctx, "msg.noCoinsHandful", { price: COMMON_RATION_PRICE });
    return false;
  }
  state.patch({ coins: snap.coins - COMMON_RATION_PRICE, food: snap.food + 1 });
  sayT(ctx, "msg.boughtHandful", { price: COMMON_RATION_PRICE });
  return true;
}

function buyBucket(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.coins < BUCKET_PRICE) {
    sayT(ctx, "msg.noCoinsBucket", { price: BUCKET_PRICE });
    return false;
  }
  state.patch({ coins: snap.coins - BUCKET_PRICE, food: snap.food + RATION_BUCKET });
  sayT(ctx, "msg.boughtBucket", { count: RATION_BUCKET, price: BUCKET_PRICE });
  return true;
}

function buyPremium(ctx: GameContext): boolean {
  const { state } = ctx;
  if (state.getSnapshot().coins < PREMIUM_PRICE) {
    sayT(ctx, "msg.noCoinsPremium", { price: PREMIUM_PRICE });
    return false;
  }
  state.patch({
    coins: state.getSnapshot().coins - PREMIUM_PRICE,
    premiumCount: state.getSnapshot().premiumCount + 1,
  });
  sayT(ctx, "msg.boughtPremium", { price: PREMIUM_PRICE });
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
    sayT(ctx, "msg.bucketEmptyTomorrow");
    return false;
  }
  ctx.state.patch({ food: DAILY_LIMIT });
  // adiada para não ser engolida pela mensagem de mira que vem logo em seguida
  ctx.schedule(250, () => sayT(ctx, "msg.bucketRenewed", { count: DAILY_LIMIT }));
  return true;
}

function releaseFood(ctx: GameContext, xPct: number, yPct: number): void {
  const { world, state } = ctx;
  let snap = state.getSnapshot();
  if (!world.aiming) return;
  const t = makeT(snap.idioma);
  const usingPremium = snap.feedSel === "premium";
  if (usingPremium) {
    if (snap.premiumCount <= 0) {
      say(t("msg.noPremiumBuy", { price: PREMIUM_PRICE }));
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
    ctx.schedule(900, () => sayT(ctx, "msg.premiumRanOutConsole"));
  }

  scatterPellets(world, spot, usingPremium ? "premium" : "comum", throwId);

  for (const f of world.fishes) {
    if (Math.hypot(f.x - spot.x, f.y - spot.y) < Math.min(world.w, world.h) * 0.42) f.burst = 1;
  }
  world.aiming = false;
  gameBus.events.emit("feed:thrown", { xPct: (spot.x / world.w) * 100, yPct: (spot.y / world.h) * 100, premium: usingPremium });

  if (targetFish) {
    const stage = stageOf(targetFish.progress);
    const prog = stage === 2 ? stageName(snap.idioma, 2) : `${progText(targetFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}`;
    say(t(usingPremium ? "msg.feedAimedPremium" : "msg.feedAimedCommon", {
      fish: fishName(targetFish.variant, targetFish.fid),
      prog,
      sick: targetFish.sick ? t("msg.feedSickSuffix") : "",
    }));
  } else {
    sayT(ctx, "msg.feedSchool");
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
      ? t("msg.sickHintStock")
      : t("msg.sickHintBuy", { price: medPriceFor(snap.bought) });
    ctx.schedule(1200, () => say(t("msg.fishGotSick", { fish: fishName(caught.variant, caught.fid), hint })));
    emitFishes(world);
  }

  ctx.schedule(1750, () => say(missionReady
    ? t("msg.missionReady", { coins: MISSION_REWARD })
    : t("msg.holdToAimHint")));
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
    sayT(ctx, "msg.medicinePrice", { price });
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
    sayT(ctx, "msg.releaseOnSick");
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
  state.patch({
    coins: snap.coins + DRIFT_COIN.value,
    leaderboardDriftCoins: snap.leaderboardDriftCoins + 1,
  });
  gameBus.events.emit("coin:collected", { x: grabbed.x, y: grabbed.y, amount: DRIFT_COIN.value });
  gameBus.events.emit("wallet:flare", { amount: DRIFT_COIN.value });
  sayT(ctx, "msg.coinCollected", { amount: DRIFT_COIN.value });
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
    const lang = state.getSnapshot().idioma;
    const t = makeT(lang);
    const stage = stageOf(best.progress);
    say(stage === 2
      ? t("msg.fishAdult", {
          fish: fishName(best.variant, best.fid), stage: stageName(lang, 2), price: sellPriceFor(best.variant),
        })
      : t("msg.fishSelected", {
          fish: fishName(best.variant, best.fid), stage: stageName(lang, stage),
          progress: progText(best.progress), goal: stage === 0 ? STAGE_MEDIO : STAGE_ADULTO,
          sick: best.sick ? t("msg.fishNeedsMedicineSuffix") : "",
        }));
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
  const leaderboardSoldByVariant = [...snap.leaderboardSoldByVariant];
  leaderboardSoldByVariant[fish.variant] = (leaderboardSoldByVariant[fish.variant] ?? 0) + 1;
  state.patch({
    selectedFid: null,
    coins: snap.coins + price,
    totalSold: snap.totalSold + 1,
    leaderboardSoldByVariant,
  });
  gameBus.events.emit("fish:sold", { x: fish.x, y: fish.y, amount: price });
  gameBus.events.emit("wallet:flare", { amount: price });
  sayT(ctx, "msg.fishSold", { fish: fishName(fish.variant, fish.fid), price });
  emitFishes(world);
}

function buyFish(ctx: GameContext, variant: number): void {
  const { world, state } = ctx;
  const offer = FISH_OFFER_BY_VARIANT[variant];
  const snap = state.getSnapshot();
  if (!offer || !KOI_VARIANTS[variant]) return;
  const lang = snap.idioma;
  const t = makeT(lang);
  const requirement = fishRequirementProgress(offer.requirement, snap, world.fishes.length, lang);
  if (!requirement.met) {
    say(t("msg.lockedBuy", {
      reason: t(offer.requirement?.kind === "level" ? "msg.lockedLevel" : "msg.lockedCollection"),
      label: requirement.label,
    }));
    return;
  }
  const firstDiscovery = variant !== 0 && !snap.fishUnlocked.includes(variant);
  const fishUnlocked = firstDiscovery ? [...snap.fishUnlocked, variant] : snap.fishUnlocked;
  const price = fishPriceFor(offer, snap.bought);
  if (snap.coins < price) {
    say(t("msg.coinsMissing", { price, missing: price - snap.coins }));
    return;
  }
  const fish = spawnPurchasedFish(world, variant);
  state.patch({ coins: snap.coins - price, fishUnlocked });
  emitFishes(world);
  const name = variantName(lang, KOI_VARIANTS[variant]);
  say(firstDiscovery
    ? t("msg.mysteryRevealed", { name })
    : t("msg.babyArrived", { name, price }));
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
    sayT(ctx, "msg.curedStock", { fish: fishName(fish.variant, fish.fid) });
    gameBus.events.emit("fish:cured", { fid });
    emitFishes(world);
    return;
  }
  const price = medPriceFor(snap.bought);
  if (snap.coins < price) {
    sayT(ctx, "msg.medicinePrice", { price });
    return;
  }
  state.patch({ coins: snap.coins - price });
  fish.sick = false;
  sayT(ctx, "msg.curedBought", { fish: fishName(fish.variant, fish.fid), price });
  gameBus.events.emit("fish:cured", { fid });
  emitFishes(world);
}

function buyRemedy(ctx: GameContext): boolean {
  const { state } = ctx;
  const snap = state.getSnapshot();
  const price = medPriceFor(snap.bought);
  if (snap.coins < price) {
    sayT(ctx, "msg.medicinePrice", { price });
    return false;
  }
  state.patch({ coins: snap.coins - price, remedios: snap.remedios + 1 });
  sayT(ctx, "msg.remedyStocked", { price });
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
    sayT(ctx, "msg.pieceLocked");
    return;
  }
  if (snap.coins < item.price) {
    sayT(ctx, "msg.coinsMissingSell", { price: item.price });
    return;
  }
  const bought = [...snap.bought, id];
  state.patch({ coins: snap.coins - item.price, bought });
  gameBus.events.emit("scenery:changed", { bought });
  sayT(ctx, "msg.newPiece", { name: sceneryName(snap.idioma, item.id), price: item.price });
  grantLevelRewards(ctx, bought);
}

// Ao posicionar a última peça de um nível, entrega ração comum e premium;
// alguns níveis também liberam espécies na loja de peixes.
function grantLevelRewards(ctx: GameContext, bought: string[]): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  const done = completedLevels(bought).filter((level) => !snap.levelRewards.includes(level));
  if (!done.length) return;
  let { food, premiumCount } = snap;
  const levelRewards = [...snap.levelRewards];
  const lang = snap.idioma;
  const t = makeT(lang);
  for (const level of done) {
    levelRewards.push(level);
    food += LEVEL_COMMON_FEED_REWARD;
    premiumCount += LEVEL_PREMIUM_FEED_REWARD;
    const reward = rewardForLevel(level);
    if (reward?.kind === "fish") {
      const names = reward.variants
        .map((variant) => (KOI_VARIANTS[variant] ? variantName(lang, KOI_VARIANTS[variant]) : "?"))
        .join(t("msg.and"));
      say(t(reward.variants.length > 1 ? "msg.levelRewardFeedFishN" : "msg.levelRewardFeedFish1", {
        level, common: LEVEL_COMMON_FEED_REWARD, premium: LEVEL_PREMIUM_FEED_REWARD, names,
      }));
    } else {
      say(t("msg.levelRewardFeed", {
        level, common: LEVEL_COMMON_FEED_REWARD, premium: LEVEL_PREMIUM_FEED_REWARD,
      }));
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
    leaderboardDailyRewards: snap.leaderboardDailyRewards + 1,
  });
  sayT(ctx, "msg.dailyReward", { coins: ECONOMY.dailyReward.coins });
}

function claimMission(ctx: GameContext): void {
  const { state } = ctx;
  const snap = state.getSnapshot();
  if (snap.missionClaimed || snap.missionFed < MISSION_GOAL) return;
  state.patch({
    missionClaimed: true,
    coins: snap.coins + MISSION_REWARD,
    leaderboardMissionRewards: snap.leaderboardMissionRewards + 1,
  });
  sayT(ctx, "msg.missionDone", { coins: MISSION_REWARD });
}

function setFeed(ctx: GameContext, feed: FeedChoice): void {
  const { state } = ctx;
  if (feed === "premium") {
    if (state.getSnapshot().premiumCount > 0) {
      state.patch({ feedSel: "premium" });
      sayT(ctx, "msg.selectedPremium");
      return;
    }
    if (buyPremium(ctx)) state.patch({ feedSel: "premium" });
    return;
  }
  if (feed === "remedio") {
    if (state.getSnapshot().remedios > 0 || buyRemedy(ctx)) {
      state.patch({ feedSel: "remedio" });
      sayT(ctx, "msg.selectedRemedy");
    }
    return;
  }
  state.patch({ feedSel: "comum" });
  sayT(ctx, "msg.selectedCommon");
}

// ===================== registro dos comandos =====================
export function registerActions(ctx: GameContext): () => void {
  const offs = [
    gameBus.commands.on("aim:start", () => {
      const snap = ctx.state.getSnapshot();
      if (snap.feedSel === "remedio") {
        const price = medPriceFor(snap.bought);
        if (snap.remedios <= 0 && snap.coins < price) {
          sayT(ctx, "msg.medicinePrice", { price });
          return;
        }
        ctx.world.aiming = true;
        sayT(ctx, "msg.releaseRemedyAim");
        return;
      }
      if (snap.feedSel === "premium") {
        if (snap.premiumCount > 0) {
          ctx.world.aiming = true;
          sayT(ctx, "msg.fishWatching");
          return;
        }
        // especial acabou: cai para a comum em vez de deixar o botão morto
        sayT(ctx, "msg.premiumRanOutCommon");
        fallBackToCommon(ctx);
      }
      // daqui em diante a seleção é a comum: o estoque que importa é o do balde
      if (!ensureCommonRations(ctx)) return;
      ctx.world.aiming = true;
      sayT(ctx, "msg.fishWatching");
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
