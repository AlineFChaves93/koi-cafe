import Phaser from "phaser";
import { ATLAS_COLUMNS, animsForVariant } from "../data/animations";
import { BASIN_POUR_FRAMES, SCENERY } from "../data/scenery";
import { KOI_VARIANTS } from "../data/variants";

export const CHAR_KEYS = {
  bench: "char-bench",
  boySitLeft: "char-boy-sit-left",
  boySitRight: "char-boy-sit-right",
  boyThrowLeft: "char-boy-throw-left",
  boyThrowRight: "char-boy-throw-right",
} as const;

export const WATER_KEY = "water-bg";
export const PELLET_TEXTURES = { comum: "pellet", premium: "pellet-premium" } as const;

// Boot loads the asset manifest, converts each koi atlas into a spritesheet,
// registers the animation sets and generates the small procedural textures
// (pellets, splash rings, waterfall bits). PondScene starts fully loaded.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    const { width, height } = this.scale.gameSize;
    const bar = this.add.graphics();
    this.load.on("progress", (value: number) => {
      bar.clear();
      bar.fillStyle(0xefb866, 1);
      bar.fillRect(width / 2 - 140, height / 2 - 8, 280 * value, 16);
    });

    for (const variant of KOI_VARIANTS) this.load.image(`koi-${variant.key}-img`, variant.file);
    for (const item of SCENERY) this.load.image(`scenery-${item.id}`, item.src);
    for (const frame of [...BASIN_POUR_FRAMES, "03", "07", "08", "09", "10"]) {
      this.load.image(`basin-${frame}`, `/assets/scenery/basin-water/frame-${frame}.png`);
    }
    this.load.image(CHAR_KEYS.bench, "/assets/character/bench.png");
    this.load.image(CHAR_KEYS.boySitLeft, "/assets/character/boy-sit-left.png");
    this.load.image(CHAR_KEYS.boySitRight, "/assets/character/boy-sit-right.png");
    this.load.image(CHAR_KEYS.boyThrowLeft, "/assets/character/boy-throw-left.png");
    this.load.image(CHAR_KEYS.boyThrowRight, "/assets/character/boy-throw-right.png");
    this.load.image(WATER_KEY, "/assets/water/water-bg.jpg");
  }

  create(): void {
    const aspects: Record<string, number> = {};
    for (const variant of KOI_VARIANTS) {
      const source = this.textures.get(`koi-${variant.key}-img`).getSourceImage() as HTMLImageElement;
      const frameWidth = source.naturalWidth / ATLAS_COLUMNS;
      const frameHeight = source.naturalHeight / 6;
      this.textures.addSpriteSheet(`koi-${variant.key}`, source, { frameWidth, frameHeight });
      aspects[variant.key] = frameHeight / frameWidth;

      const anims = animsForVariant(variant.key);
      for (const [anim, meta] of Object.entries(anims)) {
        this.anims.create({
          key: `koi-${variant.key}:${anim}`,
          frames: this.anims.generateFrameNumbers(`koi-${variant.key}`, {
            frames: Array.from({ length: meta.frames }, (_, i) => meta.row * ATLAS_COLUMNS + i),
          }),
          frameRate: meta.fps,
          repeat: meta.loop ? -1 : 0,
          yoyo: meta.loop,
        });
      }
    }
    this.registry.set("atlasAspects", aspects);

    this.generateTextures();
    this.scene.start("Pond");
  }

  private generateTextures(): void {
    const pellet = (key: string, color: number) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(4, 4, 3);
      g.generateTexture(key, 8, 8);
      g.destroy();
    };
    pellet(PELLET_TEXTURES.comum, 0x5c4033);
    pellet(PELLET_TEXTURES.premium, 0xd9a13c);

    const ring = (key: string, color: number, alpha: number) => {
      const g = this.add.graphics();
      g.lineStyle(2, color, alpha);
      g.strokeEllipse(11, 5, 20, 8);
      g.generateTexture(key, 22, 10);
      g.destroy();
    };
    ring("splash-ring", 0xffffff, 0.9);
    ring("splash-ring-grow", 0x9fd6b9, 0.95);

    const drop = (key: string, color: number) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillEllipse(3, 8, 5, 15);
      g.generateTexture(key, 6, 16);
      g.destroy();
    };
    drop("splash-drop", 0xffffff);
    drop("splash-drop-grow", 0x9fd6b9);

    // Waterfall jet: gradient clipped to the spout polygon (ported from the
    // previous CSS .fx-water element).
    const jet = this.textures.createCanvas("fx-jet", 64, 256);
    if (jet) {
      const ctx = jet.getContext();
      const gradient = ctx.createLinearGradient(0, 0, 64, 0);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.12, "rgba(255,255,255,0)");
      gradient.addColorStop(0.28, "rgba(222,249,255,0.75)");
      gradient.addColorStop(0.43, "rgba(139,211,229,0.18)");
      gradient.addColorStop(0.57, "rgba(255,255,255,0.82)");
      gradient.addColorStop(0.73, "rgba(121,195,218,0.12)");
      gradient.addColorStop(0.9, "rgba(255,255,255,0)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(64 * 0.4, 0);
      ctx.lineTo(64 * 0.88, 0);
      ctx.lineTo(64 * 0.72, 256);
      ctx.lineTo(64 * 0.05, 256);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 256);
      ctx.restore();
      jet.refresh();
    }

    // Impact glow (radial gradient ellipse).
    const impact = this.textures.createCanvas("fx-impact", 64, 32);
    if (impact) {
      const ctx = impact.getContext();
      const gradient = ctx.createRadialGradient(32, 16, 1, 32, 16, 30);
      gradient.addColorStop(0, "rgba(255,255,255,0.8)");
      gradient.addColorStop(0.18, "rgba(207,244,249,0.48)");
      gradient.addColorStop(0.62, "rgba(207,244,249,0)");
      gradient.addColorStop(1, "rgba(207,244,249,0)");
      ctx.save();
      ctx.translate(32, 16);
      ctx.scale(1, 0.5);
      ctx.translate(-32, -16);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 32);
      ctx.restore();
      impact.refresh();
    }

    // Ripple ring.
    const ripple = this.textures.createCanvas("fx-ripple", 128, 64);
    if (ripple) {
      const ctx = ripple.getContext();
      ctx.strokeStyle = "rgba(221,250,247,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(64, 32, 62, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ripple.refresh();
    }
  }
}
