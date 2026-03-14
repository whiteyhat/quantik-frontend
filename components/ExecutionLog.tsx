"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "./ui/skeleton";
import { api, type AlertEntry } from "@/lib/api";

export interface ExecutedTrade {
  id?: string;
  slug: string;
  direction: "YES" | "NO";
  amount: number;
  confidence: number; // 0-1
  status: "PLACED" | "FAILED" | "PAPER";
  source?: "autopilot" | "manual";
  executedAt?: string;
}

export function ExecutionLog() {
  const t = useTranslations("executionLog");
  const [loaded, setLoaded] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [lastAlert, setLastAlert] = useState<AlertEntry | null>(null);

  useEffect(() => {
    let active = true;

    const fetchAlert = async () => {
      try {
        const data = await api.getAlertStatus();
        if (!active) return;
        setTelegramConfigured(Boolean(data.telegramConfigured));
        setLastAlert(data.alerts[0] ?? null);
      } catch { /* silently fail */ }
    };

    fetchAlert().finally(() => { if (active) setLoaded(true); });
    const iv = setInterval(fetchAlert, 20_000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // Don't render anything if Telegram is not configured
  if (loaded && !telegramConfigured) return null;

  const alertStatusLabel = lastAlert
    ? lastAlert.alert_sent === 2 ? t("approved")
    : lastAlert.alert_sent === -1 ? t("vetoed")
    : t("sent")
    : "";

  const alertColor = lastAlert
    ? lastAlert.alert_sent === 2 ? "#30d158"
    : lastAlert.alert_sent === -1 ? "#ff453a"
    : "#0a84ff"
    : "#0a84ff";

  const alertIcon = lastAlert
    ? lastAlert.alert_sent === 2 ? "\u2713"
    : lastAlert.alert_sent === -1 ? "\u2717"
    : "\u{1F4E9}"
    : "\u{1F4E9}";

  return (
    <div data-testid="execution-log" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "\"SF Mono\", monospace",
          }}
        >
          {t("title")}
        </span>
      </div>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Skeleton width={16} height={14} borderRadius={3} />
            <Skeleton width="50%" height={12} borderRadius={4} />
            <Skeleton width={50} height={11} borderRadius={4} style={{ marginLeft: "auto" }} />
          </div>
        </div>
      ) : !lastAlert ? (
        <div
          data-testid="execution-log-empty"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}
        >
          <div style={{ position: "relative", width: 40, height: 40 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1px solid rgba(48,209,88,0.3)",
                  animation: `radar-ring 2.4s ease-out ${i * 1.2}s infinite`,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                inset: "30%",
                borderRadius: "50%",
                background: "rgba(48,209,88,0.5)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.30)",
              fontFamily: "\"SF Mono\", monospace",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            {t("noTrades")}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            data-testid="execution-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${alertColor}22`,
            }}
          >
            <span style={{ fontSize: 12, color: alertColor }}>{alertIcon}</span>
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "\"SF Mono\", monospace",
              }}
            >
              {lastAlert.question || lastAlert.slug}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: alertColor,
                fontFamily: "monospace",
                flexShrink: 0,
                padding: "1px 6px",
                borderRadius: 4,
                background: `${alertColor}15`,
              }}
            >
              {alertStatusLabel}
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", flexShrink: 0 }}>
              {Math.round(lastAlert.confidence * 100)}%
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace", flexShrink: 0 }}>
              {new Date(lastAlert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
