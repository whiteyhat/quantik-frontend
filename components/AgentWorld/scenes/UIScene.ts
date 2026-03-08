import Phaser from "phaser";
import { PhaserBridge, type AutopilotStatus, type AgentWorldEvent } from "../PhaserBridge";
import { MAP_WIDTH_PX, MAP_HEIGHT_PX, getRoomById, TILE_SIZE } from "../config/worldMap";
import type { PipelineState } from "@/store/useQuantikStore";

// ─── UI Scene ─────────────────────────────────────────────────────────────────
// Overlay scene for HUD elements: pipeline status indicators.
// Runs in parallel with WorldScene. All text-based info is shown
// via the React detail panel (AgentWorldTab) instead of in-game text.

export class UIScene extends Phaser.Scene {
  private bridge!: PhaserBridge;

  // Status dot (top-left)
  private statusDot!: Phaser.GameObjects.Arc;

  // Pipeline progress bar (top-right) — rectangles only, no text
  private pipelineSegments: Phaser.GameObjects.Rectangle[] = [];
  private pipelineSegmentBgs: Phaser.GameObjects.Rectangle[] = [];
  private pipelineAgentKeys = ["aura", "flux", "clause", "oracle", "edge", "lucifer", "sigma"];

  // Autopilot beacon dot (HATCHERY)
  private autopilotBeacon: Phaser.GameObjects.Arc | null = null;

  // Activity feed (bottom-left)
  private feedEntries: { text: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle }[] = [];
  private readonly maxFeedEntries = 4;

  constructor() {
    super({ key: "UIScene" });
  }

  create(): void {
    this.bridge = PhaserBridge.getInstance();

    this.createStatusDot();
    this.createPipelineIndicator();
    this.createAutopilotBeacon();

    // Listen for events
    this.bridge.on("pipeline:state", this.onPipelineState, this);
    this.bridge.on("autopilot:status", this.onAutopilotStatus, this);
    this.bridge.on("agent:event", this.onAgentEvent, this);
  }

  // ── Status Dot (top-left) ─────────────────────────────────────────

  private createStatusDot(): void {
    this.statusDot = this.add.circle(6, 6, 3, 0x888888, 0.6);
    this.statusDot.setDepth(100);
  }

  // ── Pipeline Indicator (top-right) ────────────────────────────────

  private createPipelineIndicator(): void {
    const segW = 14;
    const segH = 6;
    const gap = 2;
    const totalW = this.pipelineAgentKeys.length * (segW + gap) - gap;
    const startX = MAP_WIDTH_PX - totalW - 6;
    const startY = 4;

    for (let i = 0; i < this.pipelineAgentKeys.length; i++) {
      const x = startX + i * (segW + gap);

      // Background segment (dark)
      const bg = this.add.rectangle(x, startY, segW, segH, 0x1a1a2e, 0.8);
      bg.setOrigin(0, 0);
      bg.setDepth(100);
      bg.setStrokeStyle(0.5, 0x333355, 0.5);
      this.pipelineSegmentBgs.push(bg);

      // Foreground fill segment
      const seg = this.add.rectangle(x + 1, startY + 1, segW - 2, segH - 2, 0x333333, 1);
      seg.setOrigin(0, 0);
      seg.setDepth(101);
      this.pipelineSegments.push(seg);
    }
  }

  // ── Event Handlers ────────────────────────────────────────────────

