"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MainNode } from "../data/architectureData";
import { MONO_FONT, MONO_FONT_LIGHT } from "../shared";

const nodeStyle: React.CSSProperties = {
  width: 180,
  height: 180,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "2px solid rgba(0,122,255,0.40)",
  boxShadow:
    "0 0 40px rgba(0,122,255,0.15), 0 0 80px rgba(0,122,255,0.08), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "box-shadow 300ms ease, border-color 300ms ease",
  position: "relative",
};

const pulseRingStyle: React.CSSProperties = {
  position: "absolute",
  inset: -6,
  borderRadius: "50%",
  border: "1px solid rgba(0,122,255,0.20)",
  animation: "pulse-ring 2.5s ease-out infinite",
  pointerEvents: "none",
};

function AgentNodeComponent({ data }: NodeProps<MainNode>) {
  const t = useTranslations("manageAgent.architecture");
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Pulse ring behind node */}
      <div style={pulseRingStyle} />

      <div
        style={{
          ...nodeStyle,
          transform: hovered ? "scale(1.04)" : "scale(1)",
          boxShadow: hovered
            ? "0 0 50px rgba(0,122,255,0.25), 0 0 100px rgba(0,122,255,0.12), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
            : nodeStyle.boxShadow,
          borderColor: hovered ? "rgba(0,122,255,0.60)" : undefined,
          transition: "box-shadow 300ms ease, border-color 300ms ease, transform 300ms ease",
        }}
        className="agent-main-node"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Emoji avatar */}
        <span style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>{data.emoji}</span>

        {/* Name */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: MONO_FONT,
            letterSpacing: "0.06em",
          }}
        >
          {data.label}
        </span>

        {/* Badge */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#007AFF",
            background: "rgba(0,122,255,0.12)",
            border: "1px solid rgba(0,122,255,0.25)",
            borderRadius: 4,
            padding: "2px 6px",
            marginTop: 6,
            letterSpacing: "0.08em",
            fontFamily: MONO_FONT_LIGHT,
          }}
        >
          {t("mainBadge")}
        </span>

        {/* Handles on all 4 sides */}
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          style={{ background: "rgba(0,122,255,0.6)", border: "none", width: 6, height: 6 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ background: "rgba(0,122,255,0.6)", border: "none", width: 6, height: 6 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: "rgba(0,122,255,0.6)", border: "none", width: 6, height: 6 }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          style={{ background: "rgba(0,122,255,0.6)", border: "none", width: 6, height: 6 }}
        />
      </div>
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
