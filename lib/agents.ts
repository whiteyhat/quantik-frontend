// Centralized agent metadata — single source of truth for all 7 pipeline agents.

export const AGENT_NAMES = ["aura", "flux", "oracle", "edge", "clause", "lucifer", "sigma"] as const;
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
