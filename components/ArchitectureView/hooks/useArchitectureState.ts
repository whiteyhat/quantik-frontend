"use client";

import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { getInitialNodes, getInitialEdges, type SubAgentNodeData } from "../data/architectureData";

// Precompute static nodes and edges once at module level
// (layout, services, infra never change at runtime)
const BASE_NODES = getInitialNodes();
const STATIC_EDGES = getInitialEdges();

/**
 * Merges static architecture data with live pipeline state from Zustand.
 * Only patches the main node + 7 sub-agent nodes; static nodes pass through unchanged.
 */
export function useArchitectureState() {
  const pipelineAgents = useQuantikStore((s) => s.pipeline.agents);
  const myAgent = useQuantikStore((s) => s.myAgent);

  const nodes = useMemo(() => {
    return BASE_NODES.map((node): Node => {
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

  return { nodes, edges: STATIC_EDGES };
}
