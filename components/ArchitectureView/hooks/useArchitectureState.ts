"use client";

import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { getInitialNodes, getInitialEdges, type SubAgentNodeData } from "../data/architectureData";

/**
 * Merges static architecture data with live pipeline state from Zustand.
 * Updates sub-agent node statuses based on pipeline.agents state.
 */
export function useArchitectureState() {
  const pipelineAgents = useQuantikStore((s) => s.pipeline.agents);
  const myAgent = useQuantikStore((s) => s.myAgent);

  const nodes = useMemo(() => {
    const base = getInitialNodes();

    return base.map((node): Node => {
      // Update main node with real agent data
      if (node.id === "fenrir" && myAgent) {
        return {
          ...node,
          data: {
            ...node.data,
            emoji: myAgent.avatar_emoji || "🐺",
            label: myAgent.name || "FENRIR-01",
            code: myAgent.agent_code || "Q-AGENT-X742",
            status: myAgent.status || "active",
          },
        };
      }

      // Update sub-agent nodes with pipeline status
      const nodeData = node.data as unknown as { type?: string; agentKey?: string };
      if (nodeData.type === "sub-agent" && nodeData.agentKey) {
        const agentState = pipelineAgents[nodeData.agentKey];
        if (agentState) {
          return {
            ...node,
            data: {
              ...node.data,
              status: agentState.status,
              latencyMs: agentState.latencyMs,
            } as unknown as SubAgentNodeData,
          };
        }
      }

      return node;
    });
  }, [pipelineAgents, myAgent]);

  const edges = useMemo(() => getInitialEdges(), []);

  return { nodes, edges };
}
