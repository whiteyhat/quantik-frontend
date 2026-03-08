"use client";

import { useSocketEvent, type AgentAlertEvent } from "@/context/SocketContext";
import type { Signal } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const panelStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(48,209,88,0.10) 0%, rgba(10,132,255,0.08) 100%)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(48,209,88,0.20)",
  borderRadius: 12,
  padding: 20,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confidenceColor(c: number): string {
  if (c >= 70) return "#30d158";
  if (c >= 50) return "#ff9f0a";
  return "#ff453a";
}

function statusBadge(status: Signal["status"]): { label: string; bg: string; color: string } {
  switch (status) {
    case "TRADE":
      return { label: "TRADE", bg: "rgba(48,209,88,0.15)", color: "#30d158" };
    case "WATCH":
      return { label: "WATCH", bg: "rgba(255,159,10,0.15)", color: "#ff9f0a" };
    default:
      return { label: "SKIP", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" };
  }
}

function decisionLabel(decision: string): { text: string; color: string } {
  const d = decision.toUpperCase();
  if (d === "BET_YES" || d === "BUY_YES") return { text: "YES", color: "#30d158" };
  if (d === "BET_NO" || d === "BUY_NO") return { text: "NO", color: "#ff453a" };
  if (d === "PASS" || d === "SKIP") return { text: "PASS", color: "rgba(255,255,255,0.40)" };
  return { text: d || "—", color: "rgba(255,255,255,0.40)" };
}

function timeAgo(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AiInsightCardProps {
  signals: Signal[];
  loading: boolean;
}

export function AiInsightCard({ signals, loading }: AiInsightCardProps) {
  // Listen for real-time insight events (log-only for now, signals refresh via polling)
  useSocketEvent<AgentAlertEvent>("agent:alert", () => {});

  const latestSignal = signals.length > 0 ? signals[0] : null;
  const confidence = latestSignal?.confidence ?? 0;
  const confColor = confidenceColor(confidence);
  const remaining = signals.slice(1, 4); // show up to 3 more

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#30d158",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            AI Insights
          </span>
        </div>
        {signals.length > 0 && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: '"SF Mono", monospace' }}>
            {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="100%" height={40} borderRadius={6} />
          <Skeleton width="60%" height={16} borderRadius={4} />
        </div>
      ) : latestSignal ? (
        <>
          {/* Latest signal — featured */}
          <div style={{ marginBottom: 14 }}>
            {/* Decision + Status row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {(() => {
                const badge = statusBadge(latestSignal.status);
                return (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: badge.bg,
                      color: badge.color,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {badge.label}
                  </span>
                );
              })()}
              {(() => {
                const dec = decisionLabel(latestSignal.decision);
                return (
                  <span
                    style={{
                      fontFamily: '"SF Mono", monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      color: dec.color,
                    }}
                  >
                    {dec.text}
                  </span>
                );
              })()}
              {latestSignal.edge !== 0 && (
                <span
                  style={{
                    fontFamily: '"SF Mono", monospace',
                    fontSize: 10,
                    color: latestSignal.edge > 0 ? "#30d158" : "#ff453a",
                  }}
                >
                  {latestSignal.edge > 0 ? "+" : ""}{latestSignal.edge.toFixed(1)}% edge
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: '"SF Mono", monospace' }}>
                {timeAgo(latestSignal.timestamp)}
              </span>
            </div>

            {/* Question text */}
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.80)",
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              &ldquo;{latestSignal.question}&rdquo;
            </div>

            {/* Confidence bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.04em" }}>
                Confidence
              </span>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  color: confColor,
                }}
              >
                {Math.round(confidence)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(confidence, 100)}%`,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${confColor}, #0a84ff)`,
                  transition: "width 500ms ease",
                }}
              />
            </div>
          </div>

          {/* Recent signals list */}
          {remaining.length > 0 && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {remaining.map((s) => {
                const badge = statusBadge(s.status);
                const dec = decisionLabel(s.decision);
                const cc = confidenceColor(s.confidence);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: badge.bg,
                        color: badge.color,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: dec.color,
                        fontFamily: '"SF Mono", monospace',
                        flexShrink: 0,
                        width: 28,
                      }}
                    >
                      {dec.text}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.55)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.question}
                    </span>
                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: 11,
                        fontWeight: 700,
                        color: cc,
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(s.confidence)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
          No insights yet — run a pipeline analysis to generate insights.
        </div>
      )}
    </div>
  );
}
