"use client";

import { useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/useHydrated";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ text, children, className }: TooltipProps) {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const MARGIN = 8;
    const left = rect.left + rect.width / 2;
    const spaceAbove = rect.top;
    if (spaceAbove < 40) {
      setCoords({ top: rect.bottom + MARGIN, left });
      setFlipped(true);
    } else {
      setCoords({ top: rect.top - MARGIN, left });
      setFlipped(false);
    }
    setVisible(true);
  }

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onFocus={show}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
      style={{ display: "inline-flex" }}
    >
      {children}
      {hydrated && visible && createPortal(
        <div
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: flipped
              ? "translateX(-50%)"
              : "translate(-50%, -100%)",
            padding: "4px 10px",
            background: "#27272a",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            color: "white",
            fontSize: 10,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            lineHeight: 1.5,
            zIndex: 99999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}
