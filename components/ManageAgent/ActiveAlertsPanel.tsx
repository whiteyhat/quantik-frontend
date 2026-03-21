"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useSocketEvent, type AgentAlertEvent } from "@/context/SocketContext";
import { api, type AlertEntry, type AlertStatus, type RiskConfig } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function alertStatusInfo(alertSent: number): { labelKey: string; color: string; bg: string } {
  switch (alertSent) {
    case 2:
      return { labelKey: "approved", color: "#30d158", bg: "rgba(48,209,88,0.12)" };
    case -1:
      return { labelKey: "vetoed", color: "#ff453a", bg: "rgba(255,69,58,0.12)" };
    default:
      return { labelKey: "pending", color: "#ff9f0a", bg: "rgba(255,159,10,0.12)" };
  }
}

// timeAgo and muteTimeRemaining are now inline with t() inside the component

// ─── Component ───────────────────────────────────────────────────────────────

interface ActiveAlertsPanelProps {
  riskConfig: RiskConfig | null;
}

export function ActiveAlertsPanel({ riskConfig }: ActiveAlertsPanelProps) {
  const t = useTranslations("alerts");

  const timeAgo = (ts: number): string => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("mAgo", { m: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("hAgo", { h: hrs });
    const days = Math.floor(hrs / 24);
    return t("dAgo", { d: days });
  };

  const muteTimeRemaining = (mutedUntil: number | null): string => {
    if (!mutedUntil) return "";
    const remaining = mutedUntil - Date.now();
    if (remaining <= 0) return "";
    const mins = Math.ceil(remaining / 60_000);
    if (mins < 60) return t("mRemaining", { m: mins });
    const hrs = Math.floor(mins / 60);
    return t("hmRemaining", { h: hrs, m: mins % 60 });
  };

  const [alertData, setAlertData] = useState<AlertStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [muteLoading, setMuteLoading] = useState(false);

  // Fetch alert status
  useEffect(() => {
    let active = true;
    api.getAlertStatus().then((data) => {
      if (active) {
        setAlertData(data);
        setLoading(false);
      }
    });
    // Poll every 60s
    const interval = setInterval(() => {
      api.getAlertStatus().then((data) => {
        if (active) setAlertData(data);
      });
    }, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Listen for real-time alert events — refresh data
  useSocketEvent<AgentAlertEvent>("agent:alert", useCallback(() => {
    api.getAlertStatus().then(setAlertData);
  }, []));

  const handleMuteToggle = useCallback(async (mute: boolean) => {
    setMuteLoading(true);
    try {
      if (mute) {
        const result = await api.muteAlerts(3600);
        setAlertData((prev) => prev ? { ...prev, muted: true, mutedUntil: result.mutedUntil } : prev);
      } else {
        await api.unmuteAlerts();
        setAlertData((prev) => prev ? { ...prev, muted: false, mutedUntil: null } : prev);
      }
    } catch {
      // silent
    } finally {
      setMuteLoading(false);
    }
  }, []);

  const alerts = alertData?.alerts ?? [];
  const isMuted = alertData?.muted ?? false;

  return (
    <div className="glass-card glass-panel-compact">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {t("title")}
        </h3>
        {alerts.length > 0 && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: '"SF Mono", monospace' }}>
            {alerts.length} {alerts.length !== 1 ? t("alerts") : t("alert")}
          </span>
        )}
      </div>

      {/* Mute toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0",
          marginBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>
            {isMuted ? t("muted") : t("active")}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
            {isMuted
              ? muteTimeRemaining(alertData?.mutedUntil ?? null) || t("muted")
              : t("telegramEnabled")}
          </div>
        </div>
        <ToggleSwitch
          checked={!isMuted}
          onChange={(v) => handleMuteToggle(!v)}
          disabled={muteLoading}
        />
      </div>

      {/* Risk thresholds — from real riskConfig */}
      {riskConfig && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(255,69,58,0.08)",
              border: "1px solid rgba(255,69,58,0.15)",
              fontSize: 10,
              fontWeight: 600,
              color: "#ff453a",
              fontFamily: '"SF Mono", monospace',
            }}
          >
            {t("dd")} {(riskConfig.drawdownLimit * 100).toFixed(0)}%
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(10,132,255,0.08)",
              border: "1px solid rgba(10,132,255,0.15)",
              fontSize: 10,
              fontWeight: 600,
              color: "#0a84ff",
              fontFamily: '"SF Mono", monospace',
            }}
          >
            {t("maxPos")} {(riskConfig.maxPositionSize * 100).toFixed(0)}%
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 8,
              background: "rgba(191,90,242,0.08)",
              border: "1px solid rgba(191,90,242,0.15)",
              fontSize: 10,
              fontWeight: 600,
              color: "#bf5af2",
              fontFamily: '"SF Mono", monospace',
            }}
          >
            {t("kelly")} {riskConfig.kellyMultiplier.toFixed(2)}x
          </span>
        </div>
      )}

      {/* Alert feed */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="100%" height={44} borderRadius={6} />
          <Skeleton width="100%" height={44} borderRadius={6} />
        </div>
      ) : alerts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {alerts.slice(0, 3).map((alert) => {
            const status = alertStatusInfo(alert.alert_sent);
            const conf = Math.round(
              typeof alert.confidence === "number"
                ? alert.confidence > 1 ? alert.confidence : alert.confidence * 100
                : 0
            );
            return (
              <div
                key={alert.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {/* Status badge */}
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 8,
                    background: status.bg,
                    color: status.color,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}
                >
                  {t(status.labelKey as any)}
                </span>

                {/* Question */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.55)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {alert.question || alert.slug}
                </span>

                {/* Confidence */}
                <span
                  style={{
                    fontFamily: '"SF Mono", monospace',
                    fontSize: 10,
                    fontWeight: 700,
                    color: conf >= 70 ? "#30d158" : conf >= 50 ? "#ff9f0a" : "rgba(255,255,255,0.35)",
                    flexShrink: 0,
                  }}
                >
                  {conf}%
                </span>

                {/* Time */}
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.20)",
                    fontFamily: '"SF Mono", monospace',
                    flexShrink: 0,
                  }}
                >
                  {timeAgo(alert.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
          {t("noAlerts")}
        </div>
      )}
    </div>
  );
}
