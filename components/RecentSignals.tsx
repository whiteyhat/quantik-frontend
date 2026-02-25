"use client";

import { useEffect, useState } from "react";
import { api, type Trade } from "@/lib/api";

function decisionBadge(direction: "YES" | "NO", outcome: string) {
  if (outcome === "PENDING" || outcome === "OPEN") {
    return { label: "PASS", color: "var(--ios-orange)", bg: "var(--ios-orange-glow)" };
  }
  if (direction === "YES") {
    return { label: "BET_YES", color: "var(--ios-green)", bg: "var(--ios-green-glow)" };
  }
  return { label: "BET_NO", color: "var(--ios-red)", bg: "var(--ios-red-glow)" };
}

function evGradeFromPnl(pnlPct?: number): { grade: string; color: string } {
  if (pnlPct === undefined) return { grade: "-", color: "var(--text-tertiary)" };
  if (pnlPct > 10) return { grade: "A", color: "var(--ios-green)" };
  if (pnlPct > 5) return { grade: "B", color: "var(--ios-blue)" };
  if (pnlPct > 0) return { grade: "C", color: "var(--ios-orange)" };
  return { grade: "D", color: "var(--ios-red)" };
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function RecentSignals() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    api.getBalance(); // trigger a fetch cycle
    // Using the store's recent trades approach - fetch from API if available
    // For now, using a mock based on the Trade type
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/wallet/positions`)
      .then(() => {})
      .catch(() => {});
  }, []);

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}>
        Recent Signals
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {trades.length === 0 && (
          <span className="text-body" style={{ color: "var(--text-tertiary)", textAlign: "center", padding: 16 }}>
            No recent pipeline runs
          </span>
        )}
        {trades.slice(0, 5).map((t) => {
          const badge = decisionBadge(t.direction, t.outcome);
          const ev = evGradeFromPnl(t.pnl);
          return (
            <div
              key={t.id}
              className="glass-card"
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 12,
              }}
            >
              {/* Decision badge */}
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: badge.bg,
                  color: badge.color,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {badge.label}
              </span>

              {/* Market question */}
              <span
                className="text-subhead"
                style={{
                  color: "var(--text-secondary)",
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {t.market}
              </span>

              {/* EV grade chip */}
              <span
                className="font-mono-data"
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: 600,
                  color: ev.color,
                  flexShrink: 0,
                }}
              >
                {ev.grade}
              </span>

              {/* Time ago */}
              <span
                className="text-caption"
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              >
                {timeAgo(t.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
