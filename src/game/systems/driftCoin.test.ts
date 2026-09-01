import { describe, expect, it } from "vitest";
import { DRIFT_COIN } from "../data/economy";
import { gameBus } from "@/game/events";
import { GameState } from "@/game/state/GameState";
import { registerActions } from "./actions";
import { createWorld } from "./fishSim";
import { collectDriftCoin, nextDriftCoinDelay, spawnDriftCoin, stepDriftCoin } from "./driftCoin";

const worldOf = () => {
  const world = createWorld(false);
  world.w = 1000;
  world.h = 800;
  return world;
};

describe("spawnDriftCoin", () => {
  it("nasce fora da borda, dentro da faixa de água aberta", () => {
    const world = worldOf();
    const ida = spawnDriftCoin(world, () => 0.1); // 0.1 < 0.5 → esquerda→direita
    expect(ida.dir).toBe(1);
    expect(ida.x).toBeLessThan(0);
    expect(ida.yBase).toBeGreaterThanOrEqual(world.h * 0.32);
    expect(ida.yBase).toBeLessThanOrEqual(world.h * 0.78);

    const volta = spawnDriftCoin(world, () => 0.9); // direita→esquerda
    expect(volta.dir).toBe(-1);
    expect(volta.x).toBeGreaterThan(world.w);
  });
});

describe("stepDriftCoin", () => {
  it("atravessa o lago em linha com ondulação e afunda ao sair", () => {
    const world = worldOf();
    const coin = spawnDriftCoin(world, () => 0.25);
    coin.x = 500;
    coin.y = coin.yBase;
    world.driftCoin = coin;

    // da metade do lago até a saída levam ~8 s: aos 5 s ainda está em cena
    for (let i = 0; i < 50; i += 1) stepDriftCoin(world, 0.1, 30);
    expect(world.driftCoin).not.toBeNull();
    for (let i = 0; i < 50 && world.driftCoin; i += 1) {
      stepDriftCoin(world, 0.1, 30);
      if (world.driftCoin) {
        expect(world.driftCoin.y).toBeGreaterThan(world.h * 0.32 - coin.amp - 1);
        expect(world.driftCoin.y).toBeLessThan(world.h * 0.78 + coin.amp + 1);
      }
    }
    expect(world.driftCoin).toBeNull(); // cruzou e afundou bem antes dos 16 s de travessia
  });

  it("respeita a cadência sorteada e nunca empilha moedas", () => {
    const world = worldOf();
    world.driftCoinTimer = nextDriftCoinDelay(30, () => 0.5); // ponto médio da cadência normal

    stepDriftCoin(world, 57, 30);
    expect(world.driftCoin).toBeNull(); // um frame antes da hora

    stepDriftCoin(world, 1, 30);
    expect(world.driftCoin).not.toBeNull();
    const first = world.driftCoin;
    stepDriftCoin(world, 5, 30);
    expect(world.driftCoin).toBe(first); // enquanto uma vive, não nasce outra
  });
});

describe("cadência de resgate (cofre zerado)", () => {
  it("sorteia na cadência curta apenas com exatamente 0 moedas", () => {
    expect(nextDriftCoinDelay(0, () => 0)).toBe(DRIFT_COIN.brokeDelaySeconds[0]);
    expect(nextDriftCoinDelay(0, () => 1)).toBe(DRIFT_COIN.brokeDelaySeconds[1]);
    // com qualquer saldo, por menor que seja, vale a cadência normal
    expect(nextDriftCoinDelay(1, () => 0)).toBe(DRIFT_COIN.delaySeconds[0]);
    expect(nextDriftCoinDelay(0, () => 0.5)).toBeLessThan(nextDriftCoinDelay(1, () => 0.5));
  });

  it("encurta uma espera longa já sorteada quando o cofre zera", () => {
    const world = worldOf();
    world.driftCoinTimer = DRIFT_COIN.delaySeconds[1]; // sorteada com moedas

    stepDriftCoin(world, 0.016, 0); // um frame

    expect(world.driftCoinTimer).toBeCloseTo(DRIFT_COIN.brokeDelaySeconds[1], 1);
  });
});

