"use client";

import { useState } from "react";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "help" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="group"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={visible ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "stroke 200ms ease" }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 8,
            padding: "4px 8px",
            background: "#27272a", // bg-zinc-800
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            color: "white",
            fontSize: 10,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            lineHeight: 1.4,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.04em"
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
