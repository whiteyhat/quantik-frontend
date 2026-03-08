import Phaser from "phaser";
import type { PipelineState } from "@/store/useQuantikStore";
import type { PhaserBridge, AgentWorldEvent } from "../PhaserBridge";
import type { MainAgent } from "../entities/MainAgent";
import type { AgentNPC } from "../entities/AgentNPC";
import type { WorldScene } from "../scenes/WorldScene";
import {
  PARALLEL_PHASE_ROOMS,
  getRoomByAgentKey,
  getRoomById,
  type RoomId,
} from "../config/worldMap";
import { TILE_SIZE } from "../config/worldMap";

// ─── Pipeline Director ────────────────────────────────────────────────────────
// Orchestrates main agent movement + NPC state changes based on real-time
// pipeline events from the PhaserBridge.

type DirectorState = "idle" | "pipeline_active" | "celebrating";

export class PipelineDirector {
  private scene: Phaser.Scene;
  private mainAgent: MainAgent;
  private npcs: Map<string, AgentNPC>;
  private bridge: PhaserBridge;

  private state: DirectorState = "idle";
  private currentAgentIndex = 0;
  private isNavigating = false;

  // Idle wandering
  private idleTimer = 0;
  private idleWanderInterval = 5000; // ms between wanders
  private idleTargetRoomIdx = 0;

  // Ghost copies for parallel phase
  private ghostSprites: Phaser.GameObjects.Sprite[] = [];

  // Parallel phase highlights
  private parallelHighlights: Phaser.GameObjects.Rectangle[] = [];
  private parallelComplete = 0;

  constructor(
    scene: Phaser.Scene,
    mainAgent: MainAgent,
    npcs: Map<string, AgentNPC>,
    bridge: PhaserBridge
  ) {
    this.scene = scene;
    this.mainAgent = mainAgent;
    this.npcs = npcs;
    this.bridge = bridge;

    // Check if pipeline is already running (scene initialized mid-pipeline)
    const cached = bridge.getPipelineState();
    if (cached?.running) {
      this.startPipeline();
    }
  }

  // ── Event Handlers (called from WorldScene bridge listeners) ────────

  onPipelineState = (state: PipelineState): void => {
    if (state.running && this.state !== "pipeline_active") {
      this.startPipeline();
    } else if (!state.running && this.state === "pipeline_active") {
      this.endPipeline(state.result);
    }
  };

  onAgentEvent = (event: AgentWorldEvent): void => {
    if (!event.agent) return;

    const npc = this.npcs.get(event.agent);
    if (!npc) return;

    switch (event.type) {
      case "agent:start":
        npc.setState("working");
        // Flash room glow
        (this.scene as WorldScene).flashRoomGlow?.(event.agent);

        // Navigate main agent to this room if not in parallel phase
        if (!PARALLEL_PHASE_ROOMS.includes(event.agent as RoomId)) {
          this.navigateToAgent(event.agent);
        }
        break;

      case "agent:complete":
        npc.setState("done_success");
        // Flash room glow
        (this.scene as WorldScene).flashRoomGlow?.(event.agent);
        // Track parallel phase completion
        if (PARALLEL_PHASE_ROOMS.includes(event.agent as RoomId)) {
          this.parallelComplete++;
          if (this.parallelComplete >= PARALLEL_PHASE_ROOMS.length) {
            this.clearParallelOverlay();
          }
        }
        break;

      case "agent:error":
        npc.setState("done_error");
        break;
    }
  };

  onTradeExecuted = (): void => {
    // Celebrate! Navigate to victory room
    this.state = "celebrating";
    const victory = getRoomById("victory");
    if (victory) {
      this.mainAgent.walkTo(victory.npcSpawn.x, victory.npcSpawn.y).then(() => {
        this.mainAgent.state = "celebrating";

        // Make all NPCs celebrate
        this.npcs.forEach((npc) => npc.setState("celebrating"));

        // Confetti burst + camera effects
        this.spawnConfetti();
        this.scene.cameras.main.shake(300, 0.005);
        this.scene.tweens.add({
          targets: this.scene.cameras.main,
          zoom: 1.15,
          duration: 500,
          yoyo: true,
          ease: "Sine.easeInOut",
        });

        // Return to idle after 5s
        this.scene.time.delayedCall(5000, () => {
          this.npcs.forEach((npc) => npc.setState("idle"));
          this.state = "idle";
          this.returnToHatchery();
        });
      });
    }
  };

  // ── Pipeline Flow ───────────────────────────────────────────────────

