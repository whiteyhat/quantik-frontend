"use client";

import { useEffect, useState } from "react";
import {
  api,
  type BrierEntry,
  type AttributionEntry,
  type DriftStatus,
  type CalibrationEntry,
} from "@/lib/api";

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
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 8,
          }}
        >
          DRIFT DETECTION
        </span>
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
  const [drift, setDrift] = useState<DriftStatus | null>(null);
  const [brier, setBrier] = useState<BrierEntry[]>([]);
  const [topAgent, setTopAgent] = useState<CalibrationEntry | null>(null);

  useEffect(() => {
    function fetchAll() {
      api.getDriftStatus().then(setDrift).catch(() => {});
      api.getBrierScores().then(setBrier).catch(() => {});
      api
        .getCalibration()
        .then((c) => {
          if (c.length > 0) {
            setTopAgent(c.reduce((a, b) => (b.weight > a.weight ? b : a)));
          }
        })
        .catch(() => {});
    }
    fetchAll();
    const iv = setInterval(fetchAll, 60_000);
    return () => clearInterval(iv);
  }, []);

  const avgBrier =
    brier.length > 0
      ? brier.reduce((sum, b) => sum + b.score, 0) / brier.length
      : null;

  const microOk = drift?.microstructure === "clear";
  const conceptOk = drift?.concept === "clear";

  // Enrichment: calculate hit rate from attribution
  const totalTrades = attribution.reduce((acc, a) => acc + a.count, 0);
  const avgHitRate = totalTrades > 0 
    ? attribution.reduce((acc, a) => acc + (a.hitRate * a.count), 0) / totalTrades 
    : null;

  return (
    <div style={panelStyle}>
      <div style={{ marginBottom: 10 }}>
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
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.03em",
          }}
        >
          Layer 5 summary
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* Avg Hit Rate */}
        {avgHitRate !== null && (
          <span
            style={{
              fontSize: LABEL_SIZE,
              fontWeight: 700,
              fontFamily: '"SF Mono", monospace',
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(10,132,255,0.12)",
              color: "#0a84ff",
              border: "1px solid rgba(10,132,255,0.25)",
            }}
          >
            Hit Rate {(avgHitRate * 100).toFixed(1)}%
          </span>
        )}

        {/* Avg Brier */}
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            fontFamily: '"SF Mono", monospace',
            padding: "3px 8px",
            borderRadius: 6,
            background: avgBrier !== null ? brierBg(avgBrier) : "rgba(255,255,255,0.06)",
            color: avgBrier !== null ? brierColor(avgBrier) : "rgba(255,255,255,0.30)",
            border: `1px solid ${avgBrier !== null ? brierColor(avgBrier) + "40" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          Brier {avgBrier !== null ? avgBrier.toFixed(3) : "···"}
        </span>

        {/* Drift badges */}
        {drift && (
          <>
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                fontFamily: "monospace",
                padding: "3px 8px",
                borderRadius: 6,
                background: microOk ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
                color: microOk ? "#30d158" : "#ff453a",
                border: `1px solid ${microOk ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
              }}
            >
              Micro {microOk ? "OK" : "DRIFT"}
            </span>
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                fontFamily: "monospace",
                padding: "3px 8px",
                borderRadius: 6,
                background: conceptOk ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
                color: conceptOk ? "#30d158" : "#ff453a",
                border: `1px solid ${conceptOk ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
              }}
            >
              Concept {conceptOk ? "OK" : "DRIFT"}
            </span>
          </>
        )}

        {/* Top agent */}
        {topAgent && (
          <span
            style={{
              fontSize: LABEL_SIZE,
              fontWeight: 700,
              fontFamily: "monospace",
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(191,90,242,0.12)",
              color: "#bf5af2",
              border: "1px solid rgba(191,90,242,0.25)",
            }}
          >
            Top: {topAgent.agent}
          </span>
        )}
      </div>
    </div>
  );
}
