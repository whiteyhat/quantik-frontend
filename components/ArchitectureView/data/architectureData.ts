import type { Node, Edge } from "@xyflow/react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MainNodeData {
  type: "main";
  emoji: string;
  label: string;
  code: string;
  status: string;
  [key: string]: unknown;
}

export interface SubAgentNodeData {
  type: "sub-agent";
  agentKey: string;
  emoji: string;
  label: string;
  role: string;
  accentColor: string;
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
  [key: string]: unknown;
}

export interface ServiceNodeData {
  type: "service";
  label: string;
  icon: string;
  parentAgent: string;
  status: "connected" | "disconnected" | "streaming";
  [key: string]: unknown;
}

export interface InfraNodeData {
  type: "infra";
  label: string;
  icon: string;
  category: "compute" | "data" | "messaging" | "auth" | "monitoring";
  status: "online" | "offline" | "degraded";
  connectedAgents: string[];
  [key: string]: unknown;
}

// ─── Typed Node Aliases (for ReactFlow generics) ────────────────────────────

export type MainNode = Node<MainNodeData>;
export type SubAgentNodeTyped = Node<SubAgentNodeData>;
export type ServiceNodeTyped = Node<ServiceNodeData>;
export type InfraNodeTyped = Node<InfraNodeData>;

// ─── Agent Metadata ──────────────────────────────────────────────────────────

export const AGENT_META: Record<
  string,
  { emoji: string; label: string; role: string; color: string }
> = {
  aura: { emoji: "🔮", label: "Aura", role: "Sentiment Analysis", color: "#BF5AF2" },
  edge: { emoji: "⚡", label: "Edge", role: "Data Ingestion", color: "#FF9F0A" },
  oracle: { emoji: "🧿", label: "Oracle", role: "Probability Engine", color: "#007AFF" },
  lucifer: { emoji: "😈", label: "Lucifer", role: "Risk Veto Protocol", color: "#FF453A" },
  flux: { emoji: "🌊", label: "Flux", role: "Liquidity Router", color: "#30D158" },
  clause: { emoji: "📜", label: "Clause", role: "Smart Contracts", color: "#64D2FF" },
  sigma: { emoji: "🎯", label: "Sigma", role: "Final Decision", color: "#FFD60A" },
};

// ─── Service definitions per agent ───────────────────────────────────────────

