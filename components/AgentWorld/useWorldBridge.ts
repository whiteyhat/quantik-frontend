import { useEffect, useRef } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useSocketEvent } from "@/context/SocketContext";
import type { AutopilotStatusEvent } from "@/context/SocketContext";
import { PhaserBridge, type AgentWorldEvent } from "./PhaserBridge";

// ─── useWorldBridge ───────────────────────────────────────────────────────────
// Connects React state (Zustand + Socket.io) to the Phaser game via PhaserBridge.

export function useWorldBridge(bridge: PhaserBridge | null) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const livePrices = useQuantikStore((s) => s.livePrices);
  const prevRunning = useRef(pipeline.running);

  // Forward pipeline state changes to Phaser
  useEffect(() => {
    if (!bridge) return;
    bridge.emitPipelineState(pipeline);
    prevRunning.current = pipeline.running;
  }, [bridge, pipeline]);

  // Forward live prices to Phaser (B4)
  useEffect(() => {
    if (!bridge || Object.keys(livePrices).length === 0) return;
    bridge.emitPriceUpdate(livePrices);
  }, [bridge, livePrices]);

  // Forward socket events to Phaser
  useSocketEvent<{ agent: string; type: string; data?: unknown; error?: string }>(
    "agent:start",
    (data) => {
      if (!bridge) return;
      bridge.emitAgentEvent({
        type: "agent:start",
        agent: data.agent,
      });
    }
  );

  useSocketEvent<{ agent: string; type: string; data?: unknown }>(
    "agent:complete",
    (data) => {
      if (!bridge) return;
      bridge.emitAgentEvent({
        type: "agent:complete",
        agent: data.agent,
        data: data.data,
      });
    }
  );

  useSocketEvent<{ agent: string; type: string; error?: string }>(
    "agent:error",
    (data) => {
      if (!bridge) return;
      bridge.emitAgentEvent({
        type: "agent:error",
        agent: data.agent,
        error: data.error,
      });
    }
  );

  useSocketEvent("trade:executed", (data) => {
    if (!bridge) return;
    bridge.emitTradeEvent(data);
  });

  // Forward autopilot status to Phaser (B3)
  useSocketEvent<AutopilotStatusEvent>("autopilot:status", (data) => {
    if (!bridge) return;
    bridge.emitAutopilotStatus({
      isRunning: data.isRunning,
      lastScan: data.lastScan,
      tradesToday: data.tradesToday,
      circuitBreakerTriggered: data.circuitBreakerTriggered,
    });
  });

  // Phaser → React: handle room/NPC click events
  useEffect(() => {
    if (!bridge) return;

    const onRoomClicked = (roomId: string) => {
      bridge.emit("ui:room-detail", roomId);
    };

    const onNPCClicked = (data: { agentId: string }) => {
      bridge.emit("ui:room-detail", data.agentId);
    };

    bridge.on("room:clicked", onRoomClicked);
    bridge.on("npc:clicked", onNPCClicked);

    return () => {
      bridge.off("room:clicked", onRoomClicked);
      bridge.off("npc:clicked", onNPCClicked);
    };
  }, [bridge]);
}
