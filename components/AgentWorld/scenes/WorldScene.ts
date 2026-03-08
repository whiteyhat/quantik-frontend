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

  constructor() {
    super({ key: "WorldScene" });
  }

  create(): void {
    this.bridge = PhaserBridge.getInstance();
    this.pathfinding = new PathfindingGrid();

    this.drawWorld();
    this.createRoomLighting();
    this.spawnNPCs();
    this.spawnMainAgent();
    this.createAmbientEffects();

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

  /** Draws clickable zones and hover effects for a room */
  private drawRoomOverlay(room: RoomDef): void {
    const { x: rx, y: ry, w, h } = room.bounds;

    // Clickable hit area
    const hitArea = this.add.rectangle(
      (rx + w / 2) * TILE_SIZE, (ry + h / 2) * TILE_SIZE,
      w * TILE_SIZE, h * TILE_SIZE, 0x000000, 0
    );
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => this.bridge.emitRoomClicked(room.id));

    // Hover highlight
    const hoverBorder = this.add.rectangle(
      (rx + w / 2) * TILE_SIZE, (ry + h / 2) * TILE_SIZE,
      w * TILE_SIZE, h * TILE_SIZE
    );
    hoverBorder.setStrokeStyle(1, room.theme.accentColor, 0);
    hoverBorder.setFillStyle(0x000000, 0);
    hoverBorder.setDepth(2);

    hitArea.on("pointerover", () => {
      hoverBorder.setStrokeStyle(1, room.theme.accentColor, 0.4);
    });
    hitArea.on("pointerout", () => {
      hoverBorder.setStrokeStyle(1, room.theme.accentColor, 0);
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
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }
}
