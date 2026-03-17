"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TUTORIAL_PAGES } from "./tutorialSteps";

interface TutorialProgressBarProps {
  pageIndex: number;
  currentStep: number;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations("tutorial") as any;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
      className="fixed left-1/2 -translate-x-1/2 bottom-[84px] md:bottom-5"
      style={{
        zIndex: 10001,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--tutorial-tooltip-bg, rgba(10, 12, 20, 0.85))",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid var(--tutorial-tooltip-border, rgba(255,255,255,0.08))",
          borderRadius: 100,
          padding: "10px 16px 10px 18px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04)",
        }}
      >
        {/* Page dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {TUTORIAL_PAGES.map((page, i) => {
            const isCompleted = i < pageIndex;
            const isCurrent = i === pageIndex;

            return (
              <div key={page.page} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {/* Dot */}
                  <div
                    style={{
                      position: "relative",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isCompleted || isCurrent
                        ? "var(--ios-blue, #0a84ff)"
                        : "var(--tutorial-text-dim, rgba(255,255,255,0.15))",
                      transition: "all 300ms ease",
                      boxShadow: isCurrent
                        ? "0 0 12px rgba(10,132,255,0.5), 0 0 4px rgba(10,132,255,0.3)"
                        : "none",
                    }}
                  >
                    {isCurrent && !reduced && (
                      <span
                        className="tutorial-pulse-ring"
                        style={{
                          position: "absolute",
                          inset: -4,
                          borderRadius: "50%",
                          border: "1.5px solid rgba(10,132,255,0.4)",
                        }}
                      />
                    )}
                  </div>

                  {/* Label — hidden on mobile to prevent overflow */}
                  <span
                    className="hidden md:block"
                    style={{
                      fontSize: 9,
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      letterSpacing: "0.04em",
                      color: isCurrent
                        ? "var(--tutorial-text-primary, rgba(255,255,255,0.80))"
                        : isCompleted
                        ? "rgba(10,132,255,0.60)"
                        : "var(--tutorial-text-dim, rgba(255,255,255,0.25))",
                      fontWeight: isCurrent ? 600 : 400,
                      whiteSpace: "nowrap",
                      transition: "color 300ms ease",
                    }}
                  >
                    {t(page.labelKey)}
                  </span>
                </div>

                {/* Connecting line */}
                {i < TUTORIAL_PAGES.length - 1 && (
                  <div
                    className="md:w-6 w-3"
                    style={{
                      height: 1,
                      marginBottom: typeof window !== "undefined" && window.innerWidth >= 768 ? 16 : 0,
                      background: isCompleted
                        ? "rgba(10,132,255,0.4)"
                        : "var(--tutorial-tooltip-border, rgba(255,255,255,0.08))",
                      marginLeft: 3,
                      marginRight: 3,
                      transition: "background 300ms ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--tutorial-tooltip-border, rgba(255,255,255,0.08))",
            flexShrink: 0,
          }}
        />

        {/* Step counter */}
        <span
          aria-live="polite"
          style={{
            fontSize: 11,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            color: "var(--tutorial-text-dim, rgba(255,255,255,0.40))",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {currentStep + 1}/{totalSteps}
        </span>

        {/* Close button */}
        <button
          onClick={onSkip}
          aria-label={t("skipTour")}
          style={{
            background: "var(--tutorial-btn-ghost-bg, rgba(255,255,255,0.06))",
            border: "1px solid var(--tutorial-tooltip-border, rgba(255,255,255,0.08))",
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--tutorial-text-dim, rgba(255,255,255,0.35))",
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
            e.currentTarget.style.background = "var(--tutorial-btn-ghost-bg, rgba(255,255,255,0.06))";
            e.currentTarget.style.borderColor = "var(--tutorial-tooltip-border, rgba(255,255,255,0.08))";
            e.currentTarget.style.color = "var(--tutorial-text-dim, rgba(255,255,255,0.35))";
          }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
