import Phaser from "phaser";
import { TILE_SIZE } from "../config/worldMap";
import { PathfindingGrid } from "../systems/PathfindingGrid";

// ─── Main Agent Entity ────────────────────────────────────────────────────────
// The user's trading agent character. Navigates between rooms via A* pathfinding.

export type MainAgentState = "idle" | "walking" | "entering_room" | "observing" | "celebrating";

export class MainAgent {
  sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private pathfinding: PathfindingGrid;

  state: MainAgentState = "idle";
  currentRoomId: string | null = "hatchery";

  // Movement
  private path: { x: number; y: number }[] = [];
  private pathIndex = 0;
  private moveSpeed = 60; // pixels per second
  private isMoving = false;

  // Callbacks
  private onArrival: (() => void) | null = null;

  // Animation
  private idleTimer = 0;
  private bobOffset = 0;

  // Trail particles
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Keyboard control
  userControlled = false;
  private userControlTimer = 0;
  private readonly userControlTimeout = 5000; // ms before returning to autonomous
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;
  private keyMoving = false;
  private lastKeyDir: "up" | "down" | "left" | "right" = "down";

  constructor(scene: Phaser.Scene, startTileX: number, startTileY: number, pathfinding: PathfindingGrid) {
    this.scene = scene;
    this.pathfinding = pathfinding;

    const px = startTileX * TILE_SIZE + TILE_SIZE / 2;
    const py = startTileY * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.sprite(px, py, "main-agent", 0);
    this.sprite.setDepth(10);
    this.sprite.setOrigin(0.5, 0.75); // feet at bottom
    this.sprite.setScale(0.75); // scaled to fit world.png rooms

    this.createAnimations();
    this.createTrailEmitter();
    this.createKeyboardInput();
  }