  private startPipeline(): void {
    this.state = "pipeline_active";
    this.currentAgentIndex = 0;
    this.clearGhosts();

    // Navigate to hatchery first, then start the pipeline walk
    const hatchery = getRoomById("hatchery")!;
    this.mainAgent.walkTo(hatchery.doorTile.x, hatchery.doorTile.y).then(() => {
      this.runParallelPhase();
    });
  }

  /** Parallel phase: AURA, FLUX, CLAUSE — show ghost copies visiting each */
  private runParallelPhase(): void {
    const parallelRooms = PARALLEL_PHASE_ROOMS.map((id) => getRoomByAgentKey(id)).filter(Boolean);
    this.parallelComplete = 0;

    // Main agent walks to corridor center
    const corridorY = 8; // main corridor between top and middle rooms
    const corridorCenterX = 14;

    this.mainAgent.walkTo(corridorCenterX, corridorY).then(() => {
      // Show "PARALLEL PHASE" label
      this.showParallelOverlay(parallelRooms as import("../config/worldMap").RoomDef[]);

      // Spawn ghost copies heading to each parallel room
      for (const room of parallelRooms) {
        if (!room) continue;
        this.spawnGhost(room.doorTile.x, room.doorTile.y, room.agentKey!);

        // Activate the NPC
        const npc = this.npcs.get(room.agentKey!);
        if (npc && npc.state === "idle") {
          npc.setState("activated");
        }
      }
    });
  }

