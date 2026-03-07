"use client";

import { useEffect, useState } from "react";
import {
  api,
  type BrierEntry,
  type AttributionEntry,
  type DriftStatus,
  type CalibrationEntry,
  type PerformanceSummary,
  fmtUSDC,
} from "@/lib/api";
import { HelpTooltip } from "./ui/HelpTooltip";

// ─── Shared constants ────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;

function brierColor(score: number): string {
  if (score < 0.2) return "#30d158";
  if (score < 0.4) return "#ff9f0a";
  return "#ff453a";
}

function brierBg(score: number): string {
  if (score < 0.2) return "rgba(48,209,88,0.12)";
  if (score < 0.4) return "rgba(255,159,10,0.12)";
  return "rgba(255,69,58,0.12)";
}

function driftBadge(status: "clear" | "detected") {
  const isOk = status === "clear";
  return {
    color: isOk ? "#30d158" : "#ff453a",
    bg: isOk ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
    border: isOk ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)",
    label: isOk ? "CLEAR" : "DETECTED",
  };
}

// ─── PerformancePanel ────────────────────────────────────────────────────────

export function PerformancePanel() {
  const [brier, setBrier] = useState<BrierEntry[]>([]);
  const [attribution, setAttribution] = useState<AttributionEntry[]>([]);
  const [drift, setDrift] = useState<DriftStatus | null>(null);
  const [calibration, setCalibration] = useState<CalibrationEntry[]>([]);

  useEffect(() => {
    function fetchAll() {
      api.getBrierScores().then(setBrier).catch(() => {});
      api.getAttribution().then(setAttribution).catch(() => {});
      api.getDriftStatus().then(setDrift).catch(() => {});
      api.getCalibration().then(setCalibration).catch(() => {});
    }
    fetchAll();
    const iv = setInterval(fetchAll, 60_000);
    return () => clearInterval(iv);
  }, []);

  const topAgent = calibration.length > 0
    ? calibration.reduce((a, b) => (b.weight > a.weight ? b : a))
    : null;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2
            style={{
              margin: 0,
              fontSize: HEADLINE_SIZE,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Performance
          </h2>
          <HelpTooltip text="Advanced performance metrics and signal attribution. Tracks the accuracy of agent predictions over time." />
        </div>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.03em",
          }}
        >
          Layer 5 — Monitoring &amp; calibration
        </span>
      </div>

      {/* ── Brier Scores ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            BRIER SCORES (LAST 5)
          </span>
          <HelpTooltip text="A measure of prediction accuracy. Score ranges from 0 to 1, where 0 is a perfect prediction and 1 is a total miss." />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 8,
          }}
        >
          {brier.length === 0 ? (
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
              No scores yet
            </span>
          ) : (
            brier.slice(0, 5).map((entry, i) => (
              <div
                key={`${entry.slug}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  style={{
                    fontSize: META_SIZE,
                    color: "rgba(255,255,255,0.60)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "60%",
                    fontFamily: "monospace",
                  }}
                >
                  {entry.slug.length > 24
                    ? entry.slug.slice(0, 24) + "…"
                    : entry.slug}
                </span>
                <span
                  style={{
                    fontSize: META_SIZE,
                    fontWeight: 700,
                    fontFamily: '"SF Mono", monospace',
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: brierBg(entry.score),
                    color: brierColor(entry.score),
                  }}
                >
                  {entry.score.toFixed(3)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Attribution ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            TOP SIGNAL ATTRIBUTION
          </span>
          <HelpTooltip text="Identifies which logic branch (Oracle, Aura, Flux, etc.) is contributing most to successful trades." />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 8,
          }}
        >
          {attribution.length === 0 ? (
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
              No data
            </span>
          ) : (
            attribution.slice(0, 3).map((entry) => {
              const pct = Math.round(entry.hitRate * 100);
              return (
                <div key={entry.signalType}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: META_SIZE,
                        color: "rgba(255,255,255,0.65)",
                        textTransform: "capitalize",
                      }}
                    >
                      {entry.signalType.replace(/_/g, " ")}
                    </span>
                    <span
                      style={{
                        fontSize: META_SIZE,
                        fontFamily: '"SF Mono", monospace',
                        fontWeight: 600,
                        color: "#0a84ff",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.07)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(pct, 100)}%`,
                        borderRadius: 3,
                        background: "#0a84ff",
                        transition: "width 600ms ease",
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Drift Status ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            DRIFT DETECTION
          </span>
          <HelpTooltip text="Automatic detection of market regime shifts. Concept drift flags when market behavior deviates from training logic." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {drift === null ? (
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
              Loading…
            </span>
          ) : (
            <>
              {(["microstructure", "concept"] as const).map((key) => {
                const b = driftBadge(drift[key]);
                return (
                  <div
                    key={key}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: b.bg,
                      border: `1px solid ${b.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: META_SIZE,
                        color: "rgba(255,255,255,0.65)",
                        textTransform: "capitalize",
                      }}
                    >
                      {key}
                    </span>
                    <span
                      style={{
                        fontSize: LABEL_SIZE,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: b.color,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Top Agent (Calibration) ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
          Top Agent
        </span>
        {topAgent ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: BODY_SIZE,
                fontWeight: 600,
                color: "#bf5af2",
                fontFamily: "monospace",
              }}
            >
              {topAgent.agent}
            </span>
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                fontFamily: '"SF Mono", monospace',
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(191,90,242,0.15)",
                color: "#bf5af2",
                border: "1px solid rgba(191,90,242,0.25)",
              }}
            >
              w={topAgent.weight.toFixed(2)}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: META_SIZE,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.30)",
            }}
          >
            ···
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Compact summary for dashboard ───────────────────────────────────────────

export function PerformanceSummaryWidget() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    function fetchAll() {
      api.getPerformanceSummary()
        .then((data) => { setSummary(data); setError(false); })
        .catch(() => setError(true));
    }
    fetchAll();
    const iv = setInterval(fetchAll, 30_000);
    return () => clearInterval(iv);
  }, []);

  if (error) return <div style={{ ...panelStyle, flex: 1 }}><span style={{ fontSize: BODY_SIZE, color: "rgba(255,69,58,0.6)" }}>Failed to load performance data</span></div>;
  if (!summary) return <div style={{ ...panelStyle, flex: 1 }}><span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>Loading performance summary...</span></div>;

  const winRateNum = summary.winRate * 100;
  const winRate = winRateNum.toFixed(1);
  const winRateColor = winRateNum >= 55 ? "#30d158" : winRateNum >= 45 ? "#ff9f0a" : "#ff453a";
  const pnlColor = summary.pnlToday >= 0 ? "#30d158" : "#ff453a";
  const streak = summary.metrics.currentStreak;

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2
            style={{
              margin: 0,
              fontSize: HEADLINE_SIZE,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Performance Summary
          </h2>
          <HelpTooltip text="Unified performance tracking. Real-time Win Rate, P&L, and logic-branch attribution from the Layer 5 monitoring engine." />
        </div>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.03em",
          }}
        >
          Layer 5 Unified Dashboard
        </span>
      </div>

      {/* Primary Metrics */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>WIN RATE</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: winRateColor, fontFamily: "monospace" }}>{winRate}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>DAILY P&L</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: pnlColor, fontFamily: "monospace" }}>
            {summary.pnlToday >= 0 ? "+" : ""}{fmtUSDC(summary.pnlToday)}
          </div>
        </div>
      </div>

      {/* Rich Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Active Streak</span>
          <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: streak >= 0 ? "#30d158" : "#ff453a", fontFamily: "monospace" }}>
            {streak > 0 ? `+${streak}` : streak}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Best Trade</span>
          <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: "#30d158", fontFamily: "monospace" }}>
            {summary.metrics.bestTrade ? `${summary.metrics.bestTrade.split("-")[0].toUpperCase()} (+${fmtUSDC(summary.metrics.bestPnl)})` : "N/A"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Cumulative Vol</span>
          <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
            {fmtUSDC(summary.metrics?.totalVolume)}
          </span>
        </div>
      </div>

      {/* Alpha Decay Status */}
      {summary.alphaDecay && (
        <div style={{ 
          marginTop: 12, 
          padding: "8px 12px", 
          borderRadius: 8, 
          background: summary.alphaDecay.detected ? "rgba(255,69,58,0.10)" : "rgba(48,209,88,0.08)",
          border: `1px solid ${summary.alphaDecay.detected ? "rgba(255,69,58,0.20)" : "rgba(48,209,88,0.15)"}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, color: summary.alphaDecay.detected ? "#ff453a" : "#30d158" }}>
              ALPHA HEALTH
            </span>
            <span style={{ fontSize: LABEL_SIZE, fontFamily: "monospace", color: "rgba(255,255,255,0.40)" }}>
              {Math.round(summary.alphaDecay.rollingHitRate * 100)}% ROLLING
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.3, color: "rgba(255,255,255,0.50)" }}>
            {summary.alphaDecay.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
