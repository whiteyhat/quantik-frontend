"use client";

import { useState } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";

const AGENT_COLORS: Record<string, string> = {
  aura:   "rgba(120, 40, 200, 0.6)",
  flux:   "rgba(0, 122, 255, 0.6)",
  oracle: "rgba(191, 90, 242, 0.6)",
  edge:   "rgba(48, 209, 88, 0.6)",
  clause: "rgba(255, 159, 10, 0.6)",
  lucifer:"rgba(255, 69, 58, 0.6)",
  sigma:  "rgba(0, 122, 255, 0.8)",
};

const AGENT_NAMES: Record<string, string> = {
  aura: "Aura", flux: "Flux", oracle: "Oracle", edge: "Edge",
  clause: "Clause", lucifer: "Lucifer", sigma: "Sigma",
};

const AGENT_ORDER = ["aura", "flux", "oracle", "edge", "clause", "lucifer", "sigma"];

export function PipelineTimeline() {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  if (pipeline.running || !pipeline.result) return null;

  // Build durations from real latencyMs values stored in agents
  const timed = AGENT_ORDER.filter((k) => (pipeline.agents[k]?.latencyMs ?? 0) > 0);
  if (timed.length === 0) return null;

  const totalMs = timed.reduce((sum, k) => sum + (pipeline.agents[k]?.latencyMs ?? 0), 0);
  if (totalMs === 0) return null;

  return (
    <div style={{ marginTop: 12, position: "relative" }}>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          display: "flex",
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          gap: 1,
        }}
      >
        {timed.map((key) => {
          const ms = pipeline.agents[key]?.latencyMs ?? 0;
          const pct = (ms / totalMs) * 100;
          return (
            <div
              key={key}
              onMouseEnter={() => setHoveredAgent(key)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                width: `${pct}%`,
                background: AGENT_COLORS[key],
                transition: "opacity 200ms ease",
                opacity: hoveredAgent && hoveredAgent !== key ? 0.35 : 1,
                cursor: "pointer",
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredAgent && (
        <div
          className="glass-card-elevated"
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "4px 12px",
            borderRadius: 8,
            fontSize: "var(--text-caption)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>
            {AGENT_NAMES[hoveredAgent]}:{" "}
            <span className="font-mono-data">
              {((pipeline.agents[hoveredAgent]?.latencyMs ?? 0) / 1000).toFixed(2)}s
            </span>
          </span>
        </div>
      )}

      {/* Total time label */}
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span
          className="font-mono-data"
          style={{ fontSize: 10, color: "var(--text-tertiary)" }}
        >
          Total: {(totalMs / 1000).toFixed(2)}s
        </span>
      </div>
    </div>
  );
}
