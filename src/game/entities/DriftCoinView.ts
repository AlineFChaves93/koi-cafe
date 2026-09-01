import Phaser from "phaser";
import { COIN_KEY } from "../scenes/BootScene";
import type { DriftCoin } from "../types";

// na superfície: acima da água (0) e dos peixes submersos (1), atrás de
// qualquer peça de cenário (z ≥ 3) — a correnteza passa por baixo da margem
export const DRIFT_COIN_DEPTH = 2;

// Moeda da correnteza: disco dourado deitado no plano da água — achatado na
// mesma razão das ondas/sombras (2:1) — com sombra de contato, boiando sobre
// uma ripple. A posição vem do mundo; a view só empresta o balanço, o pop de
// entrada e a saída.
const COIN_WIDTH = 34;
const WATER_SQUASH = 0.5;

export class DriftCoinView {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly ripple: Phaser.GameObjects.Sprite;
  private readonly reduced: boolean;

  constructor(scene: Phaser.Scene, coin: DriftCoin, reduced: boolean) {
    this.scene = scene;
    this.reduced = reduced;
    this.ripple = scene.add.sprite(0, 4, "fx-ripple").setAlpha(0.45).setDisplaySize(76, 38);
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x143a4a, 0.3);
    shadow.fillEllipse(0, 7, COIN_WIDTH * 0.86, COIN_WIDTH * WATER_SQUASH * 0.82);
    const disc = scene.add
      .sprite(0, 0, COIN_KEY)
      .setDisplaySize(COIN_WIDTH, COIN_WIDTH * WATER_SQUASH);
    this.root = scene.add
      .container(coin.x, coin.y, [this.ripple, shadow, disc])
      .setDepth(DRIFT_COIN_DEPTH);

    if (reduced) return;
    // pop de entrada, como os grãos de ração
    scene.tweens.add({
      targets: this.root,
      scale: { from: 0.3, to: 1 },
      duration: 320,
      ease: "Back.Out",
    });
    // ripple respirando devagar sob a moeda
    scene.tweens.add({
      targets: this.ripple,
      scale: { from: 0.9, to: 1.12 },
      alpha: { from: 0.45, to: 0.2 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  sync(coin: DriftCoin, time: number): void {
    const bob = this.reduced ? 0 : Math.sin(time * 0.0035) * 2;
    this.root.setPosition(coin.x, coin.y + bob);
  }

  // resgatada: estufa e some já coberta pela fonte de moedas
  pop(): void {
    if (this.reduced) {
      this.destroy();
      return;
    }
    this.scene.tweens.killTweensOf(this.ripple);
    this.scene.tweens.add({
      targets: this.root,
      scale: 1.4,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => this.destroy(),
    });
  }

  // cruzou o lago sem resgate: afunda na correnteza
  sink(): void {
    if (this.reduced) {
      this.destroy();
      return;
    }
    this.scene.tweens.killTweensOf(this.ripple);
    this.scene.tweens.add({
      targets: this.root,
      scale: 0.4,
      alpha: 0,
      y: this.root.y + 10,
      duration: 480,
      ease: "Sine.In",
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.killTweensOf(this.ripple);
    this.root.destroy();
  }
}
