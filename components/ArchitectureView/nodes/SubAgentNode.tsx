"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SubAgentNodeData } from "../data/architectureData";

function SubAgentNodeComponent({ data }: NodeProps) {
  const d = data as unknown as SubAgentNodeData;
  const [hovered, setHovered] = useState(false);
  const isRunning = d.status === "running";
  const isDone = d.status === "done";
  const isError = d.status === "error";

  const statusColor = isRunning
    ? "var(--ios-blue)"
    : isDone
    ? "var(--ios-green)"
    : isError
    ? "var(--ios-red)"
    : "rgba(255,255,255,0.20)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 140,
        minHeight: 80,
        borderRadius: 16,
        background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: `1px solid ${hovered ? d.accentColor + "50" : isRunning ? d.accentColor + "60" : "rgba(255,255,255,0.08)"}`,
        borderRight: `1px solid ${hovered ? d.accentColor + "50" : isRunning ? d.accentColor + "60" : "rgba(255,255,255,0.08)"}`,
        borderBottom: `1px solid ${hovered ? d.accentColor + "50" : isRunning ? d.accentColor + "60" : "rgba(255,255,255,0.08)"}`,
        borderLeft: `3px solid ${d.accentColor}`,
        boxShadow: hovered
          ? `0 0 24px ${d.accentColor}30, 0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)`
          : isRunning
          ? `0 0 20px ${d.accentColor}20, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
          : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        padding: "12px 14px",
        cursor: "pointer",
        transition: "border-color 300ms ease, box-shadow 300ms ease, background 300ms ease, transform 300ms ease",
        position: "relative",
        transform: hovered ? "scale(1.03)" : "scale(1)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{d.emoji}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            flex: 1,
          }}
        >
          {d.label}
        </span>

        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {isRunning && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: statusColor,
                animation: "pulse-ring 1.2s ease-out infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Role */}
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", display: "block" }}>
        {d.role}
      </span>

      {/* Latency badge */}
      {d.latencyMs !== undefined && isDone && (
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.30)",
            fontFamily: '"SF Mono", monospace',
            marginTop: 4,
            display: "block",
          }}
        >
          {(d.latencyMs / 1000).toFixed(1)}s
        </span>
      )}

      {/* Target handle (from FENRIR) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: d.accentColor, border: "none", width: 6, height: 6, opacity: 0.7 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        style={{ background: d.accentColor, border: "none", width: 6, height: 6, opacity: 0.7 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ background: d.accentColor, border: "none", width: 6, height: 6, opacity: 0.7 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{ background: d.accentColor, border: "none", width: 6, height: 6, opacity: 0.7 }}
      />

      {/* Source handles (to services) */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: "rgba(255,255,255,0.20)", border: "none", width: 5, height: 5 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="out-top"
        style={{ background: "rgba(255,255,255,0.20)", border: "none", width: 5, height: 5 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        style={{ background: "rgba(255,255,255,0.20)", border: "none", width: 5, height: 5 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={{ background: "rgba(255,255,255,0.20)", border: "none", width: 5, height: 5 }}
      />
    </div>
  );
}

export const SubAgentNode = memo(SubAgentNodeComponent);
