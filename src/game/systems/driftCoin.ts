// Moeda da correnteza: um relógio interno conta até a próxima visita; a moeda
// nasce fora de uma borda, ondula atravessando o lago contornando a plataforma
// central e afunda ao sair. Um toque (comando "tap") resgata o valor — veja
// tryCollectDriftCoin em actions. Camada pura como o resto de systems/: sem
// engine, testável headless.
import { DRIFT_COIN } from "../data/economy";
import type { DriftCoin, SimWorld } from "../types";
import { TAU } from "../types";

// faixa de navegação em água aberta: longe da barra superior e do console
const Y_BAND = { min: 0.32, max: 0.78 } as const;
// borda de nascimento/afundamento, fora da tela (fração do menor lado)
const MARGIN_RATIO = 0.06;
// folga vertical ao contornar a plataforma: meia-altura da moeda + ripple
// + margem, além da ondulação (somada à parte no cálculo)
const BYPASS_CLEARANCE = 28;
// limites que o desvio pode invadir sem colidir com HUD (frações da altura)
const BYPASS_Y = { min: 0.26, max: 0.84 } as const;

const marginOf = (world: SimWorld) => Math.min(world.w, world.h) * MARGIN_RATIO;

export function nextDriftCoinDelay(coins: number, random: () => number = Math.random): number {
  const [min, max] = coins === 0 ? DRIFT_COIN.brokeDelaySeconds : DRIFT_COIN.delaySeconds;
  return min + random() * (max - min);
}

// A plataforma central ocupa o meio do lago — exatamente onde a faixa de
// navegação cruza. Como os peixes (fishSim repele do platform), a correnteza
// contorna o disco: uma curva suave com pico no meridiano da plataforma e
// largura ~1 raio, empurrando a rota para o lado mais próximo da borda.
function planBypass(yBase: number, amp: number, world: SimWorld): DriftCoin["bypass"] {
  const p = world.platform;
  const needed = p.r + BYPASS_CLEARANCE + amp - Math.abs(yBase - p.y);
  if (needed <= 0) return null; // a linha reta já passa limpa
  const roomDown = world.h * BYPASS_Y.max - yBase;
  const roomUp = yBase - world.h * BYPASS_Y.min;
  let sign: 1 | -1 = yBase >= p.y ? 1 : -1; // afasta-se do centro do disco
  let room = sign === 1 ? roomDown : roomUp;
  if (room < needed * 0.5) {
    sign = sign === 1 ? -1 : 1;
    room = sign === 1 ? roomDown : roomUp;
  }
  return { sign, peak: Math.min(needed, room), cx: p.x, sigma: Math.max(p.r, 1) };
}

export function spawnDriftCoin(world: SimWorld, random: () => number = Math.random): DriftCoin {
  const dir: 1 | -1 = random() < 0.5 ? 1 : -1;
  const margin = marginOf(world);
  const yBase = (world.h * (Y_BAND.min + random() * (Y_BAND.max - Y_BAND.min)));
  const amp = Math.min(world.w, world.h) * DRIFT_COIN.bobAmp;
  return {
    x: dir === 1 ? -margin : world.w + margin,
    y: yBase,
    yBase,
    dir,
    age: 0,
    speed: (world.w + margin * 2) / DRIFT_COIN.crossSeconds,
    amp,
    phase: random() * TAU,
    bypass: planBypass(yBase, amp, world),
  };
}

// desvio da correnteza: gaussiana centrada no meridiano da plataforma
const bypassOffset = (coin: DriftCoin): number => {
  if (!coin.bypass) return 0;
  const { sign, peak, cx, sigma } = coin.bypass;
  const dx = coin.x - cx;
  return sign * peak * Math.exp(-(dx * dx) / (2 * sigma * sigma));
};

export function stepDriftCoin(
  world: SimWorld,
  dt: number,
  coins: number,
  random: () => number = Math.random,
): void {
  if (!world.w) return;
  const coin = world.driftCoin;
  if (coin) {
    coin.age += dt;
    coin.x += coin.dir * coin.speed * dt;
    coin.y = coin.yBase + bypassOffset(coin)
      + Math.sin(coin.age * DRIFT_COIN.bobFreq + coin.phase) * coin.amp;
    const off = coin.dir === 1 ? coin.x - world.w : -coin.x;
    if (off > marginOf(world)) world.driftCoin = null; // cruzou: afundou na correnteza
    return;
  }
  // cofre zerado apressa a visita: a espera nunca passa do teto da cadência
  // de resgate, mesmo que o relógio tivesse sido sorteado com moedas no cofre
  if (coins === 0 && world.driftCoinTimer > DRIFT_COIN.brokeDelaySeconds[1]) {
    world.driftCoinTimer = DRIFT_COIN.brokeDelaySeconds[1];
  }
  world.driftCoinTimer -= dt;
  if (world.driftCoinTimer > 0) return;
  world.driftCoin = spawnDriftCoin(world, random);
  world.driftCoinTimer = nextDriftCoinDelay(coins, random);
  world.events.push({ type: "coin:drifted" });
}

// Toque no lago: devolve a posição da moeda quando o ponto cai dentro do raio
// de resgate (generoso para dedo) e a tira da água.
export function collectDriftCoin(
  world: SimWorld,
  px: number,
  py: number,
): { x: number; y: number } | null {
  const coin = world.driftCoin;
  if (!coin) return null;
  if (Math.hypot(coin.x - px, coin.y - py) > DRIFT_COIN.grabRadius) return null;
  world.driftCoin = null;
  return { x: coin.x, y: coin.y };
}
