"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtUSDC, fmtPrice, type WalletBalance, type Position } from "@/lib/api";

// ─── Safe number formatter (guards against undefined/null from API) ───────────
const fmt1 = (n: unknown) => ((n as number) ?? 0).toFixed(1);

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 20,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskSummary {
  drawdown: number;
  drawdownLimit: number;
  kellyUtilization: number;
  status: "NORMAL" | "WARNING" | "HALT";
  circuitArmed: boolean;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
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
        {title}
      </h2>
      {subtitle && (
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.03em",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ─── Metric tile ─────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  valueColor = "rgba(255,255,255,0.92)",
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: LABEL_SIZE,
          fontWeight: 600,
          color: "rgba(255,255,255,0.30)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          fontSize: 22,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)" }}>{sub}</span>
      )}
    </div>
  );
}

// ─── Skeleton tile ────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      style={{
        ...panelStyle,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 80,
          height: 10,
          borderRadius: 5,
          background: "rgba(255,255,255,0.07)",
        }}
      />
      <div
        style={{
          width: 120,
          height: 22,
          borderRadius: 6,
          background: "rgba(255,255,255,0.05)",
        }}
      />
    </div>
  );
}

// ─── Positions Table ──────────────────────────────────────────────────────────

function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div
        style={{
          padding: "32px 0",
          textAlign: "center",
          fontSize: BODY_SIZE,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        No open positions
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Market", "Direction", "Size", "Entry", "Current", "P&L", "P&L %"].map((col) => (
              <th
                key={col}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: LABEL_SIZE,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const isYes = p.direction === "YES";
            const dirColor = isYes ? "#30d158" : "#ff453a";
            // Guard all numeric fields with ?? 0 before any arithmetic/toFixed
            const pnl = (p.pnl ?? 0) as number;
            const pnlPct = (p.pnlPct ?? 0) as number;
            const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
            const pnlSign = pnl >= 0 ? "+" : "";

            return (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/market/${p.slug}`}
                    style={{
                      fontSize: BODY_SIZE,
                      color: "rgba(255,255,255,0.75)",
                      textDecoration: "none",
                      display: "block",
                      maxWidth: 280,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.market}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: LABEL_SIZE,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 5,
                      background: isYes ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
                      color: dirColor,
                      border: `1px solid ${isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
                      fontFamily: "monospace",
                    }}
                  >
                    {p.direction}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}
                  >
                    {fmtUSDC(p.size ?? 0)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.50)", fontFamily: "monospace" }}>
                    {fmtPrice(p.entryPrice ?? 0)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>
                    {fmtPrice(p.currentPrice ?? 0)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: BODY_SIZE,
                      fontWeight: 600,
                      color: pnlColor,
                      fontFamily: "monospace",
                    }}
                  >
                    {pnlSign}{fmtUSDC(pnl)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: BODY_SIZE,
                      fontWeight: 600,
                      color: pnlColor,
                      fontFamily: "monospace",
                    }}
                  >
                    {pnlSign}{fmt1(pnlPct)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Risk panel ───────────────────────────────────────────────────────────────

function RiskPanel({ risk }: { risk: RiskSummary | null }) {
  if (!risk) return null;

  // Guard all risk fields with ?? 0 to prevent toFixed on undefined
  const drawdown = (risk.drawdown ?? 0) as number;
  const drawdownLimit = ((risk.drawdownLimit ?? 1) as number) || 1; // avoid division by zero
  const kellyUtilization = (risk.kellyUtilization ?? 0) as number;

  const drawdownPct = (drawdown / drawdownLimit) * 100;
  const drawdownColor =
    drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";
  const statusColor =
    risk.status === "NORMAL" ? "#30d158" : risk.status === "WARNING" ? "#ff9f0a" : "#ff453a";

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <SectionHeader title="Risk Summary" />
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            color: statusColor,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
          }}
        >
          {risk.status ?? "NORMAL"}
        </span>
      </div>

      {/* Drawdown bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
        >
          <span
            style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Drawdown
          </span>
          <span style={{ fontFamily: "monospace", fontSize: META_SIZE, color: drawdownColor }}>
            {fmt1(drawdown)}% / {fmt1(drawdownLimit)}%
          </span>
        </div>
        <div
          style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(drawdownPct, 100)}%`,
              borderRadius: 3,
              background: drawdownColor,
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>

      {/* Kelly utilization */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
        >
          <span
            style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Kelly Utilization
          </span>
          <span style={{ fontFamily: "monospace", fontSize: META_SIZE, color: "rgba(255,255,255,0.65)" }}>
            {fmt1(kellyUtilization)}% / 100%
          </span>
        </div>
        <div
          style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(kellyUtilization, 100)}%`,
              borderRadius: 3,
              background: "#0a84ff",
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>

      {/* Circuit breaker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          background: risk.circuitArmed ? "rgba(48,209,88,0.07)" : "rgba(255,69,58,0.10)",
          border: `1px solid ${risk.circuitArmed ? "rgba(48,209,88,0.20)" : "rgba(255,69,58,0.30)"}`,
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Circuit Breaker</span>
        <span
          style={{
            fontSize: META_SIZE,
            fontWeight: 700,
            fontFamily: "monospace",
            color: risk.circuitArmed ? "#30d158" : "#ff453a",
            letterSpacing: "0.08em",
          }}
        >
          {risk.circuitArmed ? "ARMED" : "TRIGGERED"}
        </span>
      </div>
    </div>
  );
}

// ─── Portfolio Page ───────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [risk, setRisk] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getBalance().then(setWallet).catch(() => {}),
      api.getPositions()
        .then((data) => {
          // Guard: API must return an array
          const safe = Array.isArray(data) ? data : (data as Record<string, unknown>)?.positions ?? [];
          setPositions(safe as Position[]);
        })
        .catch(() => {}),
      fetch(`${BASE_URL}/api/portfolio/risk`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setRisk(d))
        .catch(() => {}),
    ]).finally(() => setLoading(false));

    const iv = setInterval(() => {
      api.getBalance().then(setWallet).catch(() => {});
      api.getPositions()
        .then((data) => {
          const safe = Array.isArray(data) ? data : [];
          setPositions(safe as Position[]);
        })
        .catch(() => {});
    }, 15_000);

    return () => clearInterval(iv);
  }, []);

  // Guard all arithmetic against null/undefined positions
  const totalPnl = positions.reduce((acc, p) => acc + ((p.pnl ?? 0) as number), 0);
  const pnlColor = totalPnl >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = totalPnl >= 0 ? "+" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          Portfolio
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>
          Live positions, balances, and risk exposure
        </p>
      </div>

      {loading ? (
        /* Skeleton loading state — never crashes on null data */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {[1, 2, 3, 4].map((i) => <SkeletonTile key={i} />)}
          </div>
          <div style={{ ...panelStyle, padding: 40, textAlign: "center", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
            Loading portfolio…
          </div>
        </div>
      ) : (
        <>
          {/* Metrics row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <MetricTile
              label="USDC Balance"
              value={wallet ? fmtUSDC(wallet.usdc ?? 0) : "···"}
            />
            <MetricTile
              label="Open Positions"
              value={String(positions.length)}
            />
            <MetricTile
              label="Total P&L"
              value={`${pnlSign}${fmtUSDC(totalPnl)}`}
              valueColor={pnlColor}
            />
            <MetricTile
              label="Win Rate"
              value={wallet ? `${Math.round(((wallet.winRate ?? 0) as number) * 100)}%` : "···"}
              sub={wallet ? `${wallet.totalTrades ?? 0} trades` : undefined}
            />
          </div>

          {/* Positions + Risk row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: risk ? "1fr 320px" : "1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Positions table */}
            <div style={panelStyle}>
              <SectionHeader
                title="Open Positions"
                subtitle={`${positions.length} active trade${positions.length !== 1 ? "s" : ""}`}
              />
              <PositionsTable positions={positions} />
            </div>

            {/* Risk panel */}
            {risk && <RiskPanel risk={risk} />}
          </div>
        </>
      )}
    </div>
  );
}
