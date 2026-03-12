"use client";

import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

const panelStyle: React.CSSProperties = {
  background: "rgba(20,20,22,0.92)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 28,
  width: "100%",
  maxWidth: 480,
};

const AUTOPILOT_LS_KEY = "autopilot_onboarded";

const BULLET_POINTS = [
  { icon: "🤖", titleKey: "consensusTitle", descKey: "consensusDesc" },
  { icon: "📡", titleKey: "scanningTitle", descKey: "scanningDesc" },
  { icon: "🛡️", titleKey: "circuitBreakerTitle", descKey: "circuitBreakerDesc" },
  { icon: "👁️", titleKey: "readOnlyTitle", descKey: "readOnlyDesc" },
];

interface AutopilotOnboardingModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function isAutopilotOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTOPILOT_LS_KEY) === "true";
}

export function markAutopilotOnboarded(): void {
  localStorage.setItem(AUTOPILOT_LS_KEY, "true");
}

export function AutopilotOnboardingModal({ open, onConfirm, onCancel }: AutopilotOnboardingModalProps) {
  const t = useTranslations("autopilot");
  const tc = useTranslations("common");
  const to = useTranslations("onboarding");

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={onCancel}
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,159,10,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                letterSpacing: "0.03em",
              }}
            >
              {to("autopilotMode")}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {to("autonomousEngine")}
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            lineHeight: 1.6,
            margin: "0 0 20px 0",
          }}
        >
          {to("onboardingDesc")}
        </p>

        {/* Bullet points */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {BULLET_POINTS.map((bp) => (
            <div key={bp.titleKey} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{bp.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: '"SF Mono", monospace',
                    marginBottom: 2,
                  }}
                >
                  {to(bp.titleKey as any)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.40)",
                    lineHeight: 1.5,
                  }}
                >
                  {to(bp.descKey as any)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.04em",
            }}
          >
            {tc("cancel")}
          </button>
          <button
            onClick={() => {
              markAutopilotOnboarded();
              onConfirm();
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,159,10,0.40)",
              background: "rgba(255,159,10,0.15)",
              color: "#FF9F0A",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.04em",
              transition: "all 150ms ease",
            }}
          >
            {to("enableConfirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
