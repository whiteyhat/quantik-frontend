"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import type { CardComponentProps } from "nextstepjs";

const CARD_WIDTH = 344;

function getContinueLabel(
  route: string | undefined,
  t: ReturnType<typeof useTranslations>
) {
  if (!route) return null;

  if (route === "/manage-agent") return t("continueTo", { page: t("pageAgent") });
  if (route === "/dashboard") return t("continueTo", { page: t("pageDashboard") });
  if (route === "/arena") return t("continueTo", { page: t("pageArena") });

  return null;
}

export function ProductTourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const t = useTranslations("tutorial");
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => nextButtonRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [currentStep]);

  const nextLabel = useMemo(() => {
    if (currentStep === totalSteps - 1) return t("letsGo");
    return getContinueLabel(step.nextRoute, t) ?? t("next");
  }, [currentStep, step.nextRoute, t, totalSteps]);

  return (
    <div
      data-product-tour-card="true"
      role="dialog"
      aria-modal="true"
      aria-label={t("stepAriaLabel", { current: currentStep + 1, total: totalSteps })}
      style={{
        position: "relative",
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 28px)",
      }}
    >
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.09)",
          background:
            "radial-gradient(circle at top left, rgba(10,132,255,0.18), transparent 42%), linear-gradient(135deg, rgba(10,12,20,0.94), rgba(15,19,31,0.92))",
          backdropFilter: "blur(34px) saturate(180%)",
          WebkitBackdropFilter: "blur(34px) saturate(180%)",
          boxShadow:
            "0 22px 60px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 48px rgba(10,132,255,0.08)",
          color: "rgba(255,255,255,0.92)",
          padding: "18px 18px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              color: "rgba(125,211,252,0.82)",
            }}
          >
            Quantik Tour
          </span>
          <button
            type="button"
            onClick={() => skipTour?.()}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.55)",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {t("skipTour")}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          {step.icon ? (
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                background: "rgba(10,132,255,0.18)",
                border: "1px solid rgba(10,132,255,0.26)",
                flexShrink: 0,
              }}
            >
              {step.icon}
            </div>
          ) : null}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {step.title}
            </div>
            <div
              aria-live="polite"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.36)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              }}
            >
              {currentStep + 1} / {totalSteps}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.64)",
            marginBottom: 16,
          }}
        >
          {step.content}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={prevStep}
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.70)",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 14px",
                cursor: "pointer",
              }}
            >
              {t("back")}
            </button>
          ) : null}

          <button
            ref={nextButtonRef}
            type="button"
            onClick={nextStep}
            style={{
              flex: 1,
              borderRadius: 10,
              border: "1px solid rgba(10,132,255,0.38)",
              background: "linear-gradient(135deg, rgba(10,132,255,0.28), rgba(64,156,255,0.18))",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              padding: "9px 16px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(10,132,255,0.14)",
            }}
          >
            {nextLabel}
          </button>
        </div>

        <div
          className="hidden md:block"
          style={{
            marginTop: 10,
            fontSize: 10,
            color: "rgba(255,255,255,0.28)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          {t("keyboardHints")}
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {arrow}
      </div>
    </div>
  );
}

