"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TUTORIAL_PAGES } from "./tutorialSteps";

interface TutorialProgressBarProps {
  /** Current page index (0-3) */
  pageIndex: number;
  /** Current step within the page */
  currentStep: number;
  /** Total steps on the current page */
  totalSteps: number;
  onSkip: () => void;
}

export function TutorialProgressBar({
  pageIndex,
  currentStep,
  totalSteps,
  onSkip,
}: TutorialProgressBarProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10001,
        pointerEvents: "auto",
      }}
      className="md:bottom-5 bottom-[84px]"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(10, 12, 20, 0.85)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 100,
          padding: "10px 18px 10px 20px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04)",
        }}
      >
        {/* Page dots with connecting lines */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {TUTORIAL_PAGES.map((page, i) => {
            const isCompleted = i < pageIndex;
            const isCurrent = i === pageIndex;
            const isFuture = i > pageIndex;

            return (
              <div key={page.page} style={{ display: "flex", alignItems: "center" }}>
                {/* Dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      position: "relative",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isCompleted
                        ? "#0a84ff"
                        : isCurrent
                        ? "#0a84ff"
                        : "rgba(255,255,255,0.15)",
                      transition: "all 300ms ease",
                      boxShadow: isCurrent
                        ? "0 0 12px rgba(10,132,255,0.5), 0 0 4px rgba(10,132,255,0.3)"
                        : "none",
                    }}
                  >
                    {/* Pulse ring on current */}
                    {isCurrent && !reduced && (
                      <span
                        style={{
                          position: "absolute",
                          inset: -4,
                          borderRadius: "50%",
                          border: "1.5px solid rgba(10,132,255,0.4)",
                          animation: "tutorial-pulse 2s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      letterSpacing: "0.04em",
                      color: isCurrent
                        ? "rgba(255,255,255,0.80)"
                        : isCompleted
                        ? "rgba(10,132,255,0.60)"
                        : "rgba(255,255,255,0.25)",
                      fontWeight: isCurrent ? 600 : 400,
                      whiteSpace: "nowrap",
                      transition: "color 300ms ease",
                    }}
                  >
                    {page.label}
                  </span>
                </div>

                {/* Connecting line */}
                {i < TUTORIAL_PAGES.length - 1 && (
                  <div
                    style={{
                      width: 24,
                      height: 1,
                      marginBottom: 16,
                      background: (isCompleted || (isCurrent && false))
                        ? "rgba(10,132,255,0.4)"
                        : "rgba(255,255,255,0.08)",
                      marginLeft: 4,
                      marginRight: 4,
                      transition: "background 300ms ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step counter */}
        <div
          style={{
            width: 1,
            height: 20,
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            color: "rgba(255,255,255,0.40)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {currentStep + 1}/{totalSteps}
        </span>

        {/* Close / skip button */}
        <button
          onClick={onSkip}
          aria-label="Skip tutorial"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            lineHeight: 1,
            padding: 0,
            flexShrink: 0,
            transition: "all 180ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,69,58,0.15)";
            e.currentTarget.style.borderColor = "rgba(255,69,58,0.30)";
            e.currentTarget.style.color = "#FF453A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.35)";
          }}
        >
          ✕
        </button>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes tutorial-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
