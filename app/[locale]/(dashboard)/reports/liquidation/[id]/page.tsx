"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type LiquidationReport, type LiquidationAsset, type TimelineEvent } from "@/lib/api";

// ─── Font sizes — L003 compliant ─────────────────────────────────────────────
const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;
const METRIC_SIZE = 24;

// ─── Glassmorphism panel — L001 ───────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 24,
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtUSDC(n: number | null | undefined): string {
  const safe = n ?? 0;
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(p: number | null | undefined): string {
  const safe = p ?? 0;
  return `${Math.round(safe * 100)}¢`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: "18px 20px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.30)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div
        style={{
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          fontSize: METRIC_SIZE,
          fontWeight: 700,
          color,
          lineHeight: 1,
          marginBottom: sub ? 6 : 0,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.25)",
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Breakdown Table ─────────────────────────────────────────────────────────
function BreakdownTable({ assets }: { assets: LiquidationAsset[] }) {
  const t = useTranslations("liquidation");
  const headers = [t("asset"), t("execPrice"), t("trigger"), t("sizeUsdc"), t("pnlImpact")];

  return (
    <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: HEADLINE_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {t("breakdown")}
        </h2>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 20px",
                    textAlign: idx === 0 ? "left" : "right",
                    fontSize: LABEL_SIZE,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((row, i) => {
              const pnl = row.pnlImpact ?? 0;
              const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
              const pnlSign = pnl >= 0 ? "+" : "";
              const execBelowTrigger = (row.executionPrice ?? 0) < (row.triggerPrice ?? 0);

              return (
                <tr
                  key={row.asset ?? i}
                  style={{
                    borderBottom:
                      i < assets.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      "rgba(255,255,255,0.025)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent")
                  }
                >
                  {/* Asset */}
                  <td
                    style={{
                      padding: "12px 20px",
                      fontSize: BODY_SIZE,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.80)",
                      fontFamily: '"SF Mono", monospace',
                    }}
                  >
                    {row.asset ?? ""}
                  </td>

                  {/* Execution Price */}
                  <td
                    style={{
                      padding: "12px 20px",
                      textAlign: "right",
                      fontFamily: '"SF Mono", monospace',
                      fontSize: BODY_SIZE,
                      // L004-style tint: red if slipped below trigger
                      color: execBelowTrigger
                        ? "#ff453a"
                        : "rgba(255,255,255,0.70)",
                    }}
                  >
                    {fmtPrice(row.executionPrice)}
                  </td>

                  {/* Trigger Price */}
                  <td
                    style={{
                      padding: "12px 20px",
                      textAlign: "right",
                      fontFamily: '"SF Mono", monospace',
                      fontSize: BODY_SIZE,
                      color: "rgba(255,255,255,0.40)",
                    }}
                  >
                    {fmtPrice(row.triggerPrice)}
                  </td>

                  {/* Size */}
                  <td
                    style={{
                      padding: "12px 20px",
                      textAlign: "right",
                      fontFamily: '"SF Mono", monospace',
                      fontSize: BODY_SIZE,
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    {fmtUSDC(row.size)}
                  </td>

                  {/* P&L Impact — L004: tinted glass pill */}
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: META_SIZE,
                        fontWeight: 700,
                        fontFamily: '"SF Mono", monospace',
                        background:
                          pnl >= 0
                            ? "rgba(48,209,88,0.12)"
                            : "rgba(255,69,58,0.12)",
                        color: pnlColor,
                        border: `1px solid ${
                          pnl >= 0
                            ? "rgba(48,209,88,0.25)"
                            : "rgba(255,69,58,0.25)"
                        }`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pnlSign}
                      {fmtUSDC(pnl)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Timeline event icon ──────────────────────────────────────────────────────
function timelineIcon(type: string): { icon: string; color: string } {
  switch (type) {
    case "protocol_start": return { icon: "🚨", color: "#ff453a" };
    case "protocol_end":   return { icon: "✅", color: "#30d158" };
    case "circuit_break":  return { icon: "⚡", color: "#ff9f0a" };
    case "order_cancel":   return { icon: "🗑️", color: "#ff9f0a" };
    case "position_close": return { icon: "📉", color: "#0a84ff" };
    default:               return { icon: "📋", color: "rgba(255,255,255,0.40)" };
  }
}

// ─── Timeline Feed ────────────────────────────────────────────────────────────
function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  const t = useTranslations("liquidation");
  const sorted = [...events].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  return (
    <div style={panelStyle}>
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: HEADLINE_SIZE,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {t("timeline")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {sorted.map((evt, i) => {
          const { icon, color } = timelineIcon(evt.type ?? "");
          const isLast = i === sorted.length - 1;

          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
            >
              {/* Icon + connector */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  width: 32,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `${color}1A`, // 10% opacity
                    border: `1px solid ${color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      minHeight: 20,
                      background: "rgba(255,255,255,0.06)",
                      margin: "4px 0",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div
                style={{
                  paddingBottom: isLast ? 0 : 16,
                  paddingTop: 5,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: BODY_SIZE,
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.5,
                    marginBottom: 3,
                  }}
                >
                  {evt.message ?? ""}
                </div>
                <div
                  style={{
                    fontSize: LABEL_SIZE,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "monospace",
                    letterSpacing: "0.04em",
                  }}
                >
                  {fmtTime(evt.timestamp ?? 0)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LiquidationReport["status"] }) {
  const t = useTranslations("liquidation");
  const map = {
    complete: { color: "#30d158", bg: "rgba(48,209,88,0.12)", border: "rgba(48,209,88,0.25)", label: t("statusComplete") },
    partial:  { color: "#ff9f0a", bg: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.25)", label: t("statusPartial") },
    failed:   { color: "#ff453a", bg: "rgba(255,69,58,0.12)", border: "rgba(255,69,58,0.25)", label: t("statusFailed") },
  };
  const s = map[status] ?? map.failed;

  return (
    <span
      style={{
        fontSize: LABEL_SIZE,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontFamily: "monospace",
        letterSpacing: "0.10em",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LiquidationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("liquidation");
  const { id } = use(params);
  const [report, setReport] = useState<LiquidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;

    api.getLiquidationReport(id)
      .then((data) => {
        setReport({
          id: data?.id ?? id,
          timestamp: data?.timestamp ?? Date.now(),
          triggeredBy: data?.triggeredBy ?? "",
          totalRealizedValue: data?.totalRealizedValue ?? 0,
          totalSlippage: data?.totalSlippage ?? 0,
          totalGas: data?.totalGas ?? 0,
          assets: data?.assets ?? [],
          timeline: data?.timeline ?? [],
          status: data?.status ?? "complete",
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
        <div>
          <Skeleton width={200} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={300} height={12} borderRadius={4} />
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...panelStyle, padding: "18px 20px", flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton width={80} height={10} borderRadius={4} />
              <Skeleton width={100} height={24} borderRadius={6} />
              <Skeleton width={120} height={10} borderRadius={4} />
            </div>
          ))}
        </div>
        <div style={panelStyle}>
          <Skeleton width={160} height={14} borderRadius={4} style={{ marginBottom: 16 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", gap: 20, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Skeleton width="25%" height={13} borderRadius={4} />
              <Skeleton width="15%" height={13} borderRadius={4} />
              <Skeleton width="15%" height={13} borderRadius={4} />
              <Skeleton width="15%" height={13} borderRadius={4} />
              <Skeleton width={60} height={20} borderRadius={20} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        style={{
          ...panelStyle,
          borderColor: "rgba(255,69,58,0.25)",
          background: "rgba(255,69,58,0.06)",
          textAlign: "center",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
        <div style={{ fontSize: BODY_SIZE, color: "#ff453a", fontFamily: "monospace" }}>
          {error ?? t("notFound")}
        </div>
      </div>
    );
  }

  const totalPnL = (report.assets ?? []).reduce((sum, a) => sum + (a.pnlImpact ?? 0), 0);
  const pnlColor = totalPnL >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = totalPnL >= 0 ? "+" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.03em",
              }}
            >
              {t("title")}
            </h1>
            <div
              style={{
                marginTop: 4,
                fontSize: META_SIZE,
                color: "rgba(255,255,255,0.30)",
                fontFamily: "monospace",
              }}
            >
              {report.id ?? ""}  ·  {fmtDate(report.timestamp ?? 0)}  ·  {t("triggeredBy")} {report.triggeredBy ?? ""}
            </div>
          </div>
          <StatusBadge status={report.status ?? "complete"} />
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <KPICard
          label={t("totalRealizedValue")}
          value={fmtUSDC(report.totalRealizedValue)}
          sub={t("netProceeds")}
          color="rgba(255,255,255,0.88)"
          icon="💰"
        />
        <KPICard
          label={t("totalPnlImpact")}
          value={`${pnlSign}${fmtUSDC(totalPnL)}`}
          sub={t("acrossPositions")}
          color={pnlColor}
          icon={totalPnL >= 0 ? "📈" : "📉"}
        />
        <KPICard
          label={t("slippage")}
          value={fmtUSDC(report.totalSlippage)}
          sub={t("slippageDesc")}
          color="#ff9f0a"
          icon="⚡"
        />
        <KPICard
          label={t("gasCosts")}
          value={fmtUSDC(report.totalGas)}
          sub={t("gasCostsDesc")}
          color="#bf5af2"
          icon="⛽"
        />
      </div>

      {/* ── Breakdown Table ───────────────────────────────────────────────── */}
      {(report.assets ?? []).length > 0 && (
        <BreakdownTable assets={report.assets} />
      )}

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {(report.timeline ?? []).length > 0 && (
        <IncidentTimeline events={report.timeline} />
      )}
    </div>
  );
}
