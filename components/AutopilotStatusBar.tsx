"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type AutopilotAgentStatus } from "@/lib/api";

type StatusTone = {
  label: string;
  color: string;
  bg: string;
  pulse: boolean;
};

function formatRelativeMinutes(ts: number | null, t: ReturnType<typeof useTranslations>): string {
  if (ts == null || !Number.isFinite(ts)) return t("never");
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("lessThanMinAgo");
  return t("minAgo", { m: diffMin });
}

function deriveTone(status: AutopilotAgentStatus | null, t: ReturnType<typeof useTranslations>): StatusTone {
  if (!status) {
    return {
      label: t("loading"),
      color: "rgba(255,255,255,0.58)",
      bg: "rgba(255,255,255,0.08)",
      pulse: false,
    };
  }

  if (status.blocker === "no_wallet" || status.blocker === "funding_required" || status.blocker === "polymarket_prep_required") {
    return {
      label: t("blocked"),
      color: "#ff9f0a",
      bg: "rgba(255,159,10,0.15)",
      pulse: false,
    };
  }

  if (status.blocker === "autopilot_off") {
    return {
      label: t("paused"),
      color: "rgba(255,255,255,0.62)",
      bg: "rgba(255,255,255,0.08)",
      pulse: false,
    };
  }

  if (status.blocker === "scanner_idle") {
    return {
      label: t("scannerIdle"),
      color: "#ff9f0a",
      bg: "rgba(255,159,10,0.15)",
      pulse: false,
    };
  }

  if (status.scheduler.scannerRunning) {
    return {
      label: t("scanning"),
      color: "#0a84ff",
      bg: "rgba(10,132,255,0.15)",
      pulse: true,
    };
  }

  if (status.activity.lastDecision?.decision === "executed") {
    return {
      label: t("trading"),
      color: "#30d158",
      bg: "rgba(48,209,88,0.15)",
      pulse: false,
    };
  }

  return {
    label: t("armed"),
    color: "#30d158",
    bg: "rgba(48,209,88,0.15)",
    pulse: false,
  };
}

interface AutopilotStatusBarProps {
  status: AutopilotAgentStatus | null;
}

export function AutopilotStatusBar({ status }: AutopilotStatusBarProps) {
  const t = useTranslations("autopilot");
  const tone = useMemo(() => deriveTone(status, t), [status, t]);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!status?.scheduler.scanIntervalMs || !status.scheduler.lastGlobalScanAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const nextDueAt = status.scheduler.lastGlobalScanAt! + status.scheduler.scanIntervalMs;
      setCountdown(Math.max(0, Math.round((nextDueAt - Date.now()) / 1000)));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status?.scheduler.lastGlobalScanAt, status?.scheduler.scanIntervalMs]);

  const fmtCountdown = (seconds: number | null) => {
    if (seconds == null) return "--:--";
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.max(0, seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const lastReason = status?.activity.lastReasonCode
    ? String(status.activity.lastReasonCode).replace(/_/g, " ").toUpperCase()
    : "—";

  return (
    <div
      data-testid="autopilot-status-bar"
      style={{
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "\"SF Mono\", \"JetBrains Mono\", monospace",
        flexWrap: "wrap",
      }}
    >
      <div
        data-testid="status-pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 100,
          background: tone.bg,
          border: `1px solid ${tone.color}44`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: tone.color,
            display: "inline-block",
            boxShadow: `0 0 6px ${tone.color}`,
            animation: tone.pulse ? "quantik-pulse 1.6s ease-in-out infinite" : "none",
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: tone.color, letterSpacing: "0.08em" }}>
          {tone.label}
        </span>
      </div>

      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
        {t("lastScan")}
        {formatRelativeMinutes(status?.scheduler.lastGlobalScanAt ?? null, t)}
      </span>

      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
        {t("nextScanIn")}{" "}
        <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
          {fmtCountdown(countdown)}
        </span>
      </span>

      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
        {t("lastDecisionLabel")}{" "}
        <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
          {lastReason}
        </span>
      </span>

      <div style={{ flex: 1 }} />

      <div
        data-testid="mode-badge"
        style={{
          padding: "3px 10px",
          borderRadius: 100,
          background: status?.scheduler.paperMode ? "rgba(255,159,10,0.15)" : "rgba(48,209,88,0.12)",
          border: `1px solid ${status?.scheduler.paperMode ? "rgba(255,159,10,0.35)" : "rgba(48,209,88,0.30)"}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: status?.scheduler.paperMode ? "#FF9F0A" : "#30d158",
            letterSpacing: "0.08em",
          }}
        >
          {status?.scheduler.paperMode ? t("paper") : t("live")}
        </span>
      </div>
    </div>
  );
}
