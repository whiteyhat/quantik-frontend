import Phaser from "phaser";
import type { PipelineState, AgentCardState } from "@/store/useQuantikStore";

// ─── Event Types ──────────────────────────────────────────────────────────────

export interface AgentWorldEvent {
  type: "agent:start" | "agent:complete" | "agent:error" | "pipeline:start" | "pipeline:complete";
  agent?: string;
  data?: unknown;
  error?: string;
}

export interface HealthStatus {
  agentId: string;
  status: "live" | "idle" | "degraded" | "down";
  latencyMs: number;
}

export interface AutopilotStatus {
  isRunning: boolean;
  lastScan: string | null;
  tradesToday: number;
  circuitBreakerTriggered: boolean;
}

// ─── Bridge ───────────────────────────────────────────────────────────────────
// Singleton event emitter shared between React world and Phaser scenes.

export class PhaserBridge extends Phaser.Events.EventEmitter {
  private static instance: PhaserBridge | null = null;

  // Pipeline state cache for scenes that initialize late
  private lastPipelineState: PipelineState | null = null;

  static getInstance(): PhaserBridge {
    if (!PhaserBridge.instance) {
      PhaserBridge.instance = new PhaserBridge();
    }
    return PhaserBridge.instance;
  }

  static destroy(): void {
    if (PhaserBridge.instance) {
      PhaserBridge.instance.removeAllListeners();
      PhaserBridge.instance = null;
    }
  }

  // ── React → Phaser ──────────────────────────────────────────────────

  /** Forward full pipeline state snapshot */
  emitPipelineState(state: PipelineState): void {
    this.lastPipelineState = state;
    this.emit("pipeline:state", state);
  }

  /** Forward individual agent event */
  emitAgentEvent(event: AgentWorldEvent): void {
    this.emit("agent:event", event);
  }

  /** Forward health status updates */
  emitHealthUpdate(statuses: HealthStatus[]): void {
    this.emit("health:update", statuses);
  }

  /** Forward trade execution event */
  emitTradeEvent(data: unknown): void {
    this.emit("trade:executed", data);
  }

  /** Forward autopilot status */
  emitAutopilotStatus(status: AutopilotStatus): void {
    this.emit("autopilot:status", status);
  }

  /** Forward live price updates */
  emitPriceUpdate(prices: Record<string, { yes: number; no: number }>): void {
    this.emit("prices:update", prices);
  }

  /** Get cached pipeline state */
  getPipelineState(): PipelineState | null {
    return this.lastPipelineState;
  }

  // ── Phaser → React ──────────────────────────────────────────────────

  /** Emitted when player clicks a room */
  emitRoomClicked(roomId: string): void {
    this.emit("room:clicked", roomId);
  }

  /** Emitted when player clicks an NPC */
  emitNPCClicked(agentId: string, data?: AgentCardState): void {
    this.emit("npc:clicked", { agentId, data });
  }

  /** Emitted when main agent enters a room */
  emitRoomEntered(roomId: string): void {
    this.emit("room:entered", roomId);
  }
}
