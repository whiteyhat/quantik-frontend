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
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          fontWeight: 600,
          fontFamily: "serif",
          fontStyle: "italic",
        }}
      >
        ?
      </div>
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 8,
            width: 200,
            padding: "8px 12px",
            background: "rgba(20,20,25,0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.85)",
            fontSize: 11,
            lineHeight: 1.4,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
