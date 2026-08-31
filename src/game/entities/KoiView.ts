import Phaser from "phaser";
import { KOI_VARIANTS } from "../data/variants";
import type { Fish } from "../types";

// Fish canvas sits under the scenery pieces (submerged look), like the old
// z-index 1 canvas layer.
export const FISH_DEPTH = 1;

export class KoiView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private lastAnimKey = "";
  private readonly aspect: number;

  constructor(scene: Phaser.Scene, fish: Fish, aspect: number) {
    this.aspect = aspect;
    this.sprite = scene.add
      .sprite(fish.x, fish.y, `koi-${KOI_VARIANTS[fish.variant].key}`)
      .setDepth(FISH_DEPTH)
      // submerso: alfa deixa a água da cena atravessar o peixe
      .setAlpha(0.8);
  }

  sync(f: Fish): void {
    // turnL plays the turnR row mirrored.
    const base = f.anim === "turnL" ? "turnR" : f.anim;
    const key = `koi-${KOI_VARIANTS[f.variant].key}:${base}`;
    if (key !== this.lastAnimKey) {
      this.lastAnimKey = key;
      this.sprite.play(key);
    }
    this.sprite.setFlipX(f.anim === "turnL");
    this.sprite.setPosition(f.x, f.y);
    // Source fish point north.
    this.sprite.setRotation(f.heading + Math.PI / 2);
    const L = f.renderLen * 1.28;
    this.sprite.setDisplaySize(L, L * this.aspect);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
