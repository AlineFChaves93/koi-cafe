import Phaser from "phaser";
import { PELLET_TEXTURES } from "../scenes/BootScene";
import type { FeedKind, WorldPellet } from "../types";

export const PELLET_DEPTH = 28;

export class PelletView {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, feed: FeedKind) {
    this.sprite = scene.add.sprite(0, 0, PELLET_TEXTURES[feed]).setDepth(PELLET_DEPTH);
    // pop de entrada (porta do food-pop CSS): .2 → 1 com leve overshoot
    scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.2, to: 1 },
      duration: 280,
      ease: "Back.Out",
    });
  }

  sync(p: WorldPellet, time: number): void {
    const wob = Math.sin(time * 0.0021 + p.wobble) * 3;
    this.sprite.setPosition(p.x, p.y + wob);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
