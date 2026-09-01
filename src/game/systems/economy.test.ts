import { describe, expect, it } from "vitest";
import { FISH_OFFERS } from "@/game/data/fishShop";
import {
  EARLY_GAME_LEVEL, fishPriceFor, growthValue, medPriceFor, progText,
  sceneryLevelOf, sizeFactor, stageOf,
} from "@/game/systems/economy";
import { STAGE_NAMES } from "@/game/data/economy";
import { MAX_LEVEL, SCENERY } from "@/game/data/scenery";

describe("economy progression rules", () => {
  it("stages: BABY FISH until 3, MÉDIO until 8, GRANDE at 8", () => {
    expect(stageOf(0)).toBe(0);
    expect(stageOf(2.9)).toBe(0);
    expect(stageOf(3)).toBe(1);
    expect(stageOf(7.9)).toBe(1);
    expect(stageOf(8)).toBe(2);
    expect(STAGE_NAMES).toEqual(["BABY FISH", "MÉDIO", "GRANDE"]);
  });

  it("direct common feed is worth exactly 1 porção", () => {
    expect(growthValue("comum", true)).toBe(1);
  });

  it("especial feed takes a baby fish straight to MÉDIO (3 = STAGE_MEDIO)", () => {
    expect(growthValue("premium", true)).toBe(3);
  });

  it("school feeding (or stolen bite) is worth 10/14", () => {
    expect(growthValue("comum", false)).toBeCloseTo(10 / 14, 10);
    expect(growthValue("premium", false)).toBeCloseTo(3 * (10 / 14), 10);
  });

  it("size grows from 0.78× to 1.05× with progress, capped at GRANDE", () => {
    expect(sizeFactor(0)).toBeCloseTo(0.78);
    expect(sizeFactor(8)).toBeCloseTo(1.05);
    expect(sizeFactor(50)).toBeCloseTo(1.05);
  });

  it("progress renders integers plain and fractions with one decimal", () => {
    expect(progText(1)).toBe("1");
    expect(progText(8)).toBe("8");
    expect(progText(0.7)).toBe("0.7");
    expect(progText(1.4285714)).toBe("1.4");
  });
});

describe("early-game prices", () => {
  const ids = SCENERY.map((item) => item.id);
  const level = (bought: string[]) => sceneryLevelOf(bought);
  const basicOffer = FISH_OFFERS[0];

  it("lake level follows the next piece of the sequence", () => {
    expect(MAX_LEVEL).toBe(7);
    expect(level([])).toBe(1);
    expect(level(ids.slice(0, 2))).toBe(2); // plantas do nível 1 posicionadas
    expect(level(ids.slice(0, 2 + 1))).toBe(3); // árvore posicionada
    expect(level(ids)).toBe(7); // lago completo
  });

  it("basic baby fish costs ◎2 until level 3 and ◎5 from level 3 on", () => {
    expect(basicOffer.buyPrice).toBe(2);
    expect(EARLY_GAME_LEVEL).toBe(3);
    expect(fishPriceFor(basicOffer, [])).toBe(2);
    expect(fishPriceFor(basicOffer, ids.slice(0, 2))).toBe(2); // ainda no nível 2
    expect(fishPriceFor(basicOffer, ids.slice(0, 3))).toBe(5); // nível 3 atingido
    expect(fishPriceFor(basicOffer, ids)).toBe(5);
  });

  it("other species keep their own price regardless of the lake level", () => {
    const mystery = FISH_OFFERS[1];
    expect(fishPriceFor(mystery, [])).toBe(mystery.buyPrice);
    expect(fishPriceFor(mystery, ids)).toBe(mystery.buyPrice);
  });

  it("mamadeira costs ◎3 at every lake level", () => {
    expect(medPriceFor([])).toBe(3);
    expect(medPriceFor(ids.slice(0, 2))).toBe(3);
    expect(medPriceFor(ids.slice(0, 3))).toBe(3);
    expect(medPriceFor(ids)).toBe(3);
  });
});
