"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api, type HealthScoreResponse } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const mono: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#30d158";
    case "B": return "#0a84ff";
    case "C": return "#ff9f0a";
    case "D": return "#ff6b35";
    case "F": return "#ff453a";
    default: return "rgba(255,255,255,0.30)";
  }
}

function ScoreRing({ score, grade, size = 72 }: { score: number; grade: string; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = gradeColor(grade);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ ...mono, fontSize: 18, fontWeight: 700, color }}>{score}</span>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color, opacity: 0.7 }}>{grade}</span>
      </div>
    </div>
  );
}

interface HealthScoreBadgeProps {
  agentId: string;
}

export function HealthScoreBadge({ agentId }: HealthScoreBadgeProps) {
  const t = useTranslations("healthScore");
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchScore = useCallback(async () => {
    try {
      setError(false);
      const json = await api.getHealthScore(agentId);
      if (json.success) setData(json.data);
    } catch {
      setData((prev) => { if (!prev) setError(true); return prev; });
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, 60_000);
    return () => clearInterval(interval);
  }, [fetchScore]);

  if (loading) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t("title")}
        </span>
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>{t("loading")}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t("title")}
        </span>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#ff453a", ...mono, marginBottom: 8 }}>{t("failedToLoad")}</div>
          <button
            onClick={() => { setLoading(true); fetchScore(); }}
            style={{
              padding: "6px 16px", borderRadius: 8,
              background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.20)",
              color: "#ff453a", fontSize: 11, fontWeight: 600,
              cursor: "pointer", outline: "none", ...mono,
            }}
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  const components = [
    { label: t("uptime"), value: data.components.uptime, weight: "40%" },
    { label: t("errorRate"), value: data.components.error_rate, weight: "30%" },
    { label: t("latency"), value: data.components.latency, weight: "20%" },
    { label: t("connection"), value: data.components.connection, weight: "10%" },
  ];
  const noData = data.status === "insufficient_data" || data.score == null || data.grade == null;

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t("title")}
        </span>
        <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
          {t("window24h")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {noData ? (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "1px dashed rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.45)",
              ...mono,
              fontSize: 11,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {t("noData")}
          </div>
        ) : (
          <ScoreRing score={data.score!} grade={data.grade!} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {noData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...mono, fontSize: 11, color: "#ff9f0a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t("insufficientData")}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.6 }}>
                {data.message}
              </div>
              <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                {data.request_samples_24h} requests · {data.heartbeat_samples_24h} heartbeat intervals
              </div>
            </div>
          ) : components.map(c => (
            <div key={c.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                  {c.label} ({c.weight})
                </span>
                <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.50)" }}>{c.value ?? "—"}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${c.value ?? 0}%`,
                  background: (c.value ?? 0) >= 75 ? "#30d158" : (c.value ?? 0) >= 50 ? "#ff9f0a" : "#ff453a",
                  transition: "width 600ms ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: t("requests"), value: data.total_requests_24h.toLocaleString() },
          { label: t("errors"), value: String(data.error_count_24h), color: data.error_count_24h > 0 ? "#ff453a" : undefined },
          { label: t("avgLatency"), value: data.avg_latency_ms == null ? "—" : `${data.avg_latency_ms}ms` },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: s.color ?? "rgba(255,255,255,0.65)" }}>{s.value}</div>
            <div style={{ ...mono, fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