export const SERVICES: Record<string, { id: string; label: string; icon: string }[]> = {
  aura: [
    { id: "aura-sentiment", label: "Sentiment Analyzer", icon: "📊" },
    { id: "aura-news", label: "News Scraper", icon: "📰" },
    { id: "aura-bloomberg", label: "Bloomberg Feed", icon: "💹" },
    { id: "aura-reuters", label: "Reuters API", icon: "🗞️" },
    { id: "aura-twitter", label: "Twitter Firehose", icon: "🐦" },
    { id: "aura-fred", label: "FRED API", icon: "🏛️" },
    { id: "aura-metaculus", label: "Metaculus", icon: "🔮" },
    { id: "aura-coindesk", label: "CoinDesk", icon: "₿" },
    { id: "aura-guardian", label: "Guardian API", icon: "🗞️" },
    { id: "aura-nyt", label: "NYT API", icon: "📰" },
  ],
  edge: [
    { id: "edge-ingestion", label: "Data Ingestion", icon: "📥" },
    { id: "edge-onchain", label: "On-chain Indexer", icon: "⛓️" },
    { id: "edge-websockets", label: "WebSockets", icon: "🔌" },
    { id: "edge-rpc", label: "RPC Nodes", icon: "🖧" },
    { id: "edge-kelly", label: "Kelly Calculator", icon: "🎰" },
    { id: "edge-position", label: "Position Sizer", icon: "📐" },
  ],
  oracle: [
    { id: "oracle-ensemble", label: "Ensemble Engine", icon: "🧠" },
    { id: "oracle-pattern", label: "Pattern Matcher", icon: "🔍" },
    { id: "oracle-llm", label: "LLM Engine", icon: "🤖" },
    { id: "oracle-vectordb", label: "Vector DB", icon: "💾" },
    { id: "oracle-historical", label: "Historical Models", icon: "📈" },
    { id: "oracle-gemini", label: "Gemini AI", icon: "♊" },
    { id: "oracle-backtester", label: "Signal Backtester", icon: "🧪" },
  ],
  lucifer: [
    { id: "lucifer-veto", label: "Risk Veto Protocol", icon: "🛡️" },
    { id: "lucifer-slippage", label: "Slippage Monitor", icon: "📉" },
    { id: "lucifer-wallet", label: "WDK Wallet", icon: "👛" },
    { id: "lucifer-bankroll", label: "Bankroll Guardian", icon: "🏦" },
    { id: "lucifer-exposure", label: "Exposure Limits", icon: "⚠️" },
    { id: "lucifer-circuit", label: "Circuit Breaker", icon: "🔴" },
    { id: "lucifer-correlation", label: "Portfolio Correlation", icon: "🔗" },
  ],
  flux: [
    { id: "flux-router", label: "Liquidity Router", icon: "🔀" },
    { id: "flux-uniswap", label: "Uniswap V3", icon: "🦄" },
    { id: "flux-curve", label: "Curve Pools", icon: "〰️" },
    { id: "flux-1inch", label: "1inch Agg", icon: "🔗" },
    { id: "flux-depth", label: "Depth Analyzer", icon: "📊" },
  ],
  clause: [
    { id: "clause-contracts", label: "Smart Contracts", icon: "📝" },
    { id: "clause-solidity", label: "Solidity Verifier", icon: "✅" },
    { id: "clause-gas", label: "Gas Optimizer", icon: "⛽" },
    { id: "clause-resolution", label: "Resolution Monitor", icon: "⏱️" },
    { id: "clause-deadline", label: "Deadline Tracker", icon: "📅" },
  ],
  sigma: [
    { id: "sigma-statarb", label: "StatArb Core", icon: "📐" },
    { id: "sigma-meanrev", label: "Mean Reversion", icon: "↩️" },
    { id: "sigma-pairs", label: "Pairs Matrix", icon: "🔢" },
    { id: "sigma-zscore", label: "Z-Score Calc", icon: "📏" },
    { id: "sigma-consensus", label: "Agent Consensus", icon: "🤝" },
    { id: "sigma-execution", label: "Execution Bridge", icon: "🌉" },
  ],
};

// ─── Infrastructure category colors ─────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  compute: "#64D2FF",
  data: "#30D158",
  messaging: "#FF9F0A",
  auth: "#BF5AF2",
  monitoring: "#FFD60A",
};

// ─── Infrastructure nodes (outer ring) ──────────────────────────────────────