describe("desvio da plataforma", () => {
  it("contorna a plataforma central com folga quando a rota a cruza", () => {
    const world = worldOf();
    // leiaute real do lago 1280×720: plataforma no meio, r ≈ 157
    world.platform = { x: world.w / 2, y: world.h * 0.54, r: 157 };
    const coin = spawnDriftCoin(world, () => 0.25);
    expect(coin.bypass).not.toBeNull();
    world.driftCoin = coin;

    let closest = Infinity;
    while (world.driftCoin) {
      stepDriftCoin(world, 0.1, 30);
      if (!world.driftCoin) break;
      const c = world.driftCoin;
      closest = Math.min(closest, Math.hypot(c.x - world.platform.x, c.y - world.platform.y));
    }
    // nem a ondulação (já somada no pico do desvio) invade o disco
    expect(closest).toBeGreaterThan(world.platform.r + 10);
  });

  it("não desvia quando a rota já passa limpa da plataforma", () => {
    const world = worldOf();
    world.platform = { x: world.w / 2, y: world.h * 0.1, r: 100 };
    const coin = spawnDriftCoin(world, () => 0.25); // faixa de água fica bem abaixo do disco
    expect(coin.bypass).toBeNull();
  });

  it("o desvio não empurra a moeda para fora da água", () => {
    const world = worldOf();
    world.platform = { x: world.w / 2, y: world.h * 0.54, r: 157 };
    const coin = spawnDriftCoin(world, () => 0.25);
    world.driftCoin = coin;
    while (world.driftCoin) {
      stepDriftCoin(world, 0.1, 30);
      if (!world.driftCoin) break;
      expect(world.driftCoin.y).toBeGreaterThan(world.h * 0.2);
      expect(world.driftCoin.y).toBeLessThan(world.h * 0.9);
    }
  });
});

describe("collectDriftCoin", () => {
  it("pega dentro do raio e devolve a posição; fora, deixa a moeda na água", () => {
    const world = worldOf();
    const coin = spawnDriftCoin(world, () => 0.25);
    coin.x = 500;
    coin.y = 400;
    coin.yBase = 400;
    world.driftCoin = coin;

    expect(collectDriftCoin(world, 500 + DRIFT_COIN.grabRadius - 2, 400))
      .toEqual({ x: 500, y: 400 });
    expect(world.driftCoin).toBeNull();

    world.driftCoin = { ...coin, x: 500, y: 400 };
    expect(collectDriftCoin(world, 500 + DRIFT_COIN.grabRadius + 10, 400)).toBeNull();
    expect(world.driftCoin).not.toBeNull();
  });
});

describe("tap resgata a moeda flutuante", () => {
  it("um toque em cima credita o valor, emite o evento de FX e não credita duas vezes", () => {
    const world = worldOf();
    const state = new GameState();
    const dispose = registerActions({ world, state, schedule: () => {} });
    state.patch({ coins: 0 });
    const coin = spawnDriftCoin(world, () => 0.25);
    coin.x = 500;
    coin.y = 400;
    coin.yBase = 400;
    world.driftCoin = coin;
    const amounts: number[] = [];
    const off = gameBus.events.on("coin:collected", ({ amount }) => amounts.push(amount));

    gameBus.commands.emit("tap", { x: 50, y: 50 }); // (500, 400) no mundo

    expect(world.driftCoin).toBeNull();
    expect(state.getSnapshot().coins).toBe(DRIFT_COIN.value);
    expect(amounts).toEqual([DRIFT_COIN.value]);
    gameBus.commands.emit("tap", { x: 50, y: 50 }); // a moeda já era
    expect(state.getSnapshot().coins).toBe(DRIFT_COIN.value);
    off();
    dispose();
  });
});
