"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TooltipPosition } from "./tutorialSteps";

interface TutorialTooltipProps {
  title: string;
  description: string;
  position: TooltipPosition;
  /** Bounding rect of the target element */
  targetRect: { x: number; y: number; width: number; height: number } | null;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total steps on this page */
  totalSteps: number;
  /** Label for the next page (null if last page) */
  nextPageLabel: string | null;
  /** Whether this is the very last step of the entire tutorial */
  isFinalStep: boolean;
  /** Whether we can go back */
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 340;
const PADDING = 10; // matches spotlight padding

export function TutorialTooltip({
  title,
  description,
  position,
  targetRect,
  stepIndex,
  totalSteps,
  nextPageLabel,
  isFinalStep,
  canGoBack,
  onNext,
  onBack,
  onSkip,
}: TutorialTooltipProps) {
  const reduced = useReducedMotion();

  // Determine if this is the last step on the current page
  const isLastStepOnPage = stepIndex === totalSteps - 1;

  // Button text
  const nextText = isFinalStep
    ? "Let's go!"
    : isLastStepOnPage && nextPageLabel
    ? `Continue to ${nextPageLabel}`
    : "Next";

  // Calculate tooltip position
  const style = computePosition(position, targetRect);

  return (
    <motion.div
      key={`${title}-${stepIndex}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        position: "fixed",
        zIndex: 10002,
        width: TOOLTIP_WIDTH,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "auto",
        ...style,
      }}
    >
      <div
        style={{
          background: "rgba(10, 12, 20, 0.88)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          padding: "20px 22px 18px",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04), 0 0 40px rgba(10,132,255,0.08)",
        }}
      >
        {/* Header: step counter + skip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              color: "rgba(255,255,255,0.30)",
              letterSpacing: "0.06em",
            }}
          >
            {stepIndex + 1} / {totalSteps}
          </span>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              fontSize: 12,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 6,
              transition: "color 150ms ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            Skip tour
          </button>
        </div>

        {/* Title */}
        {title && (
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              margin: "0 0 6px",
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </h3>
        )}

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.55,
            margin: "0 0 18px",
          }}
        >
          {description}
        </p>

        {/* Navigation buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {canGoBack && (
            <button
              onClick={onBack}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                cursor: "pointer",
                transition: "all 180ms ease",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                e.currentTarget.style.color = "rgba(255,255,255,0.75)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={onNext}
            style={{
              flex: 1,
              background: "rgba(10,132,255,0.20)",
              border: "1px solid rgba(10,132,255,0.35)",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              transition: "all 180ms ease",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(10,132,255,0.32)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(10,132,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(10,132,255,0.20)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {nextText} →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Position calculation ────────────────────────────────────────────────────

function computePosition(
  position: TooltipPosition,
  rect: { x: number; y: number; width: number; height: number } | null
): React.CSSProperties {
  if (!rect) {
    // Centered fallback
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const padded = {
    x: rect.x - PADDING,
    y: rect.y - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  // On mobile, always use bottom
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const pos = isMobile ? "bottom" : position;

  switch (pos) {
    case "top":
      return {
        bottom: window.innerHeight - padded.y + TOOLTIP_GAP,
        left: Math.max(16, padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2),
      };
    case "bottom":
      return {
        top: padded.y + padded.height + TOOLTIP_GAP,
        left: Math.max(16, Math.min(
          padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2,
          window.innerWidth - TOOLTIP_WIDTH - 16
        )),
      };
    case "left":
      return {
        top: padded.y + padded.height / 2 - 60,
        right: window.innerWidth - padded.x + TOOLTIP_GAP,
      };
    case "right":
      return {
        top: padded.y + padded.height / 2 - 60,
        left: padded.x + padded.width + TOOLTIP_GAP,
      };
    default:
      return {
        top: padded.y + padded.height + TOOLTIP_GAP,
        left: padded.x,
      };
  }
}
