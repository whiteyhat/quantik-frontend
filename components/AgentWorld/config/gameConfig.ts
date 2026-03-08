import Phaser from "phaser";
import { MAP_WIDTH_PX, MAP_HEIGHT_PX } from "./worldMap";

export function createGameConfig(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[]
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,
    parent,
    width: MAP_WIDTH_PX,
    height: MAP_HEIGHT_PX,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: "#0a0a0a",
    dom: {
      createContainer: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: scenes,
    banner: false,
  };
}