  private spawnGhost(targetX: number, targetY: number, _agentKey: string): void {
    const ghost = this.scene.add.sprite(
      this.mainAgent.sprite.x,
      this.mainAgent.sprite.y,
      "main-agent",
      0
    );
    ghost.setDepth(9);
    ghost.setAlpha(0.4);
    ghost.setTint(0x8888ff);

    this.ghostSprites.push(ghost);

    // Tween ghost to target
    this.scene.tweens.add({
      targets: ghost,
      x: targetX * TILE_SIZE + TILE_SIZE / 2,
      y: targetY * TILE_SIZE + TILE_SIZE / 2,
      duration: 1500,
      ease: "Sine.easeInOut",
      onComplete: () => {
        // Ghost arrives, pulse and fade
        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          scale: 1.5,
          duration: 500,
          onComplete: () => ghost.destroy(),
        });
      },
    });
  }

  private clearGhosts(): void {
    this.ghostSprites.forEach((g) => g.destroy());
    this.ghostSprites = [];
  }

  /** Navigate main agent to a specific agent's room */
  private async navigateToAgent(agentKey: string): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;

    const room = getRoomByAgentKey(agentKey);
    if (!room) {
      this.isNavigating = false;
      return;
    }

    // Walk to room door first, then to NPC
    await this.mainAgent.walkTo(room.doorTile.x, room.doorTile.y);
    this.mainAgent.currentRoomId = room.id;
    this.bridge.emitRoomEntered(room.id);

    // Walk inside to NPC
    await this.mainAgent.walkTo(room.npcSpawn.x, room.npcSpawn.y - 1);
    this.mainAgent.state = "observing";

    // Activate NPC + interaction reaction
    const npc = this.npcs.get(agentKey);
    if (npc) {
      if (npc.state === "idle") {
        npc.setState("activated");
      }
      // NPC notices agent: exclamation particle
      this.spawnInteractionMarker(npc);
    }

    this.isNavigating = false;
  }

  private endPipeline(result: unknown): void {
    this.clearGhosts();

    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      const sigma = r.sigma as Record<string, unknown> | undefined;

      if (sigma?.decision === "BET_YES" || sigma?.decision === "BET_NO") {
        // Trade will be executed — wait for trade:executed event
        // Navigate to sigma first
        this.navigateToAgent("sigma");
      } else {
        // PASS — return to hatchery
        this.returnToHatchery();
      }
    } else {
      this.returnToHatchery();
    }
  }

  private async returnToHatchery(): Promise<void> {
    const hatchery = getRoomById("hatchery")!;
    await this.mainAgent.walkTo(hatchery.npcSpawn.x, hatchery.npcSpawn.y);
    this.mainAgent.currentRoomId = "hatchery";
    this.mainAgent.state = "idle";
    this.state = "idle";
  }

  private spawnConfetti(): void {
    if (!this.scene.textures.exists("particles")) return;

    const victory = getRoomById("victory");
    if (!victory) return;

    const cx = victory.npcSpawn.x * TILE_SIZE;
    const cy = victory.npcSpawn.y * TILE_SIZE;

    // Burst of colorful particles
    const emitter = this.scene.add.particles(cx, cy, "particles", {
      frame: [0, 1, 2, 3, 4, 5, 6, 7],
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      lifespan: 2000,
      quantity: 20,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
    });
    emitter.setDepth(25);
    emitter.explode(40);

    this.scene.time.delayedCall(2500, () => emitter.destroy());
  }

  // ── Interaction Effects ─────────────────────────────────────────────

  /** Spawn a brief exclamation/attention marker above an NPC when the main agent enters */
  private spawnInteractionMarker(npc: AgentNPC): void {
    if (!this.scene.textures.exists("particles")) return;
    const px = npc.sprite.x;
    const py = npc.sprite.y - 16;

    // Small sparkle burst in agent's color
    const colorMap: Record<string, number> = {
      aura: 5, oracle: 4, flux: 7, edge: 3, clause: 1, lucifer: 2, sigma: 5,
    };
    const frame = colorMap[npc.agentKey] ?? 0;

    const emitter = this.scene.add.particles(px, py, "particles", {
      frame,
      speed: { min: 8, max: 18 },
      angle: { min: 240, max: 300 },
      lifespan: 500,
      quantity: 3,
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(12);
    emitter.explode(3);
    this.scene.time.delayedCall(600, () => emitter.destroy());

    // Brief attention pulse on sprite
    this.scene.tweens.add({
      targets: npc.sprite,
      scaleX: 0.85,
      scaleY: 0.65,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  // ── Parallel Phase Overlay ──────────────────────────────────────────

  private showParallelOverlay(rooms: import("../config/worldMap").RoomDef[]): void {
    // Pulsing border highlights on parallel rooms
    for (const room of rooms) {
      const { x, y, w, h } = room.bounds;
      const rect = this.scene.add.rectangle(
        (x + w / 2) * TILE_SIZE,
        (y + h / 2) * TILE_SIZE,
        w * TILE_SIZE,
        h * TILE_SIZE,
        room.theme.accentColor,
        0
      );
      rect.setStrokeStyle(1, room.theme.accentColor, 0.6);
      rect.setDepth(13);
      this.parallelHighlights.push(rect);

      this.scene.tweens.add({
        targets: rect,
        alpha: 0.15,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private clearParallelOverlay(): void {
    this.parallelHighlights.forEach((r) => {
      this.scene.tweens.killTweensOf(r);
      this.scene.tweens.add({ targets: r, alpha: 0, duration: 300, onComplete: () => r.destroy() });
    });
    this.parallelHighlights = [];
  }

  // ── Idle Wandering ──────────────────────────────────────────────────

  update(delta: number): void {
    if (this.state !== "idle") return;

    this.idleTimer += delta;
    if (this.idleTimer >= this.idleWanderInterval && !this.isNavigating) {
      this.idleTimer = 0;
      this.idleWanderInterval = 4000 + Math.random() * 6000; // 4-10s
      this.doIdleWander();
    }
  }

  private async doIdleWander(): Promise<void> {
    if (this.isNavigating || this.state !== "idle") return;
    this.isNavigating = true;

    // Pick a random room to visit
    const allRoomIds: RoomId[] = ["aura", "oracle", "hatchery", "clause", "flux", "stack", "sigma", "edge", "lucifer", "victory"];
    const targetId = allRoomIds[this.idleTargetRoomIdx % allRoomIds.length];
    this.idleTargetRoomIdx++;

    const room = getRoomById(targetId);
    if (!room) {
      this.isNavigating = false;
      return;
    }

    // Walk to room door
    await this.mainAgent.walkTo(room.doorTile.x, room.doorTile.y);

    if (this.state !== "idle") {
      this.isNavigating = false;
      return;
    }

    // Enter room briefly
    this.mainAgent.currentRoomId = room.id;
    this.bridge.emitRoomEntered(room.id);
    await this.mainAgent.walkTo(room.npcSpawn.x, room.npcSpawn.y - 1);

    // NPC interaction reaction
    if (room.agentKey) {
      const npc = this.npcs.get(room.agentKey);
      if (npc) this.spawnInteractionMarker(npc);
    }

    // Pause inside for 2-4s
    await new Promise<void>((resolve) => {
      this.scene.time.delayedCall(2000 + Math.random() * 2000, resolve);
    });

    // Walk back to door
    await this.mainAgent.walkTo(room.doorTile.x, room.doorTile.y);

    this.isNavigating = false;
  }
}
