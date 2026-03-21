// ─── Shared constants & helpers for ArchitectureView ────────────────────────

// Font family constants (eliminates 27 inline repetitions)
export const MONO_FONT = '"SF Mono", "JetBrains Mono", monospace';
export const MONO_FONT_LIGHT = '"SF Mono", monospace';

// Status color helpers (each was duplicated in node component + NodeDetailPanel)

export function agentStatusColor(status: string): string {
  if (status === "running") return "var(--ios-blue)";
  if (status === "done") return "var(--ios-green)";
  if (status === "error") return "var(--ios-red)";
  return "rgba(255,255,255,0.20)";
}

export function serviceStatusColor(status: string): string {
  if (status === "streaming") return "var(--ios-blue)";
  if (status === "connected") return "var(--ios-green)";
  return "rgba(255,255,255,0.15)";
}

export function infraStatusColor(status: string): string {
  if (status === "online") return "#30D158";
  if (status === "degraded") return "#FF9F0A";
  return "rgba(255,255,255,0.15)";
}
