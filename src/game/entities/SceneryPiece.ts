import Phaser from "phaser";
import { sceneWidthFor, type SceneryItem } from "../data/scenery";

const rad = (deg: number) => (deg * Math.PI) / 180;

// Waypoints of the CSS scenery-drift keyframe cycle (px offsets + rotation
// degrees over the piece's own duration).
const FLOAT_PATH: Array<[p: number, dx: number, dy: number, dr: number]> = [
  [0, 0, 0, 0],
  [0.22, 16, 7, 2.5],
  [0.48, 24, -9, -1.5],
  [0.74, -9, 12, 1.5],
  [1, 0, 0, 0],
];

function floatOffset(p: number): { dx: number; dy: number; dr: number } {
  for (let i = 1; i < FLOAT_PATH.length; i++) {
    const [p1, dx1, dy1, dr1] = FLOAT_PATH[i];
    const [p0, dx0, dy0, dr0] = FLOAT_PATH[i - 1];
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0 || 1);
      return { dx: dx0 + (dx1 - dx0) * t, dy: dy0 + (dy1 - dy0) * t, dr: rad(dr0 + (dr1 - dr0) * t) };
    }
  }
  return { dx: 0, dy: 0, dr: 0 };
}

// Uma peça comprada da Loja do Lago, posicionada no leiaute percentual da
// montagem. As animações (floaty/sway/wind) são tweens — portas das
// keyframes CSS originais.
export class SceneryPiece {
  readonly image: Phaser.GameObjects.Image;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly baseRot: number;
  private readonly tweens: Phaser.Tweens.BaseTween[] = [];

  constructor(scene: Phaser.Scene, item: SceneryItem, W: number, H: number, reduced: boolean, reveal = false) {
    const mobile = W <= 820 ? 0.72 : 1;
    const displayWidth = Math.min((item.w / 100) * sceneWidthFor(W, H), item.wmax ?? 10000) * mobile;
    const natural = scene.textures.get(`scenery-${item.id}`).getSourceImage() as HTMLImageElement;
    const displayHeight = displayWidth * (natural.naturalHeight / natural.naturalWidth) * (item.flat ?? 1);

    const cx = (item.x / 100) * W;
    const cy = (item.y / 100) * H;
    const origin = item.sway || item.wind ? parseOrigin(item.origin) : { ox: 0.5, oy: 0.5 };

    this.image = scene.add
      .image(cx, cy, `scenery-${item.id}`)
      .setDepth(item.z ?? 3)
      .setOrigin(origin.ox, origin.oy)
      .setFlipX(item.flipX ?? false)
      .setRotation(rad(item.rot ?? 0));
    this.image.setDisplaySize(displayWidth, displayHeight);
    // Phaser positions an image by its origin. Compensate toward that origin
    // so x/y continue to describe the visual center of the authored piece.
    this.baseX = cx + (origin.ox - 0.5) * displayWidth;
    this.baseY = cy + (origin.oy - 0.5) * displayHeight;
    this.baseRot = rad(item.rot ?? 0);
    this.image.setPosition(this.baseX, this.baseY);

    if (!reduced) {
      if (item.floaty) {
        this.tweens.push(scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: (item.dur ?? 26) * 1000,
          repeat: -1,
          delay: (item.x % 7) * 0.7,
          onUpdate: (tween) => {
            const { dx, dy, dr } = floatOffset(tween.getValue() ?? 0);
            this.image.setPosition(this.baseX + dx, this.baseY + dy);
            this.image.setRotation(this.baseRot + dr);
          },
        }));
      }
      if (item.sway) {
        this.tweens.push(scene.tweens.add({
          targets: this.image,
          rotation: { from: this.baseRot + rad(-3.2), to: this.baseRot + rad(3.2) },
          duration: 5500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        }));
      }
      if (item.wind) {
        this.tweens.push(scene.tweens.add({
          targets: this.image,
          rotation: { from: this.baseRot + rad(-1), to: this.baseRot + rad(1.1) },
          duration: 9500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        }));
      }
    }

    // Revelação da loja: a peça surpresa "pula" para o lago com um pop elástico    // e uma ondulação — a novidade aparece, não apenas é somada.
    if (reveal) {
      const targetScaleX = this.image.scaleX;
      const targetScaleY = this.image.scaleY;
      this.image.setScale(0);
      this.tweens.push(scene.tweens.add({
        targets: this.image,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 700,
        ease: "Back.Out",
      }));
      const ring = scene.add.image(cx, cy, "fx-ripple")
        .setDepth((item.z ?? 3) + 0.2)
        .setDisplaySize(Math.max(displayWidth * 0.8, 90), Math.max(displayWidth * 0.4, 45));
      const ringScaleX = ring.scaleX;
      const ringScaleY = ring.scaleY;
      ring.setScale(ringScaleX * 0.5, ringScaleY * 0.5).setAlpha(0.9);
      scene.tweens.add({
        targets: ring,
        scaleX: ringScaleX * 1.7,
        scaleY: ringScaleY * 1.7,
        alpha: 0,
        duration: 950,
        delay: 250,
        ease: "Quad.Out",
        onComplete: () => ring.destroy(),
      });
    }
  }

  destroy(): void {
    this.tweens.forEach((tween) => tween.remove());
    this.image.destroy();
  }
}

function parseOrigin(origin?: string): { ox: number; oy: number } {
  if (!origin) return { ox: 0.5, oy: 0.5 };
  const [xs, ys] = origin.split(/\s+/);
  return {
    ox: xs?.endsWith("%") ? parseFloat(xs) / 100 : 0.5,
    oy: ys?.endsWith("%") ? parseFloat(ys) / 100 : 0.5,
  };
}
