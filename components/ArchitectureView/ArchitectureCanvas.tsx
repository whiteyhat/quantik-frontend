"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./nodes/AgentNode";
import { SubAgentNode } from "./nodes/SubAgentNode";
import { ServiceNode } from "./nodes/ServiceNode";
import { InfraNode } from "./nodes/InfraNode";
import { AnimatedDataEdge } from "./edges/AnimatedDataEdge";
import { NodeDetailPanel } from "./panels/NodeDetailPanel";
import { useArchitectureState } from "./hooks/useArchitectureState";
import { MONO_FONT_LIGHT } from "./shared";

const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
  subAgentNode: SubAgentNode,
  serviceNode: ServiceNode,
  infraNode: InfraNode,
};

const edgeTypes: EdgeTypes = {
  animatedDataEdge: AnimatedDataEdge,
};

const defaultEdgeOptions = {
  animated: false, // we handle animation in custom edge
};

export function ArchitectureCanvas() {
  const t = useTranslations("manageAgent.architecture");
  const { nodes: initialNodes, edges: initialEdges } = useArchitectureState();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { fitView, getNode } = useReactFlow();

  // Sync live data into nodes when pipeline state changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const miniMapNodeColor = useCallback((node: Node) => {
    const type = (node.data as { type?: string })?.type;
    if (type === "main") return "#007AFF";
    if (type === "sub-agent") {
      const color = (node.data as { accentColor?: string })?.accentColor;
      return color || "rgba(255,255,255,0.20)";
    }
    if (type === "infra") return "#64D2FF";
    return "rgba(255,255,255,0.10)";
  }, []);

  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      const targetNode = getNode(nodeId);
      if (!targetNode) return;

      // Close current panel, navigate, then open target's panel
      setSelectedNode(null);
      setTimeout(() => {
        fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.5, maxZoom: 1.5 });
        setTimeout(() => {
          const freshNode = getNode(nodeId);
          if (freshNode) setSelectedNode(freshNode);
        }, 650);
      }, 220); // wait for panel exit animation
    },
    [fitView, getNode]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* SVG filter for glow effects */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        connectionLineStyle={{ stroke: "rgba(0,122,255,0.3)", strokeWidth: 1 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          showInteractive={false}
          position="top-right"
        />
        <MiniMap
          position="bottom-left"
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.70)"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      </ReactFlow>

      {/* Detail panel (slides in from right) */}
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onNavigateToNode={handleNavigateToNode}
      />

      {/* Info badge */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.70)" }}>
          {t("infoBadgeTitle")}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            fontFamily: MONO_FONT_LIGHT,
          }}
        >
          {t("infoBadgeSubtitle")}
        </span>
      </div>
    </div>
  );
}
