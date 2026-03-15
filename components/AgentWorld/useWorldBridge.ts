import { useEffect, useRef } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useSocketEvent } from "@/context/SocketContext";
import type {
  AutopilotStatusEvent,
  PriceUpdateEventItem,
} from "@/context/SocketContext";
import { PhaserBridge, type AgentWorldEvent } from "./PhaserBridge";

// ─── useWorldBridge ───────────────────────────────────────────────────────────
// Connects React state (Zustand + Socket.io) to the Phaser game via PhaserBridge.

export function useWorldBridge(bridge: PhaserBridge | null) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const livePrices = useQuantikStore((s) => s.livePrices);
  const updatePrices = useQuantikStore((s) => s.updatePrices);
  const emittedStatuses = useRef<Record<string, AgentWorldEvent["type"] | undefined>>({});

  // Forward pipeline state changes to Phaser
  useEffect(() => {
    if (!bridge) return;
    bridge.emitPipelineState(pipeline);
  }, [bridge, pipeline]);

  // Derive agent lifecycle events from the pipeline store so the world reacts
  // immediately to SSE-driven runs even when no socket mirror exists.
  useEffect(() => {
    if (!bridge) return;

    for (const [agent, state] of Object.entries(pipeline.agents)) {
      const nextType =
        state.status === "running"
          ? "agent:start"
          : state.status === "done"
            ? "agent:complete"
            : state.status === "error"
              ? "agent:error"
              : undefined;
      const prevType = emittedStatuses.current[agent];

      if (!nextType || nextType === prevType) continue;

      bridge.emitAgentEvent({
        type: nextType,
        agent,
        data: state.data,
        error: state.error,
      });
      emittedStatuses.current[agent] = nextType;
    }

    if (!pipeline.running) {
      emittedStatuses.current = {};
    }
  }, [bridge, pipeline.agents, pipeline.running]);

  // Forward live prices to Phaser.
  useEffect(() => {
    if (!bridge || Object.keys(livePrices).length === 0) return;
    bridge.emitPriceUpdate(livePrices);
  }, [bridge, livePrices]);

  // Canonical live-price feed for Agent World: batched socket updates from the backend.
  useSocketEvent<PriceUpdateEventItem[]>("prices:update", (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const nextPrices = items.reduce<Record<string, { yes: number; no: number }>>(
      (acc, item) => {
        acc[item.slug] = { yes: item.yes, no: item.no };
        return acc;
      },
      {}
    );
    updatePrices(nextPrices);
  });

  // Forward socket events to Phaser
  useSocketEvent<{ agent: string; type: string; data?: unknown; error?: string }>(
    "agent:start",
    (data) => {
      if (!bridge || emittedStatuses.current[data.agent] === "agent:start") return;
      bridge.emitAgentEvent({
        type: "agent:start",
        agent: data.agent,
      });
      emittedStatuses.current[data.agent] = "agent:start";
    }
  );

  useSocketEvent<{ agent: string; type: string; data?: unknown }>(
    "agent:complete",
    (data) => {
      if (!bridge || emittedStatuses.current[data.agent] === "agent:complete") return;
      bridge.emitAgentEvent({
        type: "agent:complete",
        agent: data.agent,
        data: data.data,
      });
      emittedStatuses.current[data.agent] = "agent:complete";
    }
  );

  useSocketEvent<{ agent: string; type: string; error?: string }>(
    "agent:error",
    (data) => {
      if (!bridge || emittedStatuses.current[data.agent] === "agent:error") return;
      bridge.emitAgentEvent({
        type: "agent:error",
        agent: data.agent,
        error: data.error,
      });
      emittedStatuses.current[data.agent] = "agent:error";
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
