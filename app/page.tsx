"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  fmtUSDC,
  fmtPrice,
  type WalletBalance,
  type Position,
  type OrchestratorCandidate,
  type OrchestratorStatus,
  type RiskStatus,
} from "@/lib/api";
import { MarketScanner } from "@/components/MarketScanner";
import { RecentSignals } from "@/components/RecentSignals";
import { PerformanceSummaryWidget } from "@/components/PerformancePanel";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const METRIC_SIZE = 22;

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, tooltip }: { title: string; subtitle?: string; tooltip?: string }) {
  return (
    <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div>
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
            {title}
          </h2>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
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
    </div>
  );
}

// ─── Win Rate Ring ────────────────────────────────────────────────────────────

function WinRateRing({ rate, trades }: { rate: number; trades: number }) {
  const safeRate = isNaN(rate) ? 0 : Math.max(0, Math.min(1, rate));
  const pct = Math.round(safeRate * 100);
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const displayRate = safeRate === 0 && trades > 0 ? 0.01 : safeRate;
  const offset = circumference - (displayRate * circumference);

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
          stroke={safeRate > 0.5 ? "#30d158" : safeRate > 0.3 ? "#ff9f0a" : "#ff453a"}
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

  const pnl = wallet?.pnlToday ?? wallet?.pnl ?? 0;
  const pnlPct = wallet?.pnlTodayPct ?? wallet?.pnlPct ?? 0;
  const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = pnl >= 0 ? "+" : "";
  const kellyPct = Math.round((wallet?.kellyUtilization ?? 0) * 100);
  const circuitArmed = (wallet?.circuitBreakerStatus ?? "ARMED") !== "TRIGGERED";

  return (
    <div style={panelStyle}>
      <SectionHeader 
        title="Portfolio" 
        subtitle="Layer 3 — Risk Control" 
        tooltip="Unified view of your wallet balance and overall trading performance. Capital is tracked across native Polygon wallets and CLOB deposit accounts."
      />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            TOTAL VALUE
          </span>
          <HelpTooltip text="Cumulative balance including on-chain USDC.e, CLOB collateral, and marked-to-market value of all open positions." />
        </div>
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
          {wallet ? fmtUSDC(wallet.totalValue ?? wallet.usdc) : "···"}
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

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            KELLY UTILIZATION
          </span>
          <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "rgba(255,255,255,0.65)" }}>
            {kellyPct}% / 100%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${kellyPct}%`, borderRadius: 3, background: "#0a84ff", transition: "width 600ms ease" }} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          background: circuitArmed ? "rgba(48,209,88,0.07)" : "rgba(255,69,58,0.10)",
          border: `1px solid ${circuitArmed ? "rgba(48,209,88,0.20)" : "rgba(255,69,58,0.30)"}`,
        }}
      >
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Circuit Breaker</span>
        <span style={{ fontSize: META_SIZE, fontWeight: 700, fontFamily: "monospace", color: circuitArmed ? "#30d158" : "#ff453a", letterSpacing: "0.08em" }}>
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
      <SectionHeader 
        title="Active Positions" 
        tooltip="Currently open bets on the Polymarket orderbook. Unrealized P&L is calculated in real-time by comparing your entry price to the current scanner mid-price."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {positions.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
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
              <Link key={p.id} href={`/market/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${accentColor}`, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.market}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: isYes ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)", color: accentColor, border: `1px solid ${isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`, fontFamily: "monospace", flexShrink: 0 }}>
                      {p.direction}
                    </span>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "rgba(255,255,255,0.40)", flex: 1 }}>
                      {fmtPrice(p.entryPrice)} → {fmtPrice(p.currentPrice)}
                    </span>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, fontWeight: 600, color: pnlColor, flexShrink: 0 }}>
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
  const [risk, setRisk] = useState<RiskStatus | null>(null);

  useEffect(() => {
    api.getRiskStatus().then(setRisk).catch(() => {});
    const iv = setInterval(() => api.getRiskStatus().then(setRisk).catch(() => {}), 30_000);
    return () => clearInterval(iv);
  }, []);

  const drawdown = risk?.dailyPnlPct ?? 0;
  const drawdownLimit = 15;
  const drawdownPct = Math.min((Math.abs(drawdown) / drawdownLimit) * 100, 100);
  const drawdownColor = drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";
  const statusLabel = risk?.circuitBreaker ?? "ARMED";
  const statusColor = statusLabel === "ARMED" ? "#30d158" : statusLabel === "WARNING" ? "#ff9f0a" : "#ff453a";

  const rows = [
    { label: "Max Position Size", value: "5%", sub: "of portfolio" },
    { label: "Fractional Kelly", value: "0.25×", sub: "risk multiplier" },
    { label: "Lucifer Veto", value: "> 0.85", sub: "threshold" },
  ];

  return (
    <div style={panelStyle}>
      <SectionHeader 
        title="Risk Limits" 
        tooltip="Static safety parameters enforced by the risk engine. These thresholds prevent any single agent or logic branch from over-exposing the bankroll."
      />
      
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Status</span>
        <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor, fontFamily: "monospace", letterSpacing: "0.08em", border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)` }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>DRAWDOWN</span>
          <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: drawdownColor }}>
            {drawdown.toFixed(1)}% / {drawdownLimit}%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${drawdownPct}%`, borderRadius: 3, background: drawdownColor, transition: "width 600ms ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>{row.label}</div>
              {row.sub && <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{row.sub}</div>}
            </div>
            <span style={{ fontFamily: '"SF Mono", monospace', fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>{row.value}</span>
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
}

const AGENTS: AgentDef[] = [
  { name: "Aura", role: "Sentiment", color: "#0a84ff", emoji: "🧠" },
  { name: "Flux", role: "Liquidity", color: "#0a84ff", emoji: "💧" },
  { name: "Oracle", role: "Forecasting", color: "#0a84ff", emoji: "🔮" },
  { name: "Edge", role: "Calibration", color: "#ff9f0a", emoji: "⚡" },
  { name: "Sigma", role: "Synthesis", color: "#0a84ff", emoji: "🎯" },
  { name: "Clause", role: "Resolution", color: "#30d158", emoji: "📜" },
  { name: "Lucifer", role: "Devil's Advocate", color: "#bf5af2", emoji: "👿" },
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
        setApiOk(false);
      }
    });
  }, []);

  return (
    <div style={panelStyle}>
      <SectionHeader 
        title="System Status" 
        subtitle="Agent health · Layer 1–5" 
        tooltip="Operational heartbeat of the Quantik network. Monitors API connectivity and the active status of each specialist agent logic block."
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 14, background: apiOk === true ? "rgba(48,209,88,0.06)" : apiOk === false ? "rgba(255,69,58,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${apiOk === true ? "rgba(48,209,88,0.15)" : apiOk === false ? "rgba(255,69,58,0.15)" : "rgba(255,255,255,0.06)"}` }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Backend API</span>
        <span style={{ fontFamily: "monospace", fontSize: META_SIZE, fontWeight: 600, color: apiOk === true ? "#30d158" : apiOk === false ? "#ff453a" : "#ff9f0a" }}>
          {latency !== null ? `${latency}ms` : apiOk === false ? "OFFLINE" : "…"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {AGENTS.map((agent) => (
          <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: apiOk ? "#30d158" : "#ff9f0a", boxShadow: apiOk ? "0 0 5px rgba(48,209,88,0.5)" : "none", flexShrink: 0 }} />
            <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: agent.color, fontFamily: "monospace", flexShrink: 0, width: 58 }}>{agent.emoji} {agent.name}</span>
            <span style={{ fontSize: META_SIZE, color: "rgba(255,255,255,0.30)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.role}</span>
            <span style={{ fontFamily: "monospace", fontSize: LABEL_SIZE, color: "#30d158", flexShrink: 0 }}>LIVE</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orchestrator Panel ──────────────────────────────────────────────────────

function OrchestratorPanel() {
  const [candidates, setCandidates] = useState<OrchestratorCandidate[]>([]);
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    function fetchData() {
      api.getOrchestratorStatus().then(setStatus).catch(() => {});
      api.getOrchestratorCandidates().then((r) => setCandidates(r.candidates)).catch(() => {});
    }
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await api.triggerOrchestratorScan();
      const [s, c] = await Promise.all([api.getOrchestratorStatus(), api.getOrchestratorCandidates()]);
      if (s) setStatus(s);
      setCandidates(c.candidates);
    } catch {}
    setScanning(false);
  };

  const badgeColor = (score: number) => {
    if (score > 75) return { bg: "rgba(48,209,88,0.15)", text: "#30d158" };
    if (score >= 50) return { bg: "rgba(255,159,10,0.15)", text: "#ff9f0a" };
    return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.50)" };
  };

  return (
    <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <SectionHeader 
          title="Orchestrator" 
          subtitle="Tier 0 scanner · Layer 1" 
          tooltip="The primary market filter. Scans Polymarket and filters for high-conviction targets based on volume spikes and liquidity depth."
        />
        <button onClick={handleScan} disabled={scanning} style={{ padding: "4px 10px", borderRadius: 6, background: scanning ? "rgba(255,255,255,0.04)" : "rgba(0,122,255,0.15)", color: scanning ? "rgba(255,255,255,0.30)" : "#007aff", border: `1px solid ${scanning ? "rgba(255,255,255,0.06)" : "rgba(0,122,255,0.25)"}`, fontSize: LABEL_SIZE, fontWeight: 600, cursor: scanning ? "not-allowed" : "pointer" }}>
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>

      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.slice(0, 5).map((c) => {
          const badge = badgeColor(c.opportunityScore);
          return (
            <Link key={c.slug} href={`/market/${c.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}>
              <span style={{ flexShrink: 0, padding: "2px 7px", borderRadius: 5, background: badge.bg, color: badge.text, fontSize: LABEL_SIZE, fontWeight: 700, fontFamily: "monospace", minWidth: 32, textAlign: "center" }}>{c.opportunityScore.toFixed(0)}</span>
              <span style={{ flex: 1, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.question}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Risk Status Panel ───────────────────────────────────────────────────────

function RiskStatusPanel() {
  const [risk, setRisk] = useState<RiskStatus | null>(null);

  useEffect(() => {
    api.getRiskStatus().then(setRisk).catch(() => {});
    const iv = setInterval(() => api.getRiskStatus().then(setRisk).catch(() => {}), 30_000);
    return () => clearInterval(iv);
  }, []);

  const cb = risk?.circuitBreaker ?? "ARMED";
  const cbColor = cb === "ARMED" ? "#30d158" : cb === "WARNING" ? "#ff9f0a" : "#ff453a";
  const exposurePct = risk?.exposurePct ?? 0;
  const exposureColor = exposurePct < 50 ? "#30d158" : exposurePct < 80 ? "#ff9f0a" : "#ff453a";

  return (
    <div style={panelStyle}>
      <SectionHeader 
        title="Risk Status" 
        subtitle="Layer 3 — Live risk monitor" 
        tooltip="Real-time exposure tracking. Monitors current drawdown and total capital deployment to prevent recursive losses."
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Exposure</span>
        <span style={{ fontFamily: "monospace", fontSize: META_SIZE, fontWeight: 600, color: exposureColor }}>{exposurePct.toFixed(1)}%</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Available Capital</span>
        <span style={{ fontFamily: "monospace", fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>{risk ? fmtUSDC(risk.availableCapital) : "···"}</span>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr_320px] gap-4 items-start">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PortfolioCard />
        <ActivePositionsCard />
        <RiskLimitsCard />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OrchestratorPanel />
        <RiskStatusPanel />
        <PerformanceSummaryWidget />
        <div style={{ ...panelStyle, padding: 0 }}>
           <div style={{ padding: "16px 20px 0" }}>
             <SectionHeader title="Live Market Scanner" tooltip="Real-time monitoring of all active prediction markets. Blue icons indicate high-conviction candidates identified by the Orchestrator." />
           </div>
           <MarketScanner maxCols={2} compact />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SystemStatusPanel />
        <div style={panelStyle}>
          <SectionHeader title="Recent Signals" tooltip="History of recent trading decisions. Shows the final consensus and executed trade logic for recently analyzed markets." />
          <RecentSignals />
        </div>
      </div>
    </div>
  );
}
