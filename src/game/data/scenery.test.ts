import { describe, expect, it } from "vitest";
import {
  SCENERY, SCENERY_LEVELS, completedLevels, levelProgress, nextScenery, sceneWidthFor,
} from "@/game/data/scenery";
import { FISH_OFFERS, fishRequirementProgress } from "@/game/data/fishShop";
import { GAME_ASPECT_RATIO, GAME_HEIGHT, GAME_WIDTH, gameScaleFor } from "@/game/viewport";

describe("sceneWidthFor", () => {
  it("keeps the original scale at 16:9", () => {
    expect(sceneWidthFor(1920, 1080)).toBe(1920);
  });

  it("uses a fixed 16:9 authored game world", () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
    expect(GAME_ASPECT_RATIO).toBeCloseTo(16 / 9);
    expect(sceneWidthFor(GAME_WIDTH, GAME_HEIGHT)).toBe(GAME_WIDTH);
  });

  it("uniformly contains the authored stage inside any viewport", () => {
    expect(gameScaleFor(1280, 720)).toBe(1);
    expect(gameScaleFor(1440, 900)).toBeCloseTo(1.125);
    expect(gameScaleFor(1024, 768)).toBeCloseTo(0.8);
    expect(gameScaleFor(812, 375)).toBeCloseTo(375 / 720);
  });

  it("fits the original scene vertically in a short, wide browser viewport", () => {
    expect(sceneWidthFor(1920, 817)).toBeCloseTo(1452.44, 2);
  });

  it("continues using the full width in portrait layouts", () => {
    expect(sceneWidthFor(390, 844)).toBe(390);
  });
});

describe("scenery unlock catalog", () => {
  it("lists every scenery piece in unlock order", () => {
    expect(SCENERY.map((item) => item.id)).toEqual([
      "samambaia-a", "pad-esq",
      "arvore",
      "ponte",
      "cerca-esq",
      "pedras-canto", "fonte-bambu",
      "cerca-dir",
      "tablado", "bacia",
    ]);
  });

  it("groups the pieces into 7 sequential levels with the design prices", () => {
    expect(SCENERY.map((item) => item.level)).toEqual([1, 1, 2, 3, 4, 5, 5, 6, 7, 7]);
    expect(SCENERY.map((item) => item.price)).toEqual([5, 5, 10, 10, 15, 15, 15, 20, 25, 30]);
    expect(SCENERY_LEVELS.map(({ level }) => level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("completes a level only when every piece of it is placed", () => {
    expect(completedLevels([])).toEqual([]);
    expect(completedLevels(["samambaia-a"])).toEqual([]);
    expect(completedLevels(["samambaia-a", "pad-esq"])).toEqual([1]);
    expect(completedLevels(SCENERY.map((item) => item.id))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("unlocks strictly the next piece, even within the same level", () => {
    expect(nextScenery([])?.id).toBe("samambaia-a");
    expect(nextScenery(["samambaia-a"])?.id).toBe("pad-esq");
    expect(nextScenery(["samambaia-a", "pad-esq"])?.id).toBe("arvore");
    expect(nextScenery(SCENERY.map((item) => item.id))).toBeUndefined();
  });

  it("counts level progress for the fish shop requirement", () => {
    expect(levelProgress(1, ["samambaia-a"])).toEqual({ current: 1, total: 2 });
    const state = { bought: ["samambaia-a", "pad-esq"] } as Parameters<typeof fishRequirementProgress>[1];
    const progress = fishRequirementProgress({ kind: "level", level: 1 }, state, 0);
    expect(progress).toMatchObject({ current: 2, target: 2, met: true });
  });

  it("ties four mystery fish to levels and the Tancho to the collection goal", () => {
    const requirements = FISH_OFFERS.slice(1).map((offer) =>
      offer.requirement?.kind === "level" ? offer.requirement.level
        : offer.requirement?.kind === "collection" ? "collection" : null,
    );
    expect(requirements).toEqual([1, 2, 5, 7, "collection"]);
    expect(SCENERY_LEVELS.find(({ level }) => level === 7)?.reward).toEqual({
      kind: "fish",
      variants: [4],
    });
  });
});
