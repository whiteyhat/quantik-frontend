import Phaser from "phaser";

// ─── Speech Bubble ───────────────────────────────────────────────────────────
// A Phaser canvas-rendered pixel art speech bubble that appears above NPCs.
// Uses Graphics + Text in a Container for crisp styling.
// IMPORTANT: Text uses LINEAR filtering to bypass pixelArt nearest-neighbor,
// which would otherwise make small text unreadable.

const PADDING_H = 8;
const PADDING_V = 5;
const TAIL_WIDTH = 5;
const TAIL_HEIGHT = 5;
const BORDER_RADIUS = 3;
const BG_COLOR = 0x0a0a1e;
const BG_ALPHA = 0.92;
const BORDER_ALPHA = 0.5;
const MAX_TEXT_WIDTH = 120;

export class SpeechBubble {
  private container: Phaser.GameObjects.Container | null = null;
  private scene: Phaser.Scene;
  private destroyTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    accentColor: number,
    duration: number = 3000
  ) {
    this.scene = scene;

    // Create text first to measure bounds
    const textObj = scene.add.text(0, 0, text, {
      fontSize: "9px",
      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
      color: `#${accentColor.toString(16).padStart(6, "0")}`,
      resolution: 4,
      wordWrap: { width: MAX_TEXT_WIDTH, useAdvancedWrap: true },
      lineSpacing: 2,
    });
    textObj.setOrigin(0.5, 0.5);

    // Override NEAREST filtering — pixelArt mode makes text unreadable
    textObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const textWidth = textObj.width;
    const textHeight = textObj.height;

    // Bubble dimensions
    const bubbleW = textWidth + PADDING_H * 2;
    const bubbleH = textHeight + PADDING_V * 2;

    // Draw bubble graphics
    const gfx = scene.add.graphics();

    // Background fill with rounded rect
    gfx.fillStyle(BG_COLOR, BG_ALPHA);
    gfx.fillRoundedRect(-bubbleW / 2, -bubbleH - TAIL_HEIGHT, bubbleW, bubbleH, BORDER_RADIUS);

    // Border
    gfx.lineStyle(1, accentColor, BORDER_ALPHA);
    gfx.strokeRoundedRect(-bubbleW / 2, -bubbleH - TAIL_HEIGHT, bubbleW, bubbleH, BORDER_RADIUS);

    // Tail triangle pointing down
    gfx.fillStyle(BG_COLOR, BG_ALPHA);
    gfx.fillTriangle(
      -TAIL_WIDTH / 2, -TAIL_HEIGHT,
      TAIL_WIDTH / 2, -TAIL_HEIGHT,
      0, 0
    );
    // Tail border lines
    gfx.lineStyle(1, accentColor, BORDER_ALPHA);
    gfx.lineBetween(-TAIL_WIDTH / 2, -TAIL_HEIGHT, 0, 0);
    gfx.lineBetween(TAIL_WIDTH / 2, -TAIL_HEIGHT, 0, 0);

    // Position text centered in bubble
    textObj.setPosition(0, -bubbleH / 2 - TAIL_HEIGHT);

    // Group into container
    this.container = scene.add.container(x, y - 20, [gfx, textObj]);
    this.container.setDepth(30);
    this.container.setAlpha(0);

    // Fade in
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: y - 22,
      duration: 150,
      ease: "Sine.easeOut",
    });

    // Auto-destroy after duration
    this.destroyTimer = scene.time.delayedCall(duration, () => {
      this.fadeOut();
    });
  }

  private fadeOut(): void {
    if (!this.container) return;
    const c = this.container;

    this.scene.tweens.add({
      targets: c,
      alpha: 0,
      y: c.y - 3,
      duration: 200,
      ease: "Sine.easeIn",
      onComplete: () => {
        c.destroy();
        this.container = null;
      },
    });
  }

  /** Update position to follow a sprite */
  updatePosition(x: number, y: number): void {
    if (this.container) {
      this.container.setPosition(x, y - 22);
    }
  }

  destroy(): void {
    if (this.destroyTimer) {
      this.destroyTimer.remove(false);
      this.destroyTimer = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  get isAlive(): boolean {
    return this.container !== null;
  }
}
