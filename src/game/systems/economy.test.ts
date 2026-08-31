import { describe, expect, it } from "vitest";
import { growthValue, progText, sizeFactor, stageOf } from "@/game/systems/economy";

describe("economy progression rules", () => {
  it("stages: MINI until 3, MÉDIO until 10, ADULTO at 10", () => {
    expect(stageOf(0)).toBe(0);
    expect(stageOf(2.9)).toBe(0);
    expect(stageOf(3)).toBe(1);
    expect(stageOf(9.9)).toBe(1);
    expect(stageOf(10)).toBe(2);
  });

  it("direct common feed is worth exactly 1 jogada", () => {
    expect(growthValue("comum", true)).toBe(1);
  });

  it("premium is worth 1.5× (médio in 2, adulto in 7)", () => {
    expect(growthValue("premium", true)).toBe(1.5);
  });

  it("school feeding (or stolen bite) is worth 10/14", () => {
    expect(growthValue("comum", false)).toBeCloseTo(10 / 14, 10);
    expect(growthValue("premium", false)).toBeCloseTo(1.5 * (10 / 14), 10);
  });

  it("size grows from 0.78× to 1.05× with progress, capped at ADULTO", () => {
    expect(sizeFactor(0)).toBeCloseTo(0.78);
    expect(sizeFactor(10)).toBeCloseTo(1.05);
    expect(sizeFactor(50)).toBeCloseTo(1.05);
  });

  it("progress renders integers plain and fractions with one decimal", () => {
    expect(progText(1)).toBe("1");
    expect(progText(10)).toBe("10");
    expect(progText(0.7)).toBe("0.7");
    expect(progText(1.4285714)).toBe("1.4");
  });
});
