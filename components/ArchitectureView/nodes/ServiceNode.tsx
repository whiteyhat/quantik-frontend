"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ServiceNodeTyped } from "../data/architectureData";
import { MONO_FONT, serviceStatusColor } from "../shared";

function ServiceNodeComponent({ data }: NodeProps<ServiceNodeTyped>) {
  const [hovered, setHovered] = useState(false);

  const isPolymarket = data.label.toLowerCase().includes("polymarket");

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 120,
        minHeight: 50,
        borderRadius: 12,
        background: hovered
          ? isPolymarket ? "rgba(191,90,242,0.12)" : "rgba(255,255,255,0.07)"
          : isPolymarket ? "rgba(191,90,242,0.08)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px) saturate(150%)",
        WebkitBackdropFilter: "blur(16px) saturate(150%)",
        border: `1px ${hovered ? "solid" : "dashed"} ${
          hovered
            ? isPolymarket ? "rgba(191,90,242,0.45)" : "rgba(255,255,255,0.14)"
            : isPolymarket ? "rgba(191,90,242,0.30)" : "rgba(255,255,255,0.06)"
        }`,
        boxShadow: hovered
          ? isPolymarket ? "0 0 20px rgba(191,90,242,0.15)" : "0 4px 16px rgba(0,0,0,0.2)"
          : isPolymarket ? "0 0 16px rgba(191,90,242,0.08)" : "none",
        padding: "8px 10px",
        cursor: "pointer",
        transition: "border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, transform 200ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        transform: hovered ? "scale(1.03)" : "scale(1)",
      }}
    >
      {/* Row: icon + label + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12 }}>{data.icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.60)",
            fontFamily: MONO_FONT,
            flex: 1,
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}
        >
          {data.label}
        </span>

        {/* Status indicator */}
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: serviceStatusColor(data.status),
            flexShrink: 0,
          }}
        />
      </div>

      {/* All-direction handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: "rgba(255,255,255,0.15)", border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        style={{ background: "rgba(255,255,255,0.15)", border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ background: "rgba(255,255,255,0.15)", border: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{ background: "rgba(255,255,255,0.15)", border: "none", width: 4, height: 4 }}
      />

      {/* Source handles for Polymarket (connects to multiple agents) */}
      {isPolymarket && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="out"
            style={{ background: "rgba(191,90,242,0.4)", border: "none", width: 4, height: 4 }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="out-left"
            style={{ background: "rgba(191,90,242,0.4)", border: "none", width: 4, height: 4 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="out-right"
            style={{ background: "rgba(191,90,242,0.4)", border: "none", width: 4, height: 4 }}
          />
        </>
      )}
    </div>
  );
}

export const ServiceNode = memo(ServiceNodeComponent);
