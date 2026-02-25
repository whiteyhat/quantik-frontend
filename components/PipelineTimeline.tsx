"use client";

import { useState } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";

const AGENT_COLORS: Record<string, string> = {
  aura: "rgba(120, 40, 200, 0.6)",
  flux: "rgba(0, 122, 255, 0.6)",
  oracle: "rgba(191, 90, 242, 0.6)",
  edge: "rgba(48, 209, 88, 0.6)",
  clause: "rgba(255, 159, 10, 0.6)",
  lucifer: "rgba(255, 69, 58, 0.6)",
  sigma: "rgba(0, 122, 255, 0.8)",
};

const AGENT_NAMES: Record<string, string> = {
  aura: "Aura",
  flux: "Flux",
  oracle: "Oracle",
  edge: "Edge",
  clause: "Clause",
  lucifer: "Lucifer",
  sigma: "Sigma",
};

const AGENT_ORDER = ["aura", "flux", "oracle", "edge", "clause", "lucifer", "sigma"];

interface PipelineTimelineProps {
  durations?: Record<string, number>; // agent key -> ms
}

export function PipelineTimeline({ durations }: PipelineTimelineProps) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  // Only show after pipeline completes
  if (pipeline.running || !pipeline.result) return null;

  // Use provided durations or generate mock proportions
  const durs = durations || {};
  const totalDuration = AGENT_ORDER.reduce((sum, key) => sum + (durs[key] || 1000), 0);

  if (totalDuration === 0) return null;

  return (
    <div style={{ marginTop: 12, position: "relative" }}>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          display: "flex",
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {AGENT_ORDER.map((key) => {
          const dur = durs[key] || 1000;
          const pct = (dur / totalDuration) * 100;
          return (
            <div
              key={key}
              onMouseEnter={() => setHoveredAgent(key)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                width: `${pct}%`,
                background: AGENT_COLORS[key],
                transition: "opacity 200ms ease",
                opacity: hoveredAgent && hoveredAgent !== key ? 0.4 : 1,
                cursor: "pointer",
                position: "relative",
              }}
            />
          );
        })}
      </div>

      {/* Tooltip */}
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
            {AGENT_NAMES[hoveredAgent]}: {((durs[hoveredAgent] || 1000) / 1000).toFixed(1)}s
          </span>
        </div>
      )}
    </div>
  );
}