  private createAnimations(): void {
    const key = "main-agent";
    const anims = this.scene.anims;

    // 4 cols × 4 rows: row 0 = down, row 1 = left, row 2 = right, row 3 = up
    if (!anims.exists(`${key}-idle-down`)) {
      anims.create({ key: `${key}-idle-down`, frames: [{ key, frame: 0 }], frameRate: 1 });
      anims.create({ key: `${key}-idle-left`, frames: [{ key, frame: 4 }], frameRate: 1 });
      anims.create({ key: `${key}-idle-right`, frames: [{ key, frame: 8 }], frameRate: 1 });
      anims.create({ key: `${key}-idle-up`, frames: [{ key, frame: 12 }], frameRate: 1 });

      anims.create({
        key: `${key}-walk-down`,
        frames: anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
      anims.create({
        key: `${key}-walk-left`,
        frames: anims.generateFrameNumbers(key, { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1,
      });
      anims.create({
        key: `${key}-walk-right`,
        frames: anims.generateFrameNumbers(key, { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
      anims.create({
        key: `${key}-walk-up`,
        frames: anims.generateFrameNumbers(key, { start: 12, end: 15 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  /** Navigate to a tile position. Returns promise that resolves on arrival. */
  walkTo(tileX: number, tileY: number): Promise<void> {
    // If user is controlling, skip automated walk commands
    if (this.userControlled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const currentTileX = Math.round((this.sprite.x - TILE_SIZE / 2) / TILE_SIZE);
      const currentTileY = Math.round((this.sprite.y - TILE_SIZE / 2) / TILE_SIZE);

      const path = this.pathfinding.findPath(currentTileX, currentTileY, tileX, tileY);

      if (!path || path.length === 0) {
        resolve();
        return;
      }

      this.path = path;
      this.pathIndex = 0;
      this.isMoving = true;
      this.state = "walking";
      this.onArrival = resolve;
    });
  }

  /** Immediately teleport to a tile */
  teleportTo(tileX: number, tileY: number): void {
    this.sprite.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.sprite.y = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.isMoving = false;
    this.path = [];
    this.state = "idle";
  }

  /** Cancel current movement */
  stop(): void {
    this.isMoving = false;
    this.path = [];
    this.state = "idle";
    this.playIdleAnim("down");
    if (this.onArrival) {
      this.onArrival();
      this.onArrival = null;
    }
  }

  update(delta: number): void {
    // Check keyboard input
    this.updateKeyboard(delta);

    if (this.keyMoving) {
      this.enableTrail(true);
    } else if (this.isMoving && this.path.length > 0) {
      this.updateMovement(delta);
      this.enableTrail(true);
    } else {
      this.updateIdle(delta);
      this.enableTrail(false);
    }
  }

  private updateMovement(delta: number): void {
    if (this.pathIndex >= this.path.length) {
      this.isMoving = false;
      this.state = "idle";
      this.playIdleAnim("down");
      if (this.onArrival) {
        this.onArrival();
        this.onArrival = null;
      }
      return;
    }

    const target = this.path[this.pathIndex];
    const targetPx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const targetPy = target.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = targetPx - this.sprite.x;
    const dy = targetPy - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const step = this.moveSpeed * (delta / 1000);

    if (dist <= step) {
      this.sprite.x = targetPx;
      this.sprite.y = targetPy;
      this.pathIndex++;
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      this.sprite.x += nx * step;
      this.sprite.y += ny * step;

      // Determine facing direction and play walk animation
      if (Math.abs(dx) > Math.abs(dy)) {
        this.playWalkAnim(dx > 0 ? "right" : "left");
      } else {
        this.playWalkAnim(dy > 0 ? "down" : "up");
      }
    }
  }

  private updateIdle(delta: number): void {
    this.idleTimer += delta;
    // Gentle bob
    this.bobOffset = Math.sin(this.idleTimer / 800) * 1;
    this.sprite.y += this.bobOffset * 0.02;
  }

  private playWalkAnim(dir: "up" | "down" | "left" | "right"): void {
    const animKey = `main-agent-walk-${dir}`;
    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey, true);
    }
  }

  private playIdleAnim(dir: "up" | "down" | "left" | "right"): void {
    const animKey = `main-agent-idle-${dir}`;
    this.sprite.play(animKey, true);
  }

  /** Get current tile position */
  getTilePos(): { x: number; y: number } {
    return {
      x: Math.round((this.sprite.x - TILE_SIZE / 2) / TILE_SIZE),
      y: Math.round((this.sprite.y - TILE_SIZE / 2) / TILE_SIZE),
    };
  }

  // ── Keyboard Control ────────────────────────────────────────────────

  private createKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private updateKeyboard(delta: number): void {
    if (!this.cursors && !this.wasd) return;

    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;
    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;

    if (up || down || left || right) {
      // Take control from automation
      if (!this.userControlled) {
        this.userControlled = true;
        this.stop(); // cancel any automated path
      }
      this.userControlTimer = 0;
      this.keyMoving = true;

      let dx = 0, dy = 0;
      let dir: "up" | "down" | "left" | "right" = this.lastKeyDir;
      if (up) { dy = -1; dir = "up"; }
      else if (down) { dy = 1; dir = "down"; }
      else if (left) { dx = -1; dir = "left"; }
      else if (right) { dx = 1; dir = "right"; }
      this.lastKeyDir = dir;

      const step = this.moveSpeed * (delta / 1000);
      const newX = this.sprite.x + dx * step;
      const newY = this.sprite.y + dy * step;

      // Check walkability at target tile
      const tileX = Math.round((newX - TILE_SIZE / 2) / TILE_SIZE);
      const tileY = Math.round((newY - TILE_SIZE / 2) / TILE_SIZE);
      if (this.pathfinding.isWalkable(tileX, tileY)) {
        this.sprite.x = newX;
        this.sprite.y = newY;
      }

      this.playWalkAnim(dir);
      this.state = "walking";
    } else {
      if (this.keyMoving) {
        this.keyMoving = false;
        this.playIdleAnim(this.lastKeyDir);
        this.state = "idle";
      }

      // Count down user control timeout
      if (this.userControlled) {
        this.userControlTimer += delta;
        if (this.userControlTimer >= this.userControlTimeout) {
          this.userControlled = false;
          this.userControlTimer = 0;
        }
      }
    }
  }

  private createTrailEmitter(): void {
    if (!this.scene.textures.exists("particles")) return;
    this.trailEmitter = this.scene.add.particles(0, 0, "particles", {
      frame: 7, // cyan sparkle
      follow: this.sprite,
      followOffset: { x: 0, y: 6 },
      speed: { min: 2, max: 6 },
      lifespan: 600,
      frequency: 100,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.trailEmitter.setDepth(9);
  }

  private enableTrail(on: boolean): void {
    if (!this.trailEmitter) return;
    if (on && !this.trailEmitter.emitting) this.trailEmitter.start();
    else if (!on && this.trailEmitter.emitting) this.trailEmitter.stop();
  }

  destroy(): void {
    this.trailEmitter?.destroy();
    this.sprite.destroy();
  }
}