  private onPipelineState = (state: PipelineState): void => {
    // Update status dot
    if (state.running) {
      this.statusDot.setFillStyle(0x30d158, 1);
      if (!this.tweens.isTweening(this.statusDot)) {
        this.tweens.add({
          targets: this.statusDot,
          scale: 1.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      this.statusDot.setFillStyle(0x888888, 0.6);
      this.tweens.killTweensOf(this.statusDot);
      this.statusDot.setScale(1);
    }

    // Update pipeline segments
    this.pipelineAgentKeys.forEach((key, i) => {
      const agentState = state.agents[key];
      if (!agentState || !this.pipelineSegments[i]) return;

      switch (agentState.status) {
        case "idle":
          this.pipelineSegments[i].setFillStyle(0x333333, 1);
          this.tweens.killTweensOf(this.pipelineSegments[i]);
          this.pipelineSegments[i].setAlpha(1);
          break;
        case "running":
          this.pipelineSegments[i].setFillStyle(0xff9f0a, 1);
          if (!this.tweens.isTweening(this.pipelineSegments[i])) {
            this.tweens.add({
              targets: this.pipelineSegments[i],
              alpha: 0.4,
              duration: 400,
              yoyo: true,
              repeat: -1,
            });
          }
          break;
        case "done":
          this.pipelineSegments[i].setFillStyle(0x30d158, 1);
          this.tweens.killTweensOf(this.pipelineSegments[i]);
          this.pipelineSegments[i].setAlpha(1);
          break;
        case "error":
          this.pipelineSegments[i].setFillStyle(0xff453a, 1);
          this.tweens.killTweensOf(this.pipelineSegments[i]);
          this.pipelineSegments[i].setAlpha(1);
          break;
      }
    });
  };

  // ── Autopilot Beacon (HATCHERY) ───────────────────────────────────

  private createAutopilotBeacon(): void {
    const hatchery = getRoomById("hatchery");
    if (!hatchery) return;

    const bx = (hatchery.bounds.x + hatchery.bounds.w - 1) * TILE_SIZE;
    const by = hatchery.bounds.y * TILE_SIZE + 4;

    this.autopilotBeacon = this.add.circle(bx, by, 3, 0x888888, 0.5);
    this.autopilotBeacon.setDepth(100);
  }

  private onAutopilotStatus = (status: AutopilotStatus): void => {
    if (!this.autopilotBeacon) return;

    if (status.circuitBreakerTriggered) {
      this.autopilotBeacon.setFillStyle(0xff453a, 0.8);
      this.tweens.killTweensOf(this.autopilotBeacon);
      this.tweens.add({
        targets: this.autopilotBeacon,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: 3,
      });
    } else if (status.isRunning) {
      this.autopilotBeacon.setFillStyle(0x30d158, 0.8);
      if (!this.tweens.isTweening(this.autopilotBeacon)) {
        this.tweens.add({
          targets: this.autopilotBeacon,
          alpha: 0.3,
          duration: 1000,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      this.autopilotBeacon.setFillStyle(0x888888, 0.5);
      this.tweens.killTweensOf(this.autopilotBeacon);
      this.autopilotBeacon.setAlpha(0.5);
    }
  };

  // ── Activity Feed (bottom-left) ──────────────────────────────────

  private onAgentEvent = (event: AgentWorldEvent): void => {
    if (!event.agent) return;
    const name = event.agent.toUpperCase();

    switch (event.type) {
      case "agent:start":
        this.addFeedEntry(`${name} started`, "#ff9f0a");
        break;
      case "agent:complete":
        this.addFeedEntry(`${name} done`, "#30d158");
        break;
      case "agent:error":
        this.addFeedEntry(`${name} error`, "#ff453a");
        break;
    }
  };

  private addFeedEntry(message: string, color: string): void {
    const feedX = 4;
    const feedBaseY = MAP_HEIGHT_PX - 8;
    const entryH = 10;

    // Slide existing entries up
    for (const entry of this.feedEntries) {
      entry.text.y -= entryH;
      entry.bg.y -= entryH;
    }

    // Remove oldest if at max
    if (this.feedEntries.length >= this.maxFeedEntries) {
      const oldest = this.feedEntries.shift();
      if (oldest) {
        this.tweens.add({
          targets: [oldest.text, oldest.bg],
          alpha: 0,
          duration: 200,
          onComplete: () => { oldest.text.destroy(); oldest.bg.destroy(); },
        });
      }
    }

    // Add new entry
    const bg = this.add.rectangle(feedX, feedBaseY, 0, entryH - 1, 0x0a0a1e, 0.7);
    bg.setOrigin(0, 0.5);
    bg.setDepth(102);

    const text = this.add.text(feedX + 3, feedBaseY, message, {
      fontSize: "6px",
      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
      color,
      resolution: 2,
    });
    text.setOrigin(0, 0.5);
    text.setDepth(103);
    text.setAlpha(0);

    // Size bg to text
    bg.width = text.width + 6;

    // Fade in
    this.tweens.add({
      targets: [text, bg],
      alpha: { from: 0, to: 1 },
      duration: 200,
    });

    // Auto-fade after 6s
    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: [text, bg],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          text.destroy();
          bg.destroy();
          const idx = this.feedEntries.findIndex((e) => e.text === text);
          if (idx >= 0) this.feedEntries.splice(idx, 1);
        },
      });
    });

    this.feedEntries.push({ text, bg });
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  shutdown(): void {
    this.bridge.off("pipeline:state", this.onPipelineState, this);
    this.bridge.off("autopilot:status", this.onAutopilotStatus, this);
    this.bridge.off("agent:event", this.onAgentEvent, this);
    this.feedEntries.forEach((e) => { e.text.destroy(); e.bg.destroy(); });
    this.feedEntries = [];
  }
}
