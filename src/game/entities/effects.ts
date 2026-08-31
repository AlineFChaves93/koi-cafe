import Phaser from "phaser";

// Splash do arremesso + splash de crescimento (porta dos .splash CSS).
const RING_LIFETIME = 950;

export function spawnSplash(scene: Phaser.Scene, x: number, y: number, grow: boolean): void {
  const ringKey = grow ? "splash-ring-grow" : "splash-ring";
  const dropKey = grow ? "splash-drop-grow" : "splash-drop";
  const objects: Phaser.GameObjects.Sprite[] = [];

  const ring = (baseWidth: number) => {
    const s = scene.add.sprite(x, y, ringKey).setDepth(22).setAlpha(grow ? 0.95 : 0.9);
    s.setDisplaySize(baseWidth, baseWidth * (10 / 22));
    objects.push(s);
    scene.tweens.add({
      targets: s,
      scale: { from: 1, to: 4.2 },
      alpha: 0,
      duration: RING_LIFETIME,
      ease: "Quad.Out",
    });
  };
  ring(grow ? 30 : 22);
  ring(grow ? 62 : 48); // the outer <b> ring from the CSS version

  const dropSpecs = [
    { dx: -16, angle: -24, height: 15 },
    { dx: 8, angle: 0, height: 22 },
    { dx: 15, angle: 24, height: 15 },
  ];
  for (const spec of dropSpecs) {
    const d = scene.add.sprite(x + spec.dx, y, dropKey).setDepth(22);
    d.setRotation((spec.angle * Math.PI) / 180);
    objects.push(d);
    scene.tweens.add({
      targets: d,
      y: y - 30,
      alpha: 0,
      duration: 650,
      ease: "Quad.Out",
    });
  }

  scene.time.delayedCall(RING_LIFETIME, () => objects.forEach((o) => o.destroy()));
}
