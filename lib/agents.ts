// Centralized agent metadata — single source of truth for all 7 pipeline agents.

export const AGENT_NAMES = ["aura", "flux", "clause", "oracle", "edge", "lucifer", "sigma"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export function isAgentName(value: string): value is AgentName {
  return AGENT_NAMES.includes(value as AgentName);
}

export const AGENT_OUTPUT_KEYS: Record<AgentName, string> = {
  aura: "aura_output",
  flux: "flux_output",
  oracle: "oracle_output",
  edge: "edge_output",
  clause: "clause_output",
  lucifer: "lucifer_output",
  sigma: "sigma_output",
};

export interface AgentMeta {
  emoji: string;
  name: string;
  role: string;
  color: string;
}

export const AGENT_META: Record<AgentName, AgentMeta> = {
  aura:    { emoji: "\u{1F30A}", name: "Aura",    role: "Sentiment",        color: "#0a84ff" },
  flux:    { emoji: "\u26A1",     name: "Flux",    role: "Liquidity",        color: "#0a84ff" },
  oracle:  { emoji: "\u{1F52E}", name: "Oracle",  role: "Forecasting",      color: "#0a84ff" },
  edge:    { emoji: "\u{1F4D0}", name: "Edge",    role: "Calibration",      color: "#ff9f0a" },
  clause:  { emoji: "\u2696\uFE0F", name: "Clause", role: "Resolution",    color: "#30d158" },
  lucifer: { emoji: "\u{1F608}", name: "Lucifer", role: "Devil's Advocate", color: "#bf5af2" },
  sigma:   { emoji: "\u{1F9E9}", name: "Sigma",   role: "Synthesis",        color: "#0a84ff" },
};

// ── Personality types ─────────────────────────────────────────

export const PERSONALITIES = ["guardian", "balanced", "adventurer"] as const;
export type Personality = (typeof PERSONALITIES)[number];

// ── Agent chip colors (for routing/tag UI) ────────────────────

export interface AgentChipColors {
  bg: string;
  fg: string;
  border: string;
}

const DEFAULT_CHIP: AgentChipColors = {
  bg: "rgba(255,255,255,0.06)",
  fg: "rgba(255,255,255,0.50)",
  border: "rgba(255,255,255,0.10)",
};

export function agentChipColor(agent: string): AgentChipColors {
  switch (agent) {
    case "aura":
      return { bg: "rgba(10,132,255,0.12)", fg: "#0a84ff", border: "rgba(10,132,255,0.25)" };
    case "oracle":
      return { bg: "rgba(191,90,242,0.12)", fg: "#bf5af2", border: "rgba(191,90,242,0.25)" };
    case "edge":
      return { bg: "rgba(255,159,10,0.12)", fg: "#ff9f0a", border: "rgba(255,159,10,0.25)" };
    case "flux":
      return { bg: "rgba(48,209,88,0.12)", fg: "#30d158", border: "rgba(48,209,88,0.25)" };
    case "risk":
      return { bg: "rgba(255,69,58,0.12)", fg: "#ff453a", border: "rgba(255,69,58,0.25)" };
    default:
      return DEFAULT_CHIP;
  }
}
