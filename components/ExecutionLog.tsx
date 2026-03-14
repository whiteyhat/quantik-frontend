"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "./ui/skeleton";
import { api } from "@/lib/api";

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

const STATUS_ICON: Record<string, string> = {
  PLACED: "✅",
  FAILED: "❌",
  PAPER:  "📋",
};

const STATUS_COLOR: Record<string, string> = {
  PLACED: "#30d158",
  FAILED: "#ff453a",
  PAPER:  "#FF9F0A",
};

function EmptyState() {
  const t = useTranslations("executionLog");
  return (
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
  );
}

export function ExecutionLog() {
  const t = useTranslations("executionLog");
  const [trades, setTrades] = useState<ExecutedTrade[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchTrades = async () => {
    try {
      const recentTrades = await api.getTrades();
      setTrades(
        recentTrades.slice(0, 20).map((trade) => ({
          id: trade.id,
          slug: trade.slug,
          direction: trade.direction,
          amount: trade.size,
          confidence: 0,
          source: trade.source,
          status:
            trade.outcome === "LOSS" ? "FAILED" :
            trade.outcome === "PENDING" ? "PAPER" :
            "PLACED",
          executedAt: new Date(trade.timestamp).toISOString(),
        }))
      );
    } catch { /* silently fail */ }
  };

  useEffect(() => {
    fetchTrades().finally(() => setLoaded(true));
    const iv = setInterval(fetchTrades, 20_000);
    return () => clearInterval(iv);
  }, []);

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
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {trades.length} {t("trades")}
        </span>
      </div>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Skeleton width={16} height={14} borderRadius={3} />
              <Skeleton width="50%" height={12} borderRadius={4} />
              <Skeleton width={50} height={11} borderRadius={4} style={{ marginLeft: "auto" }} />
              <Skeleton width={40} height={11} borderRadius={4} />
            </div>
          ))}
        </div>
      ) : trades.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map((trade, i) => {
            const id = trade.id || `${trade.slug}-${i}`;
            const color = STATUS_COLOR[trade.status] ?? "rgba(255,255,255,0.4)";
            const icon = STATUS_ICON[trade.status] ?? "·";
            return (
              <div
                key={id}
                data-testid="execution-row"
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
                <span style={{ fontSize: 12, color: color }}>{icon}</span>
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
                  {trade.slug}
                </span>
                <span
                  title={trade.source === "autopilot" ? "Autopilot" : "Manual"}
                  style={{ fontSize: 12, flexShrink: 0, opacity: 0.8 }}
                >
                  {trade.source === "autopilot" ? "\u{1F916}" : "\u{1F9D1}"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: trade.direction === "YES" ? "#30d158" : "#ff453a",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  {t("bet")}{trade.direction}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", flexShrink: 0 }}>
                  ${(trade.amount ?? 0).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", flexShrink: 0 }}>
                  {Math.round((trade.confidence ?? 0) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
