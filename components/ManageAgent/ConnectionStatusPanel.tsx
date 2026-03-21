"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

interface ConnectionStatusPanelProps {
  agentId: string;
  connectionStatus?: string | null;
  lastHeartbeat?: number | null;
  description?: string | null;
}

export function ConnectionStatusPanel({ agentId, connectionStatus, lastHeartbeat, description }: ConnectionStatusPanelProps) {
  const t = useTranslations("connectionStatus");
  const [status, setStatus] = useState(connectionStatus ?? "pending");
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const statusColor = status === "connected" ? "#30d158" : status === "pending" ? "#ff9f0a" : "#ff453a";

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    setTestError(null);
    try {
      const data = await api.healthCheck(agentId);
      setStatus(data.connection_status ?? "error");
    } catch (err) {
      setStatus("error");
      setTestError(err instanceof Error ? err.message : t("connectionTestFailed"));
    } finally {
      setIsTesting(false);
    }
  }, [agentId]);

  const formatRelativeTime = (ts: number | null | undefined) => {
    if (!ts) return t("never");
    const diff = Date.now() - ts;
    if (diff < 60_000) return t("justNow");
    if (diff < 3600_000) return t("mAgo", { m: Math.floor(diff / 60_000) });
    if (diff < 86400_000) return t("hAgo", { h: Math.floor(diff / 3600_000) });
    return t("dAgo", { d: Math.floor(diff / 86400_000) });
  };

  return (
    <div className="glass-card glass-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {t("title")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%", background: statusColor,
              boxShadow: status === "connected" ? `0 0 8px ${statusColor}` : "none",
              animation: status === "connected" ? "pulse 2s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: 11, fontWeight: 700, color: statusColor,
              textTransform: "uppercase", letterSpacing: "0.06em",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Agent Type Badge */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 20,
            background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.20)",
            fontSize: 10, fontWeight: 700, color: "#0a84ff",
            letterSpacing: "0.06em", textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {t("byoAgent")}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
            {t("description")}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
      )}

      {/* Last Heartbeat */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {t("lastHeartbeat")}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", fontWeight: 600 }}>
          {formatRelativeTime(lastHeartbeat)}
        </div>
      </div>

      {/* Test Error */}
      {testError && (
        <div style={{ marginBottom: 12, fontSize: 11, color: "#ff453a", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {testError}
        </div>
      )}

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={isTesting}
        style={{
          width: "100%",
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.20)",
          color: "#0a84ff", fontSize: 12, fontWeight: 600,
          cursor: isTesting ? "not-allowed" : "pointer", outline: "none",
          transition: "all 180ms ease",
        }}
      >
        {isTesting ? t("testing") : t("testConnection")}
      </button>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
