"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PipelineRun {
  id: string;
  slug: string;
  market: string;
  decision: "BET_YES" | "BET_NO" | "PASS";
  confidence: number;
  timestamp: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

interface DecisionStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function decisionStyle(decision: PipelineRun["decision"]): DecisionStyle {
  switch (decision) {
    case "BET_YES":
      return {
        label: "BUY YES",
        color: "#30d158",
        bg: "rgba(48,209,88,0.15)",
        border: "rgba(48,209,88,0.25)",
      };
    case "BET_NO":
      return {
        label: "BUY NO",
        color: "#ff453a",
        bg: "rgba(255,69,58,0.15)",
        border: "rgba(255,69,58,0.25)",
      };
    default:
      return {
        label: "PASS",
        color: "#ff9f0a",
        bg: "rgba(255,159,10,0.15)",
        border: "rgba(255,159,10,0.25)",
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RecentSignals() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);

  useEffect(() => {
    const base =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001")
        : "http://localhost:3001";

    fetch(`${base}/api/pipeline/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setRuns((data as PipelineRun[]).slice(0, 10));
        }
      })
      .catch(() => {
        // API not available — show empty state, no crash
      });

    const iv = setInterval(() => {
      fetch(`${base}/api/pipeline/history`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: unknown) => {
          if (Array.isArray(data)) {
            setRuns((data as PipelineRun[]).slice(0, 10));
          }
        })
        .catch(() => {});
    }, 30_000);

    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {runs.length === 0 ? (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          No recent pipeline runs
        </div>
      ) : (
        runs.map((run) => {
          const ds = decisionStyle(run.decision);
          return (
            <Link
              key={run.id}
              href={`/market/${run.slug ?? ""}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  transition: "background 150ms ease",
                }}
              >
                {/* Decision badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: ds.bg,
                    color: ds.color,
                    border: `1px solid ${ds.border}`,
                    fontFamily: "monospace",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {ds.label}
                </span>

                {/* Market slug */}
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.55)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {run.market ?? run.slug ?? "—"}
                </span>

                {/* Confidence */}
                <span
                  style={{
                    fontFamily: '"SF Mono", monospace',
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    flexShrink: 0,
                  }}
                >
                  {((run.confidence ?? 0) * 100).toFixed(0)}%
                </span>

                {/* Timestamp */}
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.20)",
                    flexShrink: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {timeAgo(run.timestamp ?? 0)}
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
