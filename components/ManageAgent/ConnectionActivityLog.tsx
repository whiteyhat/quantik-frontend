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

interface LogEntry {
  tool_name: string;
  method: string;
  status_code: number;
  latency_ms: number;
  created_at: number;
}

interface ConnectionActivityLogProps {
  agentId: string;
}

export function ConnectionActivityLog({ agentId }: ConnectionActivityLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLog = useCallback(async (offset = 0, append = false) => {
    try {
      setError(false);
      const json = await api.getAgentActivity(agentId, 50, offset);
      if (json.success) {
        if (append) {
          setEntries(prev => [...prev, ...json.data]);
        } else {
          setEntries(json.data);
        }
        setHasMore((json as unknown as { hasMore?: boolean }).hasMore ?? false);
      }
    } catch {
      if (!append) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchLog();
    const interval = setInterval(() => fetchLog(), 30_000);
    return () => clearInterval(interval);
  }, [fetchLog]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchLog(entries.length, true);
  };

  const mono: React.CSSProperties = {
    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
  };

  function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
  }

  function statusColor(code: number): string {
    if (code < 300) return "#30d158";
    if (code < 400) return "#ff9f0a";
    return "#ff453a";
  }

  return (
    <div style={panelStyle}>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Activity Log
      </span>

      {loading ? (
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading...</div>
      ) : error ? (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#ff453a", ...mono, marginBottom: 8 }}>Failed to load activity</div>
          <button
            onClick={() => { setLoading(true); fetchLog(); }}
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
      ) : entries.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.25)", ...mono }}>
          No API activity yet. Your BYO agent will appear here once it starts calling tools.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {entries.map((entry, i) => (
              <div
                key={`${entry.created_at}-${i}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 8px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    ...mono, fontSize: 9, fontWeight: 700,
                    padding: "2px 5px", borderRadius: 3,
                    background: entry.method === "POST"
                      ? "rgba(255,159,10,0.12)"
                      : "rgba(10,132,255,0.12)",
                    color: entry.method === "POST" ? "#ff9f0a" : "#0a84ff",
                  }}>
                    {entry.method}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.60)" }}>
                    {entry.tool_name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 9, color: entry.latency_ms > 1000 ? "#ff453a" : entry.latency_ms > 200 ? "#ff9f0a" : "rgba(255,255,255,0.25)" }}>
                    {entry.latency_ms}ms
                  </span>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: statusColor(entry.status_code) }}>
                    {entry.status_code}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.20)" }}>
                    {relativeTime(entry.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                width: "100%", marginTop: 8,
                padding: "6px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.40)", fontSize: 10, fontWeight: 600,
                cursor: loadingMore ? "not-allowed" : "pointer", outline: "none", ...mono,
              }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
