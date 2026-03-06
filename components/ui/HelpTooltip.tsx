"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function showTooltip() {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const TOOLTIP_W = 220;
    const MARGIN = 8;
    // Center above the icon, but clamp to viewport edges
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - TOOLTIP_W - MARGIN));
    setCoords({ top: rect.top - MARGIN, left });
    setVisible(true);
  }

  return (
    <div
      ref={iconRef}
      style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "help" }}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setVisible(false)}
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
      {mounted && visible && createPortal(
        <div
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: "translateY(-100%)",
            width: 220,
            padding: "5px 10px",
            background: "#27272a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            color: "white",
            fontSize: 10,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            lineHeight: 1.5,
            zIndex: 99999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            pointerEvents: "none",
            whiteSpace: "normal",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}
