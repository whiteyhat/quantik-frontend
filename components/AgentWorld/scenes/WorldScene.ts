import Phaser from "phaser";
import {
  ROOMS,
  MAP_WIDTH_TILES,
  MAP_HEIGHT_TILES,
  TILE_SIZE,
  MAP_WIDTH_PX,
  MAP_HEIGHT_PX,
  CORRIDOR_ROWS,
  getAgentRooms,
  type RoomDef,
} from "../config/worldMap";
import { PhaserBridge } from "../PhaserBridge";
import { MainAgent } from "../entities/MainAgent";
import { AgentNPC } from "../entities/AgentNPC";
import { PathfindingGrid } from "../systems/PathfindingGrid";
import { PipelineDirector } from "../systems/PipelineDirector";

// ─── World Scene ──────────────────────────────────────────────────────────────
// Main game scene: renders world.png background, spawns NPCs, manages the main agent.

const AGENTWORLD_LS_KEY = "agentworld_visited";

export class WorldScene extends Phaser.Scene {
  private bridge!: PhaserBridge;
  mainAgent!: MainAgent;
  npcs: Map<string, AgentNPC> = new Map();
  private pathfinding!: PathfindingGrid;
  private pipelineDirector!: PipelineDirector;

  // Ambient
  private ambientParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private roomGlows: Map<string, Phaser.GameObjects.Image> = new Map();
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private stackSparkleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // First-visit onboarding
  private isFirstVisit = false;
  private firstVisitObjects: Phaser.GameObjects.GameObject[] = [];

