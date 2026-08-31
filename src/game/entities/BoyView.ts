import Phaser from "phaser";
import { BOY_LAYOUT, PLATFORM_LAYOUT, PLATFORM_X_PCT } from "../data/scenery";
import { CHAR_KEYS } from "../scenes/BootScene";
import type { Disc } from "../types";

// Banco de pedra redondo com o menino. A plataforma é o disco de colisão do
// mundo (antes medido do CSS via getBoundingClientRect — agora é dado).
export class BoyView {
  readonly platform: Disc = { x: 0, y: 0, r: 1 };
  private side: "left" | "right" = "right";
  private throwing = false;

  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly bench: Phaser.GameObjects.Image;
  private readonly boy: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene) {
    this.shadow = scene.add.graphics().setDepth(9);
    this.bench = scene.add.image(0, 0, CHAR_KEYS.bench).setDepth(10);
    this.boy = scene.add.image(0, 0, CHAR_KEYS.boySitRight).setDepth(12);
  }

  layout(W: number, H: number): void {
    const spec = PLATFORM_LAYOUT.find((s) => W <= s.maxW) ?? PLATFORM_LAYOUT[PLATFORM_LAYOUT.length - 1];
    const size = Math.min(spec.vw * W, spec.max);
    this.platform.x = (PLATFORM_X_PCT / 100) * W;
    this.platform.y = (spec.topPct / 100) * H;
    this.platform.r = size / 2;

    this.shadow.clear();
    this.shadow.fillStyle(0x143a4a, 0.26);
    this.shadow.fillEllipse(this.platform.x, this.platform.y + size * 0.03, size * 1.04, size * 0.5);

    this.fit(this.bench, this.platform.x, this.platform.y, size, size);

    const f = BOY_LAYOUT.frame;
    const frameSize = (f.sizePct / 100) * size;
    this.frame = {
      left: this.platform.x - size / 2 + (f.leftPct / 100) * size,
      top: this.platform.y - size / 2 + (f.topPct / 100) * size,
      size: frameSize,
    };
    this.applyPose();
  }

  private frame = { left: 0, top: 0, size: 0 };

  setSide(side: "left" | "right"): void {
    if (this.side === side) return;
    this.side = side;
    if (!this.throwing) this.applyPose();
  }

  // menino troca para a pose de arremesso por ~700ms
  startThrow(): void {
    this.throwing = true;
    this.applyPose();
    this.scene.time.delayedCall(700, () => {
      this.throwing = false;
      this.applyPose();
    });
  }

  private applyPose(): void {
    // A caixa da pose sentada é a mesma nos dois lados; só o arremesso tem
    // offsets próprios por lado.
    const pose = this.throwing
      ? this.side === "left" ? BOY_LAYOUT.throwLeft : BOY_LAYOUT.throwRight
      : BOY_LAYOUT.sit;
    const texture = this.throwing
      ? this.side === "left" ? CHAR_KEYS.boyThrowLeft : CHAR_KEYS.boyThrowRight
      : this.side === "left" ? CHAR_KEYS.boySitLeft : CHAR_KEYS.boySitRight;

    const boxSize = (pose.sizePct / 100) * this.frame.size;
    const x = this.frame.left + (pose.leftPct / 100) * this.frame.size + boxSize / 2;
    const y = this.frame.top + (pose.topPct / 100) * this.frame.size + boxSize / 2;
    this.boy.setTexture(texture);
    this.fit(this.boy, x, y, boxSize, boxSize);
  }

  private fit(image: Phaser.GameObjects.Image, cx: number, cy: number, boxW: number, boxH: number): void {
    const natural = image.texture.getSourceImage();
    const aspect = natural.height / natural.width;
    let w = boxW;
    let h = w * aspect;
    if (h > boxH) {
      h = boxH;
      w = h / aspect;
    }
    image.setDisplaySize(w, h);
    image.setPosition(cx, cy);
  }
}
