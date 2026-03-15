"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { InfraNodeData } from "../data/architectureData";

const CATEGORY_COLORS: Record<string, string> = {
  compute: "#64D2FF",
  data: "#30D158",
  messaging: "#FF9F0A",
  auth: "#BF5AF2",
  monitoring: "#FFD60A",
};

function InfraNodeComponent({ data }: NodeProps) {
  const d = data as unknown as InfraNodeData;
  const [hovered, setHovered] = useState(false);

  const accent = CATEGORY_COLORS[d.category] || "#64D2FF";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 140,
        minHeight: 55,
        borderRadius: 12,
        background: hovered
          ? `color-mix(in srgb, ${accent} 10%, rgba(255,255,255,0.06))`
          : `color-mix(in srgb, ${accent} 5%, rgba(255,255,255,0.04))`,
        backdropFilter: "blur(16px) saturate(150%)",
        WebkitBackdropFilter: "blur(16px) saturate(150%)",
        border: `1px solid ${
          hovered
            ? `color-mix(in srgb, ${accent} 40%, transparent)`
            : `color-mix(in srgb, ${accent} 20%, transparent)`
        }`,
        boxShadow: hovered
          ? `0 0 20px color-mix(in srgb, ${accent} 15%, transparent)`
          : "none",
        padding: "8px 10px",
        cursor: "pointer",
        transition:
          "border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, transform 200ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        transform: hovered ? "scale(1.03)" : "scale(1)",
      }}
    >
      {/* Row: icon + label + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>{d.icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.70)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            flex: 1,
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}
        >
          {d.label}
        </span>

        {/* Status indicator */}
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background:
              d.status === "online"
                ? "#30D158"
                : d.status === "degraded"
                ? "#FF9F0A"
                : "rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Category badge */}
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: accent,
          opacity: 0.7,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        }}
      >
        {d.category}
      </span>

      {/* Bidirectional handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="out-top"
        style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        style={{ background: `color-mix(in srgb, ${accent} 25%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        style={{ background: `color-mix(in srgb, ${accent} 25%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ background: `color-mix(in srgb, ${accent} 25%, transparent)`, border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{ background: `color-mix(in srgb, ${accent} 25%, transparent)`, border: "none", width: 4, height: 4 }}
      />
    </div>
  );
}

export const InfraNode = memo(InfraNodeComponent);
