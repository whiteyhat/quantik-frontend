"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtUSDC, fmtPrice, type WalletBalance, type Position } from "@/lib/api";
import { MarketScanner } from "@/components/MarketScanner";
import { RecentSignals } from "@/components/RecentSignals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// L001: Glassmorphism panel helper — all cards MUST use this, never flat opaque
const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

// L003: minimum font sizes enforced — no text below 11px
const LABEL_SIZE = 11; // minimum caption
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;
const METRIC_SIZE = 22; // primary metric

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
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

// ─── Win Rate Ring ────────────────────────────────────────────────────────────

function WinRateRing({ rate, trades }: { rate: number; trades: number }) {
  const safeRate = isNaN(rate) ? 0 : Math.max(0, Math.min(1, rate));
  const pct = Math.round(safeRate * 100);
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - safeRate * circumference;

  return (
    <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="34" cy="34" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="4"
        />
        <circle
          cx="34" cy="34" r={r}
          fill="none"
          stroke="#30d158"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: '"SF Mono", monospace',
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1,
          }}
        >
          {pct}%
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)", lineHeight: 1.2 }}>
          {trades}
        </span>
      </div>
    </div>
  );
}

// ─── Portfolio Overview Card ──────────────────────────────────────────────────

function PortfolioCard() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);

  useEffect(() => {
    api.getBalance().then(setWallet).catch(() => {});
    const iv = setInterval(() => api.getBalance().then(setWallet).catch(() => {}), 30_000);
    return () => clearInterval(iv);
  }, []);

  const pnl = wallet?.pnl ?? 0;
  const pnlPct = wallet?.pnlPct ?? 0;
  const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = pnl >= 0 ? "+" : "";

  // Kelly utilization mocked — 34% used of 100% allowed
  const kellyPct = 34;
  const circuitArmed = true;

  return (
    <div style={panelStyle}>
      <SectionHeader title="Portfolio" subtitle="Layer 3 — Risk Control" />

      {/* Total USDC — primary metric */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          TOTAL USDC
        </span>
        <div
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: METRIC_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.2,
            marginTop: 4,
          }}
        >
          {wallet ? fmtUSDC(wallet.usdc) : "···"}
        </div>
        {wallet && (
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              padding: "2px 8px",
              borderRadius: 100,
              fontSize: META_SIZE,
              fontWeight: 600,
              // L004: tinted glass pill, not solid fill
              background: pnl >= 0 ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
              color: pnlColor,
              border: `1px solid ${pnl >= 0 ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
              fontFamily: '"SF Mono", monospace',
            }}
          >
            {pnlSign}{fmtUSDC(pnl)} ({pnlSign}{(pnlPct ?? 0).toFixed(1)}%)
          </span>
        )}
      </div>

      {/* Win Rate row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          padding: "12px 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            WIN RATE
          </span>
          <div style={{ marginTop: 2, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
            {wallet?.totalTrades ?? 0} total trades
          </div>
        </div>
        <WinRateRing rate={wallet?.winRate ?? 0} trades={wallet?.totalTrades ?? 0} />
      </div>

      {/* Kelly utilization */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            KELLY UTILIZATION
          </span>
          <span
            style={{
              fontFamily: '"SF Mono", monospace',
              fontSize: META_SIZE,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {kellyPct}% / 100%
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
              width: `${kellyPct}%`,
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
          background: circuitArmed
            ? "rgba(48,209,88,0.07)"
            : "rgba(255,69,58,0.10)",
          border: `1px solid ${circuitArmed ? "rgba(48,209,88,0.20)" : "rgba(255,69,58,0.30)"}`,
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
          Circuit Breaker
        </span>
        <span
          style={{
            fontSize: META_SIZE,
            fontWeight: 700,
            fontFamily: "monospace",
            color: circuitArmed ? "#30d158" : "#ff453a",
            letterSpacing: "0.08em",
          }}
        >
          {circuitArmed ? "ARMED" : "TRIGGERED"}
        </span>
      </div>
    </div>
  );
}

// ─── Active Positions Card ────────────────────────────────────────────────────

function ActivePositionsCard() {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    api.getPositions().then(setPositions).catch(() => {});
    const iv = setInterval(() => api.getPositions().then(setPositions).catch(() => {}), 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={panelStyle}>
      <SectionHeader title="Active Positions" />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {positions.length === 0 ? (
          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              fontSize: BODY_SIZE,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            No open positions
          </div>
        ) : (
          positions.map((p) => {
            const isYes = p.direction === "YES";
            const accentColor = isYes ? "#30d158" : "#ff453a";
            const pnl = p.pnl ?? 0;
            const pnlPct = p.pnlPct ?? 0;
            const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
            const pnlSign = pnl >= 0 ? "+" : "";

            return (
              <Link
                key={p.id}
                href={`/market/${p.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${accentColor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {/* Market name */}
                  <div
                    style={{
                      fontSize: BODY_SIZE,
                      color: "rgba(255,255,255,0.80)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.market}
                  </div>

                  {/* Row: direction + prices + P&L */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* L004: tinted glass pill */}
                    <span
                      style={{
                        fontSize: LABEL_SIZE,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 5,
                        background: isYes ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
                        color: accentColor,
                        border: `1px solid ${isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
                        fontFamily: "monospace",
                        flexShrink: 0,
                      }}
                    >
                      {p.direction}
                    </span>

                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: META_SIZE,
                        color: "rgba(255,255,255,0.40)",
                        flex: 1,
                      }}
                    >
                      {fmtPrice(p.entryPrice)} → {fmtPrice(p.currentPrice)}
                    </span>

                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: META_SIZE,
                        fontWeight: 600,
                        color: pnlColor,
                        flexShrink: 0,
                      }}
                    >
                      {pnlSign}{fmtUSDC(pnl)} ({pnlSign}{(pnlPct).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Risk Limits Card ─────────────────────────────────────────────────────────

function RiskLimitsCard() {
  // Mocked risk data — will be replaced by /api/portfolio/risk
  const drawdown = 2.1;
  const drawdownLimit = 10;
  const drawdownPct = (drawdown / drawdownLimit) * 100;
  const drawdownColor =
    drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";

  const statusLabel =
    drawdownPct < 50 ? "NORMAL" : drawdownPct < 80 ? "WARNING" : "HALT";
  const statusColor =
    drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";

  interface RiskRow {
    label: string;
    value: string;
    sub?: string;
  }

  const rows: RiskRow[] = [
    { label: "Max Position Size", value: "5%", sub: "of portfolio" },
    { label: "Fractional Kelly", value: "0.25×", sub: "risk multiplier" },
    { label: "Lucifer Veto", value: "> 0.85", sub: "threshold" },
  ];

  return (
    <div style={panelStyle}>
      {/* Header with status badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionHeader title="Risk Limits" />
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            color: statusColor,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Drawdown progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            DRAWDOWN
          </span>
          <span
            style={{
              fontFamily: '"SF Mono", monospace',
              fontSize: META_SIZE,
              color: drawdownColor,
            }}
          >
            {drawdown.toFixed(1)}% / {drawdownLimit}%
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
              width: `${drawdownPct}%`,
              borderRadius: 3,
              background: drawdownColor,
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>

      {/* Risk rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div>
              <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
                {row.label}
              </div>
              {row.sub && (
                <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                  {row.sub}
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: '"SF Mono", monospace',
                fontSize: BODY_SIZE,
                fontWeight: 600,
                color: "rgba(255,255,255,0.80)",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── System Status Panel ──────────────────────────────────────────────────────

interface AgentDef {
  name: string;
  role: string;
  color: string;
  emoji: string;
  mockLatency: number;
  mockConfidence: number;
  mockLastAction: string;
}

const AGENTS: AgentDef[] = [
  { name: "Aura", role: "Sentiment", color: "#0a84ff", emoji: "🧠", mockLatency: 184, mockConfidence: 0.87, mockLastAction: "Scored DOGE/BTC market +0.34" },
  { name: "Flux", role: "Liquidity", color: "#0a84ff", emoji: "💧", mockLatency: 312, mockConfidence: 0.81, mockLastAction: "Graded ETH election market A" },
  { name: "Oracle", role: "Forecasting", color: "#0a84ff", emoji: "🔮", mockLatency: 447, mockConfidence: 0.93, mockLastAction: "Estimated 68% YES on Trump tariffs" },
  { name: "Edge", role: "Calibration", color: "#ff9f0a", emoji: "⚡", mockLatency: 128, mockConfidence: 0.76, mockLastAction: "Net EV +4.2% — BET_YES flagged" },
  { name: "Sigma", role: "Synthesis", color: "#0a84ff", emoji: "🎯", mockLatency: 391, mockConfidence: 0.88, mockLastAction: "BET_YES $94 · 88% confidence" },
  { name: "Clause", role: "Resolution", color: "#30d158", emoji: "📜", mockLatency: 209, mockConfidence: 0.72, mockLastAction: "Resolution risk LOW, 0 issues" },
  { name: "Lucifer", role: "Devil's Advocate", color: "#bf5af2", emoji: "👿", mockLatency: 256, mockConfidence: 0.79, mockLastAction: "1 bias flag, DA score 0.31" },
];

function SystemStatusPanel() {
  const [latency, setLatency] = useState<number | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    const start = Date.now();
    api.getBalance().then((result) => {
      if (result !== null) {
        setLatency(Date.now() - start);
        setApiOk(true);
      } else {
        setLatency(null);
        setApiOk(false);
      }
    });
  }, []);

  // Pre-compute stable mock run times — initialized to 0 on SSR, randomized after hydration
  const [agentMockTimes, setAgentMockTimes] = useState<number[]>(() =>
    AGENTS.map(() => 0)
  );

  useEffect(() => {
    setAgentMockTimes(AGENTS.map(() => Math.floor(Math.random() * 300_000)));
  }, []);

  return (
    <div style={panelStyle}>
      <SectionHeader title="System Status" subtitle="Agent health · Layer 1–5" />

      {/* Backend health bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          marginBottom: 14,
          background: apiOk === true
            ? "rgba(48,209,88,0.06)"
            : apiOk === false
            ? "rgba(255,69,58,0.06)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${
            apiOk === true
              ? "rgba(48,209,88,0.15)"
              : apiOk === false
              ? "rgba(255,69,58,0.15)"
              : "rgba(255,255,255,0.06)"
          }`,
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>
          Backend API
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: META_SIZE,
            fontWeight: 600,
            color:
              apiOk === true ? "#30d158" : apiOk === false ? "#ff453a" : "#ff9f0a",
          }}
        >
          {latency !== null ? `${latency}ms` : apiOk === false ? "OFFLINE" : "…"}
        </span>
      </div>

      {/* Agent rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {AGENTS.map((agent, idx) => {
          const mockMsAgo = agentMockTimes[idx];
          const lastRunMin = Math.floor(mockMsAgo / 60_000);
          const lastRunLabel = lastRunMin < 1 ? "just now" : `${lastRunMin}m ago`;
          const confPct = Math.round(agent.mockConfidence * 100);
          const confColor =
            agent.mockConfidence >= 0.85
              ? "#30d158"
              : agent.mockConfidence >= 0.75
              ? "#ff9f0a"
              : "#ff453a";

          return (
            <div
              key={agent.name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Top row: dot + name + role + latency */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#30d158",
                    boxShadow: "0 0 5px rgba(48,209,88,0.5)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: BODY_SIZE,
                    fontWeight: 600,
                    color: agent.color,
                    fontFamily: "monospace",
                    flexShrink: 0,
                    width: 58,
                  }}
                >
                  {agent.emoji} {agent.name}
                </span>
                <span
                  style={{
                    fontSize: META_SIZE,
                    color: "rgba(255,255,255,0.30)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {agent.role}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: LABEL_SIZE,
                    color: "rgba(255,255,255,0.25)",
                    flexShrink: 0,
                  }}
                >
                  {lastRunLabel}
                </span>
              </div>

              {/* Bottom row: latency + confidence + last action */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 15,
                }}
              >
                {/* Latency */}
                <span
                  style={{
                    fontSize: LABEL_SIZE,
                    fontFamily: "monospace",
                    color: "rgba(255,255,255,0.35)",
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  }}
                >
                  {agent.mockLatency}ms
                </span>

                {/* Confidence */}
                <span
                  style={{
                    fontSize: LABEL_SIZE,
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: confColor,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${confColor} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${confColor} 20%, transparent)`,
                    flexShrink: 0,
                  }}
                >
                  {confPct}%
                </span>

                {/* Last action */}
                <span
                  style={{
                    fontSize: LABEL_SIZE,
                    color: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {agent.mockLastAction}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline status */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.45)" }}>
          Pipeline
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: META_SIZE,
            fontWeight: 600,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.08em",
          }}
        >
          IDLE
        </span>
      </div>
    </div>
  );
}

// ─── Market Scanner Wrapper ───────────────────────────────────────────────────

function MarketScannerPanel() {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <SectionHeader title="Market Scanner" subtitle="Live CLOB markets · Layer 0" />
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <MarketScanner showFilterPills />
      </div>
    </div>
  );
}

// ─── Recent Signals Wrapper ───────────────────────────────────────────────────

function RecentSignalsPanel() {
  return (
    <div style={panelStyle}>
      <SectionHeader title="Recent Signals" subtitle="Last pipeline decisions" />
      <RecentSignals />
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[300px_1fr_320px] gap-4 items-start min-h-[calc(100vh-52px-40px)]"
    >
      {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PortfolioCard />
        <ActivePositionsCard />
        <RiskLimitsCard />
      </div>

      {/* ── CENTER COLUMN ────────────────────────────────────────────── */}
      <div>
        <MarketScannerPanel />
      </div>

      {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SystemStatusPanel />
        <RecentSignalsPanel />
      </div>
    </div>
  );
}
