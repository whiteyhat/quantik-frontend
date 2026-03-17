"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { TooltipPosition } from "./tutorialSteps";

interface TutorialTooltipProps {
  titleKey: string;
  descKey: string;
  position: TooltipPosition;
  targetRect: { x: number; y: number; width: number; height: number } | null;
  stepIndex: number;
  totalSteps: number;
  nextPageLabelKey: string | null;
  isFinalStep: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 340;
const PADDING = 10;

export function TutorialTooltip({
  titleKey,
  descKey,
  position,
  targetRect,
  stepIndex,
  totalSteps,
  nextPageLabelKey,
  isFinalStep,
  canGoBack,
  onNext,
  onBack,
  onSkip,
}: TutorialTooltipProps) {
  const reduced = useReducedMotion();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations("tutorial") as any;
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus next button on step change for accessibility
  useEffect(() => {
    const timer = setTimeout(() => nextBtnRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  const isLastStepOnPage = stepIndex === totalSteps - 1;

  // Button text via i18n
  const nextText = isFinalStep
    ? t("letsGo")
    : isLastStepOnPage && nextPageLabelKey
    ? t("continueTo", { page: t(nextPageLabelKey) })
    : t("next");

  const style = computePosition(position, targetRect);

  return (
    <motion.div
      key={`${titleKey}-${stepIndex}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("stepAriaLabel", { current: stepIndex + 1, total: totalSteps })}
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
          background: "var(--tutorial-tooltip-bg, rgba(10, 12, 20, 0.88))",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid var(--tutorial-tooltip-border, rgba(255,255,255,0.09))",
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
            aria-live="polite"
            style={{
              fontSize: 11,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              color: "var(--tutorial-text-dim, rgba(255,255,255,0.30))",
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
              color: "var(--tutorial-text-dim, rgba(255,255,255,0.35))",
              fontSize: 12,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 6,
              transition: "color 150ms ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tutorial-text-secondary, rgba(255,255,255,0.6))")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tutorial-text-dim, rgba(255,255,255,0.35))")}
          >
            {t("skipTour")}
          </button>
        </div>

        {/* Title */}
        {titleKey && (
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--tutorial-text-primary, rgba(255,255,255,0.92))",
              margin: "0 0 6px",
              letterSpacing: "0.01em",
            }}
          >
            {t(titleKey)}
          </h3>
        )}

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "var(--tutorial-text-secondary, rgba(255,255,255,0.55))",
            lineHeight: 1.55,
            margin: "0 0 16px",
          }}
        >
          {t(descKey)}
        </p>

        {/* Navigation buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canGoBack && (
            <button
              onClick={onBack}
              style={{
                background: "var(--tutorial-btn-ghost-bg, rgba(255,255,255,0.06))",
                border: "1px solid var(--tutorial-btn-ghost-border, rgba(255,255,255,0.08))",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--tutorial-text-secondary, rgba(255,255,255,0.55))",
                cursor: "pointer",
                transition: "all 180ms ease",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--tutorial-btn-ghost-hover, rgba(255,255,255,0.10))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--tutorial-btn-ghost-bg, rgba(255,255,255,0.06))";
              }}
            >
              {t("back")}
            </button>
          )}

          <button
            ref={nextBtnRef}
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
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(10,132,255,0.32)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(10,132,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(10,132,255,0.20)";
              e.currentTarget.style.boxShadow = "none";
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(10,132,255,0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {nextText} →
          </button>
        </div>

        {/* Keyboard hints — desktop only */}
        <div
          className="hidden md:block"
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 10,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            color: "var(--tutorial-text-dim, rgba(255,255,255,0.20))",
            letterSpacing: "0.03em",
          }}
        >
          {t("keyboardHints")}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Position calculation with viewport clamping ─────────────────────────────

function computePosition(
  position: TooltipPosition,
  rect: { x: number; y: number; width: number; height: number } | null
): React.CSSProperties {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  const padded = {
    x: rect.x - PADDING,
    y: rect.y - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  // On mobile, always use bottom
  const isMobile = vw < 768;
  const pos = isMobile ? "bottom" : position;
  const margin = 16;

  // Clamp left to viewport
  const clampLeft = (left: number) => Math.max(margin, Math.min(left, vw - TOOLTIP_WIDTH - margin));

  // Clamp top to viewport
  const clampTop = (top: number) => Math.max(margin, Math.min(top, vh - 200));

  switch (pos) {
    case "top":
      return {
        top: clampTop(padded.y - TOOLTIP_GAP - 180), // estimate ~180px tooltip height
        left: clampLeft(padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2),
      };
    case "bottom":
      return {
        top: clampTop(padded.y + padded.height + TOOLTIP_GAP),
        left: clampLeft(padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2),
      };
    case "left":
      return {
        top: clampTop(padded.y + padded.height / 2 - 60),
        left: clampLeft(padded.x - TOOLTIP_WIDTH - TOOLTIP_GAP),
      };
    case "right":
      return {
        top: clampTop(padded.y + padded.height / 2 - 60),
        left: clampLeft(padded.x + padded.width + TOOLTIP_GAP),
      };
    default:
      return {
        top: clampTop(padded.y + padded.height + TOOLTIP_GAP),
        left: clampLeft(padded.x),
      };
  }
}
