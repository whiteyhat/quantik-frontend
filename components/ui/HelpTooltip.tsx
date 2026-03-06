"use client";

import { useState } from "react";
import { HelpCircle } from "iconoir-react";

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
      <HelpCircle
        width={14}
        height={14}
        color="rgba(255,255,255,0.4)"
        strokeWidth={2}
        style={{ transition: "color 200ms ease" }}
        className="group-hover:text-white"
      />
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