export const INFRA_NODES: {
  id: string;
  label: string;
  icon: string;
  category: InfraNodeData["category"];
  connectedTo: { target: string; intensity: "high" | "medium" | "low" }[];
  angle: number;
}[] = [
  {
    id: "infra-telegram",
    label: "Telegram Bot",
    icon: "📱",
    category: "messaging",
    connectedTo: [{ target: "fenrir", intensity: "medium" }],
    angle: -64,   // midpoint Aura(-90) ↔ Oracle(-38)
  },
  {
    id: "infra-scanner",
    label: "Market Scanner",
    icon: "📡",
    category: "compute",
    connectedTo: [
      { target: "fenrir", intensity: "high" },
      { target: "edge", intensity: "medium" },
      { target: "sigma", intensity: "medium" },
    ],
    angle: -12,   // midpoint Oracle(-38) ↔ Flux(14)
  },
  {
    id: "infra-autopilot",
    label: "Autopilot Engine",
    icon: "🤖",
    category: "compute",
    connectedTo: [
      { target: "fenrir", intensity: "high" },
      { target: "sigma", intensity: "medium" },
    ],
    angle: 40,    // midpoint Flux(14) ↔ Sigma(65)
  },
  {
    id: "infra-byo-mcp",
    label: "BYO MCP Server",
    icon: "🔧",
    category: "compute",
    connectedTo: [{ target: "fenrir", intensity: "medium" }],
    angle: 91,    // midpoint Sigma(65) ↔ Clause(116)
  },
  {
    id: "infra-database",
    label: "Database",
    icon: "🗄️",
    category: "data",
    connectedTo: [{ target: "fenrir", intensity: "high" }],
    angle: 142,   // midpoint Clause(116) ↔ Lucifer(167)
  },
  {
    id: "infra-redis",
    label: "Redis / BullMQ",
    icon: "⚡",
    category: "data",
    connectedTo: [{ target: "fenrir", intensity: "medium" }],
    angle: 193,   // midpoint Lucifer(167) ↔ Edge(218)
  },
  {
    id: "infra-sentry",
    label: "Sentry Monitoring",
    icon: "🛡️",
    category: "monitoring",
    connectedTo: [{ target: "fenrir", intensity: "low" }],
    angle: 244,   // midpoint Edge(218) ↔ Aura(270)
  },
  {
    id: "infra-trade-exec",
    label: "Trade Execution",
    icon: "💰",
    category: "compute",
    connectedTo: [
      { target: "sigma", intensity: "high" },
      { target: "flux", intensity: "medium" },
    ],
    angle: 116,   // near Clause, between Sigma ↔ Lucifer
  },
  {
    id: "infra-socketio",
    label: "Socket.IO Layer",
    icon: "🔌",
    category: "messaging",
    connectedTo: [{ target: "fenrir", intensity: "medium" }],
    angle: 167,   // near Lucifer gap
  },
  {
    id: "infra-wallet",
    label: "Wallet Manager",
    icon: "👛",
    category: "auth",
    connectedTo: [
      { target: "fenrir", intensity: "medium" },
      { target: "lucifer", intensity: "medium" },
    ],
    angle: 218,   // near Edge gap
  },
  {
    id: "infra-gemini",
    label: "Gemini AI",
    icon: "♊",
    category: "compute",
    connectedTo: [
      { target: "oracle", intensity: "high" },
      { target: "sigma", intensity: "high" },
      { target: "lucifer", intensity: "medium" },
    ],
    angle: -38,   // near Oracle
  },
  {
    id: "infra-clerk",
    label: "Clerk Auth",
    icon: "🔐",
    category: "auth",
    connectedTo: [{ target: "fenrir", intensity: "low" }],
    angle: 270,   // bottom, away from all agents
  },
];

// ─── Layout helpers ──────────────────────────────────────────────────────────

const CENTER = { x: 600, y: 500 };
const AGENT_RADIUS = 550;
const INFRA_RADIUS = 1550;

// Service grid layout (2 columns extending outward from each agent)
const SVC_START = 280;    // distance from agent to first row
const SVC_ROW_GAP = 130;  // spacing between rows
const SVC_COL_GAP = 220;  // column center-to-center spacing

// 7 agents arranged clockwise starting from top
export const AGENT_ANGLES: Record<string, number> = {
  aura: -90,       // top
  oracle: -38,     // top-right
  flux: 14,        // right
  sigma: 65,       // bottom-right
  clause: 116,     // bottom
  lucifer: 167,    // bottom-left
  edge: 218,       // left
};

