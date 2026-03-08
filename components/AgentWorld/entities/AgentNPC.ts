import Phaser from "phaser";
import { TILE_SIZE, type RoomDef } from "../config/worldMap";
import { SpeechBubble } from "./SpeechBubble";
import { getRandomLine } from "../config/agentDialogue";

// ─── Agent NPC Entity ─────────────────────────────────────────────────────────
// Represents one of the 7 pipeline agents as an NPC inside their room.
// Uses a finite state machine for animation states.

export type NPCState = "idle" | "activated" | "working" | "done_success" | "done_error" | "celebrating";

// Shared global bubble throttle: max 3 bubbles per 80 seconds across ALL NPCs
const BUBBLE_WINDOW_MS = 80000;
const BUBBLE_MAX_PER_WINDOW = 3;
const globalBubbleTimestamps: number[] = [];

function canShowBubbleGlobally(): boolean {
  const now = Date.now();
  // Purge expired timestamps
  while (globalBubbleTimestamps.length > 0 && now - globalBubbleTimestamps[0] > BUBBLE_WINDOW_MS) {
    globalBubbleTimestamps.shift();
  }
  return globalBubbleTimestamps.length < BUBBLE_MAX_PER_WINDOW;
}

function recordBubble(): void {
  globalBubbleTimestamps.push(Date.now());
}

export class AgentNPC {
  sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  room: RoomDef;
  agentKey: string;
  state: NPCState = "idle";

  // Visual indicators
  private statusGlow: Phaser.GameObjects.Ellipse | null = null;
  private workingParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pointLight: Phaser.GameObjects.Image | null = null;

  // Speech bubble
  private currentBubble: SpeechBubble | null = null;
  private idleChatTimer = 0;
  private idleChatInterval: number;

  // Animation timers
  private stateTimer = 0;
  private idleBobPhase: number;
  private workingPulsePhase = 0;

  // Idle micro-behavior
  private microBehaviorTimer = 0;
  private microBehaviorInterval: number;

  // Room wandering
  private isWandering = false;
  private wanderTimer = 0;
  private wanderInterval: number;
  private baseX: number;
  private baseY: number;

  constructor(scene: Phaser.Scene, room: RoomDef) {
    this.scene = scene;
    this.room = room;
    this.agentKey = room.agentKey || room.id;
    this.idleBobPhase = Math.random() * Math.PI * 2; // Randomize so NPCs don't sync
    this.idleChatInterval = 20000 + Math.random() * 20000; // 20-40s between idle chatter
    this.microBehaviorInterval = 3000 + Math.random() * 3000; // 3-6s between fidgets
    this.wanderInterval = 3000 + Math.random() * 4000; // 3-7s between wanders

    const px = room.npcSpawn.x * TILE_SIZE + TILE_SIZE / 2;
    const py = room.npcSpawn.y * TILE_SIZE + TILE_SIZE / 2;
    this.baseX = px;
    this.baseY = py;
    const spriteKey = `npc-${this.agentKey}`;

    // Status glow circle under NPC
    this.statusGlow = scene.add.ellipse(px, py + 4, 16, 8, room.theme.accentColor, 0.2);
    this.statusGlow.setDepth(4);

    // Point light (glow circle texture)
    if (scene.textures.exists("glow-circle")) {
      this.pointLight = scene.add.image(px, py, "glow-circle");
      this.pointLight.setTint(room.theme.accentColor);
      this.pointLight.setAlpha(0.15);
      this.pointLight.setScale(1.2);
      this.pointLight.setBlendMode(Phaser.BlendModes.ADD);
      this.pointLight.setDepth(3);
    }

    // NPC Sprite (scaled down to fit rooms in world.png)
    this.sprite = scene.add.sprite(px, py, spriteKey, 0);
    this.sprite.setDepth(5);
    this.sprite.setOrigin(0.5, 0.75);
    this.sprite.setScale(0.75);
    this.sprite.setInteractive({ useHandCursor: true });

    this.createAnimations(spriteKey);
    this.playIdleAnimation();
  }

