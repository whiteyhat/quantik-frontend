"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, type AgentExecutionLogItem } from "@/lib/api";
import { Skeleton } from "./ui/skeleton";

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusTone(entry: AgentExecutionLogItem): { color: string; bg: string } {
  const status = entry.status.toUpperCase();
  if (status === "FAILED") return { color: "#ff453a", bg: "rgba(255,69,58,0.15)" };
  if (status === "PAPER") return { color: "#ff9f0a", bg: "rgba(255,159,10,0.15)" };
  return { color: "#30d158", bg: "rgba(48,209,88,0.15)" };
}

function sourceTone(source: AgentExecutionLogItem["source"]): { color: string; bg: string } {
  if (source === "manual") return { color: "#0a84ff", bg: "rgba(10,132,255,0.14)" };
  if (source === "unknown") return { color: "rgba(255,255,255,0.62)", bg: "rgba(255,255,255,0.08)" };
  return { color: "#30d158", bg: "rgba(48,209,88,0.15)" };
}

interface ExecutionLogProps {
  agentId: string;
}

export function ExecutionLog({ agentId }: ExecutionLogProps) {
  const t = useTranslations("executionLog");
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<AgentExecutionLogItem[]>([]);

  useEffect(() => {
    let active = true;

    const fetchExecutions = async () => {
      try {
        const next = await api.getAgentExecutions(agentId, { limit: 1 });
        if (active) setEntries(next);
      } catch {
        if (active) setEntries([]);
      } finally {
        if (active) setLoaded(true);
      }
    };

    fetchExecutions();
    const interval = window.setInterval(fetchExecutions, 20_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [agentId]);

  return (
    <div data-testid="execution-log" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {t("latest")}
        </span>
      </div>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <Skeleton width={16} height={14} borderRadius={3} />
            <Skeleton width="50%" height={12} borderRadius={4} />
            <Skeleton width={50} height={11} borderRadius={4} style={{ marginLeft: "auto" }} />
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div
          data-testid="execution-log-empty"
          style={{
            padding: "30px 0",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.30)",
            fontFamily: "\"SF Mono\", monospace",
            letterSpacing: "0.05em",
          }}
        >
          {t("noTrades")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.slice(0, 1).map((entry) => {
            const status = statusTone(entry);
            const source = sourceTone(entry.source);
            return (
              <div
                key={entry.id}
                data-testid="execution-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: source.color,
                      background: source.bg,
                      borderRadius: 999,
                      padding: "4px 8px",
                      fontFamily: "\"SF Mono\", monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {entry.source}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: status.color,
                      background: status.bg,
                      borderRadius: 999,
                      padding: "4px 8px",
                      fontFamily: "\"SF Mono\", monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {entry.status}
                  </span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.70)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.slug}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.34)",
                      fontFamily: "\"SF Mono\", monospace",
                    }}
                  >
                    <span>{entry.direction ?? "—"}</span>
                    <span>${entry.amount.toFixed(2)}</span>
                    {entry.fillPrice != null ? <span>@ {entry.fillPrice.toFixed(3)}</span> : null}
                    {entry.pnl != null ? (
                      <span style={{ color: entry.pnl >= 0 ? "#30d158" : "#ff453a" }}>
                        P&L {entry.pnl >= 0 ? "+" : ""}{entry.pnl.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.22)",
                    fontFamily: "\"SF Mono\", monospace",
                    flexShrink: 0,
                  }}
                >
                  {timeLabel(entry.executedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
