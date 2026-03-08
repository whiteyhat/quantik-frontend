"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

interface ToolUsage {
  tool: string;
  requests: number;
  avg_latency_ms: number | null;
  errors: number;
}

interface DailyBreakdown {
  day: string;
  count: number;
  errors: number;
}

interface RecentError {
  tool_name: string;
  status_code: number;
  error: string | null;
  created_at: number;
}

interface UsageData {
  total_requests_24h: number;
  requests_last_hour: number;
  error_count_24h: number;
  error_rate_24h: string;
  by_tool: ToolUsage[];
  daily_breakdown: DailyBreakdown[];
  recent_errors: RecentError[];
}

interface ApiUsagePanelProps {
  agentId: string;
}

function formatToolName(name: string): string {
  return name
    .replace(/^get_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function latencyColor(ms: number | null): string {
  if (ms == null) return "rgba(255,255,255,0.30)";
  if (ms < 200) return "#30d158";
  if (ms < 1000) return "#ff9f0a";
  return "#ff453a";
}

export function ApiUsagePanel({ agentId }: ApiUsagePanelProps) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      setError(false);
      const json = await api.getAgentUsage(agentId);
      if (json.success) setData(json.data);
    } catch {
      if (!data) setError(true);
    } finally {
      setLoading(false);
    }
  }, [agentId, data]);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const mono: React.CSSProperties = {
    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          API Usage
        </span>
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          API Usage
        </span>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#ff453a", ...mono, marginBottom: 8 }}>Failed to load usage data</div>
          <button
            onClick={() => { setLoading(true); fetchUsage(); }}
            style={{
              padding: "6px 16px", borderRadius: 8,
              background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.20)",
              color: "#ff453a", fontSize: 11, fontWeight: 600,
              cursor: "pointer", outline: "none", ...mono,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const maxBarCount = Math.max(...(data.daily_breakdown.map(d => d.count)), 1);

  return (
    <div style={panelStyle}>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        API Usage
      </span>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {[
          { label: "24H Requests", value: data.total_requests_24h.toLocaleString(), color: "#0a84ff" },
          { label: "Last Hour", value: data.requests_last_hour.toLocaleString(), color: "#30d158" },
          { label: "Error Rate", value: data.error_rate_24h, color: data.error_count_24h > 0 ? "#ff453a" : "rgba(255,255,255,0.55)" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day spark bar chart */}
      {data.daily_breakdown.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 6, textTransform: "uppercase" }}>
            7-Day Activity
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
            {data.daily_breakdown.map((d) => {
              const pct = (d.count / maxBarCount) * 100;
              return (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div
                    style={{
                      width: "100%",
                      height: Math.max(2, (pct / 100) * 36),
                      borderRadius: 2,
                      background: d.errors > 0
                        ? "linear-gradient(180deg, #ff453a, rgba(255,69,58,0.40))"
                        : "linear-gradient(180deg, #0a84ff, rgba(10,132,255,0.40))",
                    }}
                    title={`${d.day}: ${d.count} requests, ${d.errors} errors`}
                  />
                  <span style={{ ...mono, fontSize: 7, color: "rgba(255,255,255,0.20)" }}>
                    {d.day.split("-")[2]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-tool breakdown */}
      {data.by_tool.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 6, textTransform: "uppercase" }}>
            By Tool (24h)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.by_tool.slice(0, 8).map((t) => (
              <div key={t.tool} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                  {formatToolName(t.tool)}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 10, color: latencyColor(t.avg_latency_ms) }}>
                    {t.avg_latency_ms == null ? "—" : `${t.avg_latency_ms}ms`}
                  </span>
                  <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: t.errors > 0 ? "#ff453a" : "#0a84ff" }}>
                    {t.requests}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent errors */}
      {data.recent_errors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 6, textTransform: "uppercase" }}>
            Recent Errors
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.recent_errors.slice(0, 10).map((e, i) => (
              <div key={i} style={{ fontSize: 10, color: "#ff453a", ...mono }}>
                <span style={{ color: "rgba(255,255,255,0.30)", marginRight: 6 }}>
                  {new Date(e.created_at).toLocaleTimeString()}
                </span>
                {formatToolName(e.tool_name)} — {e.error ?? `HTTP ${e.status_code}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
