"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://quantik-backend-production.up.railway.app";

export interface ExecutedTrade {
  id?: string;
  slug: string;
  direction: "YES" | "NO";
  amount: number;
  confidence: number; // 0-1
  status: "PLACED" | "FAILED" | "PAPER";
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
        No trades yet — first signal incoming
      </span>
    </div>
  );
}

export function ExecutionLog() {
  const [trades, setTrades] = useState<ExecutedTrade[]>([]);

  const fetchTrades = async () => {
    try {
      // Try executed trades endpoint first, fall back to performance summary
      const res = await fetch(`${BASE_URL}/api/scanner/results?executed=true`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTrades(data as ExecutedTrade[]);
          return;
        }
      }
    } catch { /* fall through */ }

    try {
      const res = await fetch(`${BASE_URL}/api/performance/summary`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.recentTrades && Array.isArray(data.recentTrades)) {
        setTrades(data.recentTrades as ExecutedTrade[]);
      }
    } catch { /* silently fail */ }
  };

  useEffect(() => {
    fetchTrades();
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
          Execution Log
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {trades.length} trades
        </span>
      </div>

      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map((t, i) => {
            const id = t.id ?? `${t.slug}-${i}`;
            const color = STATUS_COLOR[t.status] ?? "rgba(255,255,255,0.4)";
            const icon = STATUS_ICON[t.status] ?? "·";
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
                  {t.slug}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: t.direction === "YES" ? "#30d158" : "#ff453a",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  BET {t.direction}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", flexShrink: 0 }}>
                  ${(t.amount ?? 0).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", flexShrink: 0 }}>
                  {Math.round((t.confidence ?? 0) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
