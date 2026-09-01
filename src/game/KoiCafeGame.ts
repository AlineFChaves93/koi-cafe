import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PondScene } from "./scenes/PondScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./viewport";

// Phaser owns one fixed 16:9 world. ScaleManager's FIT measures the parent
// with getBoundingClientRect, which comes swapped once the surface is rotated
// for forced landscape — so the canvas is sized manually in GameShell from the
// parent's layout size (clientWidth/Height), which rotation never changes.
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, PondScene],
  });
}