  private createAnimations(key: string): void {
    const anims = this.scene.anims;
    if (anims.exists(`${key}-idle`)) return;

    // Row 0: idle (4 frames), Row 1: working (4 frames), Row 2: celebrate (4 frames), Row 3: directional
    anims.create({
      key: `${key}-idle`,
      frames: anims.generateFrameNumbers(key, { start: 0, end: 3 }),
      frameRate: 3,
      repeat: -1,
    });

    anims.create({
      key: `${key}-working`,
      frames: anims.generateFrameNumbers(key, { start: 4, end: 7 }),
      frameRate: 6,
      repeat: -1,
    });

    anims.create({
      key: `${key}-celebrate`,
      frames: anims.generateFrameNumbers(key, { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });

    // Row 3: directional walk frames (12-15) used for room wandering
    anims.create({
      key: `${key}-walk`,
      frames: anims.generateFrameNumbers(key, { start: 12, end: 15 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  // ── State Machine ───────────────────────────────────────────────────

  setState(newState: NPCState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTimer = 0;

    // Stop wandering if active
    if (this.isWandering) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.isWandering = false;
    }

    // Reset to spawn position on state change
    const px = this.room.npcSpawn.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.room.npcSpawn.y * TILE_SIZE + TILE_SIZE / 2;
    this.sprite.setPosition(px, py);
    this.baseX = px;
    this.baseY = py;
    this.sprite.setFlipX(false);

    // Clean up working particles
    if (this.workingParticles) {
      this.workingParticles.stop();
      this.workingParticles = null;
    }

    switch (newState) {
      case "idle":
        this.playIdleAnimation();
        this.setGlowColor(this.room.theme.accentColor, 0.2);
        this.setPointLightAlpha(0.15);
        break;

      case "activated":
        this.sprite.setTint(0xffffff);
        this.setGlowColor(this.room.theme.accentColor, 0.4);
        this.activationPulse();
        break;

      case "working":
        this.playWorkingAnimation();
        this.setGlowColor(this.room.theme.accentColor, 0.6);
        this.startWorkingParticles();
        this.showBubble("working", 3000);
        this.setPointLightAlpha(0.3);
        break;

      case "done_success":
        this.playCelebrateAnimation();
        this.setGlowColor(0x30d158, 0.5);
        this.flashEffect(0x30d158);
        this.showBubble("done", 2500);
        // Auto-return to idle after 3s
        this.scene.time.delayedCall(3000, () => {
          if (this.state === "done_success") this.setState("idle");
        });
        break;

      case "done_error":
        this.sprite.setTint(0xff453a);
        this.setGlowColor(0xff453a, 0.5);
        this.shakeEffect();
        this.errorExplosion();
        this.showBubble("error", 2500);
        // Auto-return to idle after 3s
        this.scene.time.delayedCall(3000, () => {
          if (this.state === "done_error") {
            this.sprite.clearTint();
            this.setState("idle");
          }
        });
        break;

      case "celebrating":
        this.playCelebrateAnimation();
        this.setGlowColor(0xffd700, 0.6);
        break;
    }
  }

  // ── Animations ──────────────────────────────────────────────────────

  private playIdleAnimation(): void {
    const key = `npc-${this.agentKey}-idle`;
    this.sprite.clearTint();
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
    }
  }

  private playWorkingAnimation(): void {
    const key = `npc-${this.agentKey}-working`;
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
    }
  }

  private playCelebrateAnimation(): void {
    const key = `npc-${this.agentKey}-celebrate`;
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
    }
  }

  // ── Visual Effects ──────────────────────────────────────────────────

  private setGlowColor(color: number, alpha: number): void {
    if (this.statusGlow) {
      this.statusGlow.setFillStyle(color, alpha);
    }
  }

  private setPointLightAlpha(alpha: number): void {
    if (this.pointLight) {
      this.scene.tweens.killTweensOf(this.pointLight);
      this.scene.tweens.add({
        targets: this.pointLight,
        alpha,
        duration: 300,
        ease: "Sine.easeInOut",
      });
    }
  }

  private startWorkingParticles(): void {
    if (!this.scene.textures.exists("particles")) return;

    const px = this.sprite.x;
    const py = this.sprite.y - 8;

    // Determine particle color index based on agent
    const colorMap: Record<string, number> = {
      aura: 5,    // purple
      oracle: 4,  // blue
      flux: 7,    // cyan
      edge: 3,    // orange
      clause: 1,  // green
      lucifer: 2, // red
      sigma: 5,   // purple
    };
    const frameIdx = colorMap[this.agentKey] ?? 0;

    this.workingParticles = this.scene.add.particles(px, py, "particles", {
      frame: frameIdx,
      speed: { min: 5, max: 15 },
      angle: { min: 240, max: 300 },
      lifespan: 1000,
      frequency: 200,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.workingParticles.setDepth(12);
  }

  private flashEffect(color: number): void {
    const px = this.sprite.x;
    const py = this.sprite.y;
    const flash = this.scene.add.circle(px, py, 16, color, 0.6);
    flash.setDepth(11);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private activationPulse(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.15,
      duration: 250,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
    // Brighten glow briefly
    if (this.statusGlow) {
      this.scene.tweens.add({
        targets: this.statusGlow,
        alpha: 0.7,
        duration: 250,
        yoyo: true,
      });
    }
  }

  private errorExplosion(): void {
    if (!this.scene.textures.exists("particles")) return;

    const px = this.sprite.x;
    const py = this.sprite.y - 4;

    const emitter = this.scene.add.particles(px, py, "particles", {
      frame: [2, 3], // red and orange
      speed: { min: 15, max: 40 },
      angle: { min: 0, max: 360 },
      lifespan: 400,
      quantity: 6,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
    });
    emitter.setDepth(12);
    emitter.explode(6);

    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  // ── Speech Bubbles ─────────────────────────────────────────────────

  private showBubble(event: "working" | "done" | "error" | "idle", duration: number): void {
    // Destroy previous bubble
    if (this.currentBubble) {
      this.currentBubble.destroy();
      this.currentBubble = null;
    }

    const text = getRandomLine(this.agentKey, event);
    if (!text) return;

    this.currentBubble = new SpeechBubble(
      this.scene,
      this.sprite.x,
      this.sprite.y,
      text,
      this.room.theme.accentColor,
      duration
    );
  }

  private doMicroBehavior(): void {
    const behavior = Math.floor(Math.random() * 3);
    switch (behavior) {
      case 0:
        // Head turn: sprite nudge left/right
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.sprite.x + (Math.random() > 0.5 ? 1 : -1),
          duration: 200,
          yoyo: true,
          ease: "Sine.easeInOut",
        });
        break;
      case 1:
        // Sparkle: single particle burst
        if (this.scene.textures.exists("particles")) {
          const colorMap: Record<string, number> = {
            aura: 5, oracle: 4, flux: 7, edge: 3, clause: 1, lucifer: 2, sigma: 5,
          };
          const emitter = this.scene.add.particles(
            this.sprite.x, this.sprite.y - 6, "particles", {
              frame: colorMap[this.agentKey] ?? 0,
              speed: { min: 5, max: 12 },
              angle: { min: 240, max: 300 },
              lifespan: 500,
              quantity: 2,
              scale: { start: 0.8, end: 0 },
              alpha: { start: 0.7, end: 0 },
            }
          );
          emitter.setDepth(12);
          emitter.explode(2);
          this.scene.time.delayedCall(600, () => emitter.destroy());
        }
        break;
      case 2:
        // Stretch: brief scale pulse
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: 1.05,
          scaleY: 0.95,
          duration: 200,
          yoyo: true,
          ease: "Sine.easeInOut",
        });
        break;
    }
  }

  private shakeEffect(): void {
    const origX = this.sprite.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: origX + 2,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.sprite.x = origX;
      },
    });
  }