function polarToXY(cx: number, cy: number, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

// ─── Build Nodes ─────────────────────────────────────────────────────────────

export function getInitialNodes(): Node[] {
  const nodes: Node[] = [];

  // Main agent node
  nodes.push({
    id: "fenrir",
    type: "agentNode",
    position: { x: CENTER.x - 90, y: CENTER.y - 90 },
    data: {
      type: "main",
      emoji: "🐺",
      label: "FENRIR-01",
      code: "Q-AGENT-X742",
      status: "active",
    } satisfies MainNodeData,
    draggable: true,
  });

  // Polymarket node (special, connected to multiple agents)
  nodes.push({
    id: "polymarket",
    type: "serviceNode",
    position: { x: CENTER.x - 60, y: CENTER.y - 1100 },
    data: {
      type: "service",
      label: "Polymarket CLOB",
      icon: "🟣",
      parentAgent: "shared",
      status: "streaming",
    } satisfies ServiceNodeData,
    draggable: true,
  });

  // Sub-agent nodes + their service nodes
  for (const [agentKey, angle] of Object.entries(AGENT_ANGLES)) {
    const meta = AGENT_META[agentKey];
    const pos = polarToXY(CENTER.x, CENTER.y, angle, AGENT_RADIUS);

    nodes.push({
      id: agentKey,
      type: "subAgentNode",
      position: { x: pos.x - 70, y: pos.y - 50 },
      data: {
        type: "sub-agent",
        agentKey,
        emoji: meta.emoji,
        label: meta.label,
        role: meta.role,
        accentColor: meta.color,
        status: "idle",
      } satisfies SubAgentNodeData,
      draggable: true,
    });

    // Service nodes in 2-column grid extending outward from agent
    const services = SERVICES[agentKey] || [];
    const rad = (angle * Math.PI) / 180;
    const outX = Math.cos(rad);
    const outY = Math.sin(rad);
    const latX = -Math.sin(rad);
    const latY = Math.cos(rad);

    services.forEach((svc, i) => {
      const row = Math.floor(i / 2);
      const isLastOdd = i === services.length - 1 && services.length % 2 === 1;
      const colOffset = isLastOdd ? 0 : (i % 2 === 0 ? -1 : 1) * (SVC_COL_GAP / 2);

      const dist = SVC_START + row * SVC_ROW_GAP;
      const svcX = pos.x + outX * dist + latX * colOffset;
      const svcY = pos.y + outY * dist + latY * colOffset;

      nodes.push({
        id: svc.id,
        type: "serviceNode",
        position: { x: svcX - 60, y: svcY - 25 },
        data: {
          type: "service",
          label: svc.label,
          icon: svc.icon,
          parentAgent: agentKey,
          status: "connected",
        } satisfies ServiceNodeData,
        draggable: true,
      });
    });
  }

  // Infrastructure nodes (outer ring)
  for (const infra of INFRA_NODES) {
    const pos = polarToXY(CENTER.x, CENTER.y, infra.angle, INFRA_RADIUS);
    nodes.push({
      id: infra.id,
      type: "infraNode",
      position: { x: pos.x - 70, y: pos.y - 27 },
      data: {
        type: "infra",
        label: infra.label,
        icon: infra.icon,
        category: infra.category,
        status: "online",
        connectedAgents: infra.connectedTo.map((c) => c.target),
      } satisfies InfraNodeData,
      draggable: true,
    });
  }

  return nodes;
}

// ─── Build Edges ─────────────────────────────────────────────────────────────

export function getInitialEdges(): Edge[] {
  const edges: Edge[] = [];

  // Main -> sub-agents
  for (const agentKey of Object.keys(AGENT_ANGLES)) {
    edges.push({
      id: `fenrir-${agentKey}`,
      source: "fenrir",
      target: agentKey,
      type: "animatedDataEdge",
      data: { intensity: "high" },
    });
  }

  // Sub-agents -> services
  for (const [agentKey, services] of Object.entries(SERVICES)) {
    for (const svc of services) {
      edges.push({
        id: `${agentKey}-${svc.id}`,
        source: agentKey,
        target: svc.id,
        type: "animatedDataEdge",
        data: { intensity: "low" },
      });
    }
  }

  // Polymarket connections (to edge and oracle)
  edges.push({
    id: "polymarket-edge",
    source: "polymarket",
    target: "edge",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });
  edges.push({
    id: "polymarket-oracle",
    source: "polymarket",
    target: "oracle",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });
  edges.push({
    id: "polymarket-sigma",
    source: "polymarket",
    target: "sigma",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });

  // Infrastructure -> agents
  for (const infra of INFRA_NODES) {
    for (const conn of infra.connectedTo) {
      edges.push({
        id: `${infra.id}-${conn.target}`,
        source: infra.id,
        target: conn.target,
        type: "animatedDataEdge",
        data: { intensity: conn.intensity },
      });
    }
  }

  return edges;
}

// SERVICE_DETAILS and ServiceDetailInfo are in ./serviceDetails.ts
// to reduce bundle size of this layout-critical module.
export type { ServiceDetailInfo } from "./serviceDetails";
export { SERVICE_DETAILS } from "./serviceDetails";

// This marker prevents accidental re-addition below.
// ─── End of architectureData.ts ─────────────────────────────────────────────
