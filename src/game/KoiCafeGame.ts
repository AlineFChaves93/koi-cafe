import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PondScene } from "./scenes/PondScene";

// The pond world canvas. It sits transparent over the CSS water gradient of
// .pond-world and resizes with its parent (full-bleed, like the old layout).
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 1280,
      height: parent.clientHeight || 800,
    },
    scene: [BootScene, PondScene],
  });
}