  // ── Room Wandering ─────────────────────────────────────────────────

  private startWander(): void {
    if (this.isWandering || this.state !== "idle") return;
    this.isWandering = true;

    const { x: rx, y: ry, w, h } = this.room.bounds;

    // Pick a random target within room bounds (in pixels)
    const margin = 4; // px margin from walls
    const minX = rx * TILE_SIZE + margin;
    const maxX = (rx + w) * TILE_SIZE - margin;
    const minY = ry * TILE_SIZE + margin;
    const maxY = (ry + h) * TILE_SIZE - margin;

    const targetX = minX + Math.random() * (maxX - minX);
    const targetY = minY + Math.random() * (maxY - minY);

    // Flip sprite based on walk direction
    if (targetX < this.sprite.x) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }

    // Play walk animation
    const walkKey = `npc-${this.agentKey}-walk`;
    if (this.scene.anims.exists(walkKey)) {
      this.sprite.play(walkKey, true);
    }

    // Calculate distance for duration (walking speed ~30px/s)
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(600, (dist / 30) * 1000);

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        // Update base position for glow/light tracking
        if (this.statusGlow) {
          this.statusGlow.setPosition(this.sprite.x, this.sprite.y + 4);
        }
      },
      onComplete: () => {
        this.isWandering = false;
        this.baseX = this.sprite.x;
        this.baseY = this.sprite.y;
        this.sprite.setFlipX(false);

        // Return to idle animation
        this.playIdleAnimation();
      },
    });
  }

  // ── Update Loop ─────────────────────────────────────────────────────

  update(delta: number): void {
    this.stateTimer += delta;

    // Update bubble and point light position to follow sprite
    if (this.currentBubble?.isAlive) {
      this.currentBubble.updatePosition(this.sprite.x, this.sprite.y);
    }
    if (this.pointLight) {
      this.pointLight.setPosition(this.sprite.x, this.sprite.y);
    }

    switch (this.state) {
      case "idle":
        // Room wandering
        if (!this.isWandering) {
          // Gentle floating bob when stationary
          this.idleBobPhase += delta * 0.002;
          this.sprite.y =
            this.baseY + Math.sin(this.idleBobPhase) * 1.5;

          // Check if it's time to wander
          this.wanderTimer += delta;
          if (this.wanderTimer >= this.wanderInterval) {
            this.wanderTimer = 0;
            this.wanderInterval = 3000 + Math.random() * 4000;
            this.startWander();
          }
        }

        // Idle chatter — gated by global throttle (max 3 per 80s across all NPCs)
        this.idleChatTimer += delta;
        if (this.idleChatTimer >= this.idleChatInterval) {
          this.idleChatTimer = 0;
          this.idleChatInterval = 20000 + Math.random() * 20000;
          if (canShowBubbleGlobally()) {
            recordBubble();
            this.showBubble("idle", 5000);
          }
        }

        // Micro-behaviors (fidgets) — only when not wandering
        if (!this.isWandering) {
          this.microBehaviorTimer += delta;
          if (this.microBehaviorTimer >= this.microBehaviorInterval) {
            this.microBehaviorTimer = 0;
            this.microBehaviorInterval = 3000 + Math.random() * 3000;
            this.doMicroBehavior();
          }
        }
        break;

      case "working":
        // Pulsing glow
        this.workingPulsePhase += delta * 0.005;
        const alpha = 0.3 + Math.sin(this.workingPulsePhase) * 0.3;
        this.setGlowColor(this.room.theme.accentColor, alpha);
        break;

      case "celebrating":
        // Bounce
        this.sprite.y =
          this.baseY +
          Math.abs(Math.sin(this.stateTimer * 0.005)) * -4;
        break;
    }
  }

  destroy(): void {
    this.currentBubble?.destroy();
    this.pointLight?.destroy();
    this.sprite.destroy();
    this.statusGlow?.destroy();
    if (this.workingParticles) {
      this.workingParticles.stop();
      this.workingParticles = null;
    }
  }
}
