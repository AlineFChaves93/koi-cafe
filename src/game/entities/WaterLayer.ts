import Phaser from "phaser";
import { WATER_KEY } from "../scenes/BootScene";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// água viva: textura em duas camadas com deriva lenta (porta das keyframes
// water-drift / water-drift-b). Atualizada por tempo absoluto para sobreviver
// a redimensionamentos sem recriar tweens.
export class WaterLayer {
  private readonly a: Phaser.GameObjects.Image;
  private readonly b: Phaser.GameObjects.Image;
  private baseScaleA = 1;
  private baseScaleB = 1;

  constructor(scene: Phaser.Scene, reduced: boolean) {
    this.a = scene.add.image(0, 0, WATER_KEY).setDepth(0);
    this.b = scene.add.image(0, 0, WATER_KEY).setDepth(0)
      .setAlpha(0.62)
      .setBlendMode(Phaser.BlendModes.SOFT_LIGHT);
    this.reduced = reduced;
  }

  private readonly reduced: boolean;

  layout(W: number, H: number): void {
    const natural = this.a.texture.getSourceImage();
    this.baseScaleA = (1.08 * W) / natural.width;
    this.baseScaleB = (1.08 * H) / natural.height;
    // both layers stretch to the 108% box (as the CSS width/height did)
    this.a.setScale(this.baseScaleA, this.baseScaleB).setPosition(W / 2, H / 2);
    this.b.setScale(this.baseScaleA, this.baseScaleB).setPosition(W / 2, H / 2);
  }

  update(time: number, W: number, H: number): void {
    if (this.reduced) return;
    const cycle = (period: number) => (1 - Math.cos((2 * Math.PI * time) / period)) / 2;
    const cx = W / 2;
    const cy = H / 2;

    const pA = cycle(15000);
    this.a.setPosition(cx + lerp(-0.028, 0.028, pA) * W, cy + lerp(-0.02, 0.02, pA) * H);
    const sA = lerp(1.1, 1.01, pA);
    this.a.setScale(this.baseScaleA * sA, this.baseScaleB * sA);

    const pB = cycle(20000);
    this.b.setPosition(cx + lerp(0.026, -0.026, pB) * W, cy + lerp(0.016, -0.016, pB) * H);
    const sB = lerp(1.02, 1.08, pB);
    this.b.setScale(this.baseScaleA * sB, this.baseScaleB * sB);
  }
}
