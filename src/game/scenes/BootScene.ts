import Phaser from "phaser";
import { ATLAS_COLUMNS, animsForVariant } from "../data/animations";
import { SCENERY } from "../data/scenery";
import { KOI_VARIANTS } from "../data/variants";

export const CHAR_KEYS = {
  bench: "char-bench",
  boySitLeft: "char-boy-sit-left",
  boySitRight: "char-boy-sit-right",
  boyThrowLeft: "char-boy-throw-left",
  boyThrowRight: "char-boy-throw-right",
} as const;

export const WATER_KEY = "water-bg";
export const COIN_KEY = "coin";
export const PELLET_TEXTURES = { comum: "pellet", premium: "pellet-premium" } as const;

// Boot loads the asset manifest, converts each koi atlas into a spritesheet,
// registers the animation sets and generates the small procedural textures
// (pellets, splash bits, ripple). PondScene starts fully loaded.
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
    this.load.image(CHAR_KEYS.bench, "/assets/character/bench.png");
    // O remédio voa como item; a ração usa os pellets procedurais abaixo.
    this.load.image("icon-remedio", "/assets/icons/remedio.png");
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

    // Grão de ração: bolinha com sombreamento radial — marrom na comum,
    // dourada na premium (as cores dos grãos da arte dos potes).
    const pellet = (key: string, base: string, rim: string, shine: string) => {
      const s = 14;
      const tex = this.textures.createCanvas(key, s, s);
      if (!tex) return;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(s * 0.38, s * 0.34, 0.5, s * 0.5, s * 0.5, s * 0.5);
      g.addColorStop(0, shine);
      g.addColorStop(0.6, base);
      g.addColorStop(1, rim);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    };
    pellet(PELLET_TEXTURES.comum, "#8a5a2b", "#55351a", "#c99a62");
    pellet(PELLET_TEXTURES.premium, "#c08a33", "#7c5210", "#f3d795");

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

    // Moeda: disco dourado com borda cunhada e anel interno em relevo (as
    // cores da carteira). Nas views ele é desenhado achatado no plano da
    // água — nunca como texto/glifo.
    const coin = this.textures.createCanvas(COIN_KEY, 64, 64);
    if (coin) {
      const ctx = coin.getContext();
      const s = 64;
      const face = ctx.createRadialGradient(s * 0.38, s * 0.32, 2, s * 0.5, s * 0.5, s * 0.5);
      face.addColorStop(0, "#ffe9bd");
      face.addColorStop(0.55, "#efb866");
      face.addColorStop(1, "#b07a1e");
      ctx.fillStyle = face;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a5c12";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // anel interno em relevo: sombra deslocada para baixo, luz para cima
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(122, 79, 12, 0.55)";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2 + 1.5, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 240, 200, 0.65)";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2 - 1.5, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      coin.refresh();
    }
  }
}