  // Hover labels
  private hoverLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: "WorldScene" });
  }

  create(): void {
    this.bridge = PhaserBridge.getInstance();
    this.pathfinding = new PathfindingGrid();

    // Check first visit
    try {
      this.isFirstVisit = !localStorage.getItem(AGENTWORLD_LS_KEY);
    } catch { this.isFirstVisit = false; }

    this.drawWorld();
    this.createRoomLighting();
    this.spawnNPCs();
    this.spawnMainAgent();
    this.createAmbientEffects();

    // First-visit onboarding effects
    if (this.isFirstVisit) {
      this.createFirstVisitEffects();
    }

    this.pipelineDirector = new PipelineDirector(this, this.mainAgent, this.npcs, this.bridge);

    // Listen for bridge events
    this.bridge.on("pipeline:state", this.pipelineDirector.onPipelineState, this.pipelineDirector);
    this.bridge.on("agent:event", this.pipelineDirector.onAgentEvent, this.pipelineDirector);
    this.bridge.on("trade:executed", this.pipelineDirector.onTradeExecuted, this.pipelineDirector);

    // Camera setup
    const cam = this.cameras.main;
    cam.setBounds(
      -TILE_SIZE * 2, -TILE_SIZE * 2,
      MAP_WIDTH_PX + TILE_SIZE * 4,
      MAP_HEIGHT_PX + TILE_SIZE * 4
    );
    cam.centerOn(MAP_WIDTH_PX / 2, MAP_HEIGHT_PX / 2);

    // Fixed camera — no zoom, fill canvas at 1:1
  }

  update(_time: number, delta: number): void {
    this.mainAgent.update(delta);
    this.npcs.forEach((npc) => npc.update(delta));
    this.pipelineDirector.update(delta);
  }

  // ── World Drawing ───────────────────────────────────────────────────

  private drawWorld(): void {
    const hasWorldMap = this.textures.exists("world-map") && this.textures.get("world-map").key !== "__MISSING";

    if (hasWorldMap) {
      // Single pre-rendered background image
      const bg = this.add.image(MAP_WIDTH_PX / 2, MAP_HEIGHT_PX / 2, "world-map");
      bg.setDisplaySize(MAP_WIDTH_PX, MAP_HEIGHT_PX);
      bg.setDepth(0);
    } else {
      // Fallback: the generated canvas texture from BootScene
      const bg = this.add.image(MAP_WIDTH_PX / 2, MAP_HEIGHT_PX / 2, "world-map");
      bg.setDisplaySize(MAP_WIDTH_PX, MAP_HEIGHT_PX);
      bg.setDepth(0);
    }

    // Create clickable hit areas and DOM room labels for all rooms
    for (const room of ROOMS) {
      this.drawRoomOverlay(room);
    }
  }

  /** Draws clickable zones, hover effects, labels, and click feedback for a room */
  private drawRoomOverlay(room: RoomDef): void {
    const { x: rx, y: ry, w, h } = room.bounds;
    const centerX = (rx + w / 2) * TILE_SIZE;
    const centerY = (ry + h / 2) * TILE_SIZE;

    // Clickable hit area
    const hitArea = this.add.rectangle(
      centerX, centerY, w * TILE_SIZE, h * TILE_SIZE, 0x000000, 0
    );
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => {
      this.bridge.emitRoomClicked(room.id);
      this.flashClickFeedback(room);
      this.dismissFirstVisit();
    });

    // Hover highlight
    const hoverBorder = this.add.rectangle(centerX, centerY, w * TILE_SIZE, h * TILE_SIZE);
    hoverBorder.setStrokeStyle(1, room.theme.accentColor, 0);
    hoverBorder.setFillStyle(0x000000, 0);
    hoverBorder.setDepth(2);

    // Hover label
    const accentHex = this.colorToHex(room.theme.accentColor);
    const label = this.add.text(centerX, ry * TILE_SIZE - 6, room.label, {
      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
      fontSize: "7px",
      color: accentHex,
      align: "center",
    });
    label.setOrigin(0.5, 1);
    label.setDepth(15);
    label.setAlpha(0);
    this.hoverLabels.set(room.id, label);

    hitArea.on("pointerover", () => {
      // Enhanced border
      hoverBorder.setStrokeStyle(1.5, room.theme.accentColor, 0.5);
      hoverBorder.setScale(1.02);
      // Boost room glow
      const glow = this.roomGlows.get(room.id);
      if (glow) {
        this.tweens.add({ targets: glow, alpha: 0.25, duration: 150, ease: "Sine.easeOut" });
      }
      // Show label
      this.tweens.add({ targets: label, alpha: 1, duration: 120, ease: "Sine.easeOut" });
    });

    hitArea.on("pointerout", () => {
      hoverBorder.setStrokeStyle(1, room.theme.accentColor, 0);
      hoverBorder.setScale(1);
      // Restore glow to breathing range
      const glow = this.roomGlows.get(room.id);
      if (glow) {
        this.tweens.add({ targets: glow, alpha: 0.10, duration: 300, ease: "Sine.easeIn" });
      }
      // Hide label
      this.tweens.add({ targets: label, alpha: 0, duration: 120, ease: "Sine.easeIn" });
    });
  }

  /** Brief white flash on room click */
  private flashClickFeedback(room: RoomDef): void {
    const { x: rx, y: ry, w, h } = room.bounds;
    const flash = this.add.rectangle(
      (rx + w / 2) * TILE_SIZE, (ry + h / 2) * TILE_SIZE,
      w * TILE_SIZE, h * TILE_SIZE, 0xffffff, 0
    );
    flash.setDepth(14);
    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.2 },
      duration: 80,
      yoyo: true,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  // ── NPC Spawning ────────────────────────────────────────────────────

  private spawnNPCs(): void {
    for (const room of getAgentRooms()) {
      const npc = new AgentNPC(this, room);
      this.npcs.set(room.agentKey!, npc);

      // NPC click handler
      npc.sprite.on("pointerdown", () => {
        this.bridge.emitNPCClicked(room.agentKey!);
      });
    }
  }

  // ── Main Agent ──────────────────────────────────────────────────────

  private spawnMainAgent(): void {
    const hatchery = ROOMS.find((r) => r.id === "hatchery")!;
    this.mainAgent = new MainAgent(
      this,
      hatchery.npcSpawn.x,
      hatchery.npcSpawn.y,
      this.pathfinding
    );
  }

  // ── Room Lighting ──────────────────────────────────────────────────

  private createRoomLighting(): void {
    if (!this.textures.exists("glow-circle")) return;

    for (const room of ROOMS) {
      const { x, y, w, h } = room.bounds;
      const centerX = (x + w / 2) * TILE_SIZE;
      const centerY = (y + h / 2) * TILE_SIZE;

      const glow = this.add.image(centerX, centerY, "glow-circle");
      glow.setTint(room.theme.accentColor);
      glow.setAlpha(0.10);
      glow.setScale((w * TILE_SIZE) / 64 * 1.5);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(1);

      // Breathing animation
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.06, to: 0.15 },
        duration: 3000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.roomGlows.set(room.id, glow);
    }

    // Corridor ambient lights at door intersections
    for (const room of ROOMS) {
      const dx = room.doorTile.x * TILE_SIZE + TILE_SIZE / 2;
      const dy = room.doorTile.y * TILE_SIZE + TILE_SIZE / 2;
      const corridorGlow = this.add.image(dx, dy, "glow-circle");
      corridorGlow.setTint(0x88ccff);
      corridorGlow.setAlpha(0.05);
      corridorGlow.setScale(1.0);
      corridorGlow.setBlendMode(Phaser.BlendModes.ADD);
      corridorGlow.setDepth(1);
    }
  }

  /** Flash a room's glow overlay briefly (called during pipeline events) */
  flashRoomGlow(roomId: string): void {
    const glow = this.roomGlows.get(roomId);
    if (!glow) return;
    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      duration: 200,
      yoyo: true,
      ease: "Cubic.easeOut",
    });
  }

  // ── Ambient Effects ─────────────────────────────────────────────────

  private createAmbientEffects(): void {
    if (!this.textures.exists("particles")) return;

    // Floating dust particles in corridors
    this.dustEmitter = this.add.particles(
      MAP_WIDTH_PX / 2,
      CORRIDOR_ROWS[0] * TILE_SIZE,
      "particles",
      {
        frame: 14, // gray
        speed: { min: 2, max: 8 },
        angle: { min: 0, max: 360 },
        lifespan: 4000,
        frequency: 1000,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.3, end: 0 },
        emitZone: {
          type: "random",
          source: new Phaser.Geom.Rectangle(
            -(MAP_WIDTH_PX / 2),
            -TILE_SIZE,
            MAP_WIDTH_PX,
            TILE_SIZE * 2
          ),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      }
    );
    this.dustEmitter.setDepth(13);
    this.ambientParticles.push(this.dustEmitter);

    // Lucifer room fire particles
    const luciferRoom = ROOMS.find((r) => r.id === "lucifer");
    if (luciferRoom) {
      const fireEmitter = this.add.particles(
        (luciferRoom.bounds.x + luciferRoom.bounds.w / 2) * TILE_SIZE,
        (luciferRoom.bounds.y + luciferRoom.bounds.h - 1) * TILE_SIZE,
        "particles",
        {
          frame: [2, 3], // red, orange
          speed: { min: 5, max: 15 },
          angle: { min: 250, max: 290 },
          lifespan: 800,
          frequency: 150,
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.7, end: 0 },
          blendMode: Phaser.BlendModes.ADD,
          emitZone: {
            type: "random",
            source: new Phaser.Geom.Rectangle(-20, -4, 40, 4),
          } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
        }
      );
      fireEmitter.setDepth(6);
      this.ambientParticles.push(fireEmitter);
    }

    // Victory fountain water
    const victoryRoom = ROOMS.find((r) => r.id === "victory");
    if (victoryRoom) {
      const waterEmitter = this.add.particles(
        victoryRoom.npcSpawn.x * TILE_SIZE,
        victoryRoom.npcSpawn.y * TILE_SIZE - 8,
        "particles",
        {
          frame: [4, 7], // blue, cyan
          speed: { min: 10, max: 25 },
          angle: { min: 240, max: 300 },
          lifespan: 1200,
          frequency: 200,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.5, end: 0 },
          gravityY: 20,
        }
      );
      waterEmitter.setDepth(6);
      this.ambientParticles.push(waterEmitter);
    }

    // STACK room price sparkle emitter (triggered on price updates)
    const stackRoom = ROOMS.find((r) => r.id === "stack");
    if (stackRoom) {
      this.stackSparkleEmitter = this.add.particles(
        (stackRoom.bounds.x + stackRoom.bounds.w / 2) * TILE_SIZE,
        (stackRoom.bounds.y + stackRoom.bounds.h / 2) * TILE_SIZE,
        "particles",
        {
          frame: [6, 3], // gold, orange
          speed: { min: 8, max: 20 },
          angle: { min: 240, max: 300 },
          lifespan: 600,
          quantity: 3,
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.8, end: 0 },
          emitting: false,
        }
      );
      this.stackSparkleEmitter.setDepth(12);
    }

    // Pipeline intensity: scale dust particles when pipeline is running
    this.bridge.on("pipeline:state", (state: import("@/store/useQuantikStore").PipelineState) => {
      if (!this.dustEmitter) return;
      if (state.running) {
        this.dustEmitter.setFrequency(400);
      } else {
        this.dustEmitter.setFrequency(1000);
      }
    });

    // Price update sparkles
    this.bridge.on("prices:update", () => {
      if (this.stackSparkleEmitter) {
        this.stackSparkleEmitter.explode(4);
      }
    });
  }

  // ── First-Visit Onboarding ─────────────────────────────────────────

  private createFirstVisitEffects(): void {
    const luciferRoom = ROOMS.find((r) => r.id === "lucifer");
    if (!luciferRoom) return;

    const { x: rx, y: ry, w, h } = luciferRoom.bounds;
    const centerX = (rx + w / 2) * TILE_SIZE;
    const centerY = (ry + h / 2) * TILE_SIZE;

    // ── Lucifer pulse ring ──
    if (this.textures.exists("glow-circle")) {
      const pulseGlow = this.add.image(centerX, centerY, "glow-circle");
      pulseGlow.setTint(0xff453a);
      pulseGlow.setAlpha(0);
      pulseGlow.setScale((w * TILE_SIZE) / 64 * 1.2);
      pulseGlow.setBlendMode(Phaser.BlendModes.ADD);
      pulseGlow.setDepth(3);
      this.firstVisitObjects.push(pulseGlow);

      // Pulse animation: scale + alpha
      this.tweens.add({
        targets: pulseGlow,
        alpha: { from: 0, to: 0.35 },
        scale: { from: (w * TILE_SIZE) / 64 * 1.0, to: (w * TILE_SIZE) / 64 * 1.8 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Outer expanding ring (use a rectangle stroke since circles can't tween stroke easily)
      const ringSize = w * TILE_SIZE;
      const ring = this.add.rectangle(centerX, centerY, ringSize, ringSize * (h / w));
      ring.setStrokeStyle(1.5, 0xff453a, 0.6);
      ring.setFillStyle(0x000000, 0);
      ring.setDepth(3);
      ring.setAlpha(0.6);
      this.firstVisitObjects.push(ring);

      this.tweens.add({
        targets: ring,
        scaleX: { from: 0.8, to: 1.6 },
        scaleY: { from: 0.8, to: 1.6 },
        alpha: { from: 0.6, to: 0 },
        duration: 1500,
        repeat: -1,
        ease: "Cubic.easeOut",
      });
    }

    // ── "CLICK TO EXPLORE" hint text ──
    const hintText = this.add.text(centerX, ry * TILE_SIZE - 10, "CLICK TO EXPLORE", {
      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
      fontSize: "7px",
      color: "#ff453a",
      align: "center",
    });
    hintText.setOrigin(0.5, 1);
    hintText.setDepth(15);
    hintText.setAlpha(0);
    this.firstVisitObjects.push(hintText);

    // Fade in hint after brief delay
    this.tweens.add({
      targets: hintText,
      alpha: { from: 0, to: 0.9 },
      duration: 600,
      delay: 800,
      ease: "Sine.easeOut",
    });

    // Gentle bob animation on hint
    this.tweens.add({
      targets: hintText,
      y: hintText.y - 2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Pulsing borders on ALL rooms (delayed) ──
    this.time.delayedCall(2000, () => {
      if (!this.isFirstVisit) return; // Already dismissed
      for (const room of ROOMS) {
        const { x, y, w: rw, h: rh } = room.bounds;
        const border = this.add.rectangle(
          (x + rw / 2) * TILE_SIZE, (y + rh / 2) * TILE_SIZE,
          rw * TILE_SIZE, rh * TILE_SIZE
        );
        border.setStrokeStyle(1, room.theme.accentColor, 1);
        border.setFillStyle(0x000000, 0);
        border.setDepth(3);
        border.setAlpha(0);
        this.firstVisitObjects.push(border);

        // 3 pulses then fade
        this.tweens.add({
          targets: border,
          alpha: { from: 0, to: 0.5 },
          duration: 600,
          yoyo: true,
          repeat: 2,
          ease: "Sine.easeInOut",
          onComplete: () => border.destroy(),
        });
      }
    });

    // Auto-dismiss after 15 seconds
    this.time.delayedCall(15000, () => this.dismissFirstVisit());
  }

  /** Dismiss first-visit onboarding and mark as visited */
  private dismissFirstVisit(): void {
    if (!this.isFirstVisit) return;
    this.isFirstVisit = false;

    try { localStorage.setItem(AGENTWORLD_LS_KEY, "true"); } catch {}

    // Fade out and destroy all onboarding objects
    for (const obj of this.firstVisitObjects) {
      if (obj && "alpha" in obj) {
        this.tweens.add({
          targets: obj,
          alpha: 0,
          duration: 300,
          ease: "Sine.easeIn",
          onComplete: () => obj.destroy(),
        });
      } else {
        obj.destroy();
      }
    }
    this.firstVisitObjects = [];
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  shutdown(): void {
    this.bridge.off("pipeline:state", this.pipelineDirector.onPipelineState, this.pipelineDirector);
    this.bridge.off("agent:event", this.pipelineDirector.onAgentEvent, this.pipelineDirector);
    this.bridge.off("trade:executed", this.pipelineDirector.onTradeExecuted, this.pipelineDirector);

    this.npcs.forEach((npc) => npc.destroy());
    this.mainAgent.destroy();
    this.ambientParticles.forEach((e) => e.destroy());
    this.roomGlows.forEach((g) => g.destroy());
    this.roomGlows.clear();
    this.firstVisitObjects.forEach((o) => o.destroy());
    this.firstVisitObjects = [];
    this.hoverLabels.forEach((l) => l.destroy());
    this.hoverLabels.clear();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }
}
