"use client";

import type React from "react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

// ─── Typography tokens ───────────────────────────────────────────────────────

export const LABEL_SIZE = 11;
export const META_SIZE = 12;
export const BODY_SIZE = 13;

// ─── Panel styles ────────────────────────────────────────────────────────────

export const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
};

// ─── Section header ──────────────────────────────────────────────────────────

export function SectionHeader({
  icon,
  title,
  tooltip,
}: {
  icon?: string;
  title: string;
  tooltip?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {title}
        </span>
      </div>
      {tooltip && <HelpTooltip text={tooltip} />}
    </div>
  );
}
