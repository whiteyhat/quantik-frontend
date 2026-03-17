"use client";

import { useRef, useCallback } from "react";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const FONT = "'General Sans', sans-serif";

export function PillButton({
  children,
  variant = "dark",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "dark" | "light";
  onClick?: () => void;
}) {
  const isDark = variant === "dark";
  const btnRef = useRef<HTMLButtonElement>(null);
  const isTouch = useTouchDevice();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouch) return;
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;

    // Magnetic pull (max 4px)
    const pullX = deltaX * 4;
    const pullY = deltaY * 4;

    btn.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.03)`;
    btn.style.setProperty("--mx", `${x}px`);
    btn.style.setProperty("--my", `${y}px`);
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return;
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.transform = "translate(0, 0) scale(1)";
  }, [isTouch]);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="pill-button-magnetic group relative inline-flex cursor-pointer overflow-hidden active:scale-[0.98]"
      style={{
        borderRadius: 9999,
        border: "0.6px solid rgba(255,255,255,0.6)",
        background: "transparent",
        padding: 1,
        transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <span
        className="transition-opacity duration-300 group-hover:opacity-100"
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 12,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
          borderRadius: "0 0 50% 50%",
          filter: "blur(4px)",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
      <span
        className={`relative inline-flex items-center justify-center transition-colors duration-200 ${
          isDark
            ? "bg-black text-white/90 group-hover:text-white"
            : "bg-white text-black group-hover:bg-white/90"
        }`}
        style={{
          borderRadius: 9999,
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 500,
          padding: "11px 29px",
          lineHeight: 1,
        }}
      >
        {children}
      </span>
    </button>
  );
}
