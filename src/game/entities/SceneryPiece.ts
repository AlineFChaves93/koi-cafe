import Phaser from "phaser";
import { BASIN_POOL_FRAMES, BASIN_POUR_FRAMES, type SceneryItem } from "../data/scenery";

type PieceBox = { cx: number; cy: number; w: number; h: number };

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

// Fonte de bambu: jato de água + brilho de impacto + ondulações.
class StreamFX {
  private objects: Phaser.GameObjects.Sprite[] = [];

  constructor(private scene: Phaser.Scene, box: PieceBox, depth: number, reduced: boolean) {
    const place = (leftPct: number, topPct: number, wPct: number, hPct: number) => ({
      x: box.cx - box.w / 2 + (leftPct / 100) * box.w,
      y: box.cy - box.h / 2 + (topPct / 100) * box.h,
      w: (wPct / 100) * box.w,
      h: (hPct / 100) * box.h,
    });

    const jetSpec = place(35.8, 32.6, 7.2, 29);
    const jet = this.scene.add.sprite(jetSpec.x, jetSpec.y + jetSpec.h / 2, "fx-jet")
      .setDepth(depth).setAlpha(0.78).setRotation(rad(3));
    jet.setDisplaySize(jetSpec.w, jetSpec.h);
    this.objects.push(jet);

    const impactSpec = place(34.4, 59.1, 13, 5.2);
    const impact = this.scene.add.sprite(impactSpec.x, impactSpec.y, "fx-impact")
      .setDepth(depth + 0.1).setAlpha(0.75);
    impact.setDisplaySize(impactSpec.w, impactSpec.h);
    this.objects.push(impact);

    const rippleSpec = place(31.5, 58, 19, 10.5);
    for (const delay of [0, 1350]) {
      const ripple = this.scene.add.sprite(rippleSpec.x, rippleSpec.y, "fx-ripple")
        .setDepth(depth + 0.1).setAlpha(0.75).setScale(0.72);
      ripple.setDisplaySize(rippleSpec.w, rippleSpec.h);
      this.objects.push(ripple);
      if (!reduced) {
        this.scene.tweens.add({
          targets: ripple,
          scale: { from: 0.72, to: 1.16 },
          alpha: { from: 0.75, to: 0 },
          duration: 2800,
          repeat: -1,
          delay,
        });
      }
    }

    if (!reduced) {
      // fluxo do jato: leve pulso de alfa/deriva substituindo o scroll de
      // gradiente do CSS
      this.scene.tweens.add({
        targets: jet,
        alpha: { from: 0.62, to: 0.9 },
        x: jet.x + 1.5,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.scene.tweens.add({
        targets: impact,
        scale: { from: impact.scaleX * 0.86, to: impact.scaleX * 1.12 },
        alpha: { from: 0.58, to: 0.92 },
        duration: 1050,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }
}

// Bacia de pedra: poça sempre visível ondulando + jato do cano ciclando os
// quadros de despejo (steps(1) no CSS → um quadro visível por vez).
class PipeFX {
  private objects: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, box: PieceBox, depth: number, reduced: boolean) {
    const full = (frame: string, alpha: number) => {
      const img = scene.add.image(box.cx, box.cy, `basin-${frame}`).setDepth(depth).setAlpha(alpha);
      img.setDisplaySize(box.w, box.h);
      this.objects.push(img);
      return img;
    };

    const [poolA, poolB] = BASIN_POOL_FRAMES;
    full(poolB, 0.85);
    const shimmer = full(poolA, 1);
    if (!reduced) {
      scene.tweens.add({
        targets: shimmer,
        alpha: { from: 1, to: 0.35 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }

    const pour = scene.add.image(box.cx, box.cy, `basin-${BASIN_POUR_FRAMES[0]}`).setDepth(depth + 0.1);
    pour.setDisplaySize(box.w, box.h);
    this.objects.push(pour);
    if (!reduced) {
      let index = 0;
      scene.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => {
          index = (index + 1) % BASIN_POUR_FRAMES.length;
          pour.setTexture(`basin-${BASIN_POUR_FRAMES[index]}`);
        },
      });
    }
  }
}

// Uma peça comprada da Loja do Lago, posicionada no leiaute percentual da
// montagem. As animações (floaty/sway/wind/fx) são tweens — portas das
// keyframes CSS originais.
export class SceneryPiece {
  readonly image: Phaser.GameObjects.Image;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly baseRot: number;

  constructor(scene: Phaser.Scene, item: SceneryItem, W: number, H: number, reduced: boolean) {
    const mobile = W <= 820 ? 0.72 : 1;
    const displayWidth = Math.min((item.w / 100) * W, item.wmax ?? 10000) * mobile;
    const natural = scene.textures.get(`scenery-${item.id}`).getSourceImage() as HTMLImageElement;
    const displayHeight = displayWidth * (natural.naturalHeight / natural.naturalWidth) * (item.flat ?? 1);

    const cx = (item.x / 100) * W;
    const cy = (item.y / 100) * H;
    const origin = item.sway || item.wind ? parseOrigin(item.origin) : { ox: 0.5, oy: 0.5 };

    this.image = scene.add
      .image(cx, cy, `scenery-${item.id}`)
      .setDepth(item.z ?? 3)
      .setOrigin(origin.ox, origin.oy)
      .setRotation(rad(item.rot ?? 0));
    this.image.setDisplaySize(displayWidth, displayHeight);
    this.baseX = cx + (0.5 - origin.ox) * displayWidth;
    this.baseY = cy + (0.5 - origin.oy) * displayHeight;
    this.baseRot = rad(item.rot ?? 0);
    this.image.setPosition(this.baseX, this.baseY);

    const box: PieceBox = { cx, cy, w: displayWidth, h: displayHeight };

    if (!reduced) {
      if (item.floaty) {
        scene.tweens.addCounter({
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
        });
      }
      if (item.sway) {
        scene.tweens.add({
          targets: this.image,
          rotation: { from: this.baseRot + rad(-3.2), to: this.baseRot + rad(3.2) },
          duration: 5500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
      if (item.wind) {
        scene.tweens.add({
          targets: this.image,
          rotation: { from: this.baseRot + rad(-1), to: this.baseRot + rad(1.1) },
          duration: 9500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
    }

    if (item.fx === "stream") new StreamFX(scene, box, item.z ?? 3, reduced);
    else if (item.fx === "pipe") new PipeFX(scene, box, item.z ?? 3, reduced);
  }

  destroy(): void {
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
