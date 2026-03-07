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
  type RiskConfig,
} from "@/lib/api";
import { MarketScanner } from "@/components/MarketScanner";
import { RecentSignals } from "@/components/RecentSignals";
import { PerformanceSummaryWidget } from "@/components/PerformancePanel";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Skeleton } from "@/components/ui/skeleton";

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
          {wallet ? fmtUSDC(wallet.totalValue ?? wallet.usdc) : <Skeleton width={140} height={22} borderRadius={6} style={{ marginTop: 2 }} />}
        </div>
        {wallet ? (
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
        ) : (
          <Skeleton width={100} height={18} borderRadius={100} style={{ marginTop: 6 }} />
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
          {wallet ? (
            <div style={{ marginTop: 2, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
              {wallet?.totalTrades ?? 0} total trades
            </div>
          ) : (
            <Skeleton width={80} height={13} borderRadius={4} style={{ marginTop: 4 }} />
          )}
        </div>
        {wallet ? (
          <WinRateRing rate={wallet?.winRate ?? 0} trades={wallet?.totalTrades ?? 0} />
        ) : (
          <Skeleton width={68} height={68} borderRadius="50%" />
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            KELLY UTILIZATION
          </span>
          {wallet ? (
            <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "rgba(255,255,255,0.65)" }}>
              {kellyPct}% / 100%
            </span>
          ) : (
            <Skeleton width={70} height={12} borderRadius={4} />
          )}
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
        {wallet ? (
          <span style={{ fontSize: META_SIZE, fontWeight: 700, fontFamily: "monospace", color: circuitArmed ? "#30d158" : "#ff453a", letterSpacing: "0.08em" }}>
            {circuitArmed ? "ARMED" : "TRIGGERED"}
          </span>
        ) : (
          <Skeleton width={60} height={16} borderRadius={6} />
        )}
      </div>
    </div>
  );
}

// ─── Active Positions Card ────────────────────────────────────────────────────

function ActivePositionsCard() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    function fetchPositions() {
      api.getPositions()
        .then((data) => { if (mounted) { setPositions(data); setError(false); } })
        .catch(() => { if (mounted) setError(true); })
        .finally(() => { if (mounted) setLoading(false); });
    }
    fetchPositions();
    const iv = setInterval(fetchPositions, 15_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <div style={panelStyle}>
      <SectionHeader
        title="Active Positions"
        tooltip="Currently open bets on the Polymarket orderbook. Unrealized P&L is calculated in real-time by comparing your entry price to the current scanner mid-price."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width="70%" height={13} borderRadius={4} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Skeleton width={36} height={18} borderRadius={5} />
                  <Skeleton width="50%" height={12} borderRadius={4} />
                  <Skeleton width={80} height={12} borderRadius={4} style={{ marginLeft: "auto" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: "16px 12px", textAlign: "center", fontSize: BODY_SIZE, color: "#ff453a", background: "rgba(255,69,58,0.06)", borderRadius: 8, border: "1px solid rgba(255,69,58,0.15)" }}>
            Failed to load positions
          </div>
        ) : positions.length === 0 ? (
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
            const positionKey = p.id || `${p.slug}-${p.direction}`;

            const card = (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${accentColor}`, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                    {p.market}
                  </div>
                  <span style={{ fontFamily: '"SF Mono", monospace', fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
                    {fmtUSDC(p.size)}
                  </span>
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
            );

            return p.slug ? (
              <Link key={positionKey} href={`/market/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </Link>
            ) : (
              <div key={positionKey}>{card}</div>
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
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    function fetchRisk() {
      api.getRiskStatus()
        .then((data) => { if (mounted) setRisk(data); })
        .catch(() => {});
    }
    fetchRisk();
    api.getRiskConfig().then((data) => { if (mounted) setRiskConfig(data); }).catch(() => {});
    const iv = setInterval(fetchRisk, 30_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const drawdown = risk?.dailyPnlPct ?? 0;
  const drawdownLimit = (riskConfig?.drawdownLimit ?? 0.15) * 100;
  const drawdownPct = Math.min((Math.abs(drawdown) / drawdownLimit) * 100, 100);
  const drawdownColor = drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";
  const statusLabel = risk?.circuitBreaker ?? "ARMED";
  const statusColor = statusLabel === "ARMED" ? "#30d158" : statusLabel === "WARNING" ? "#ff9f0a" : "#ff453a";

  const maxPos = riskConfig ? `${Math.round(riskConfig.maxPositionSize * 100)}%` : null;
  const kellyMult = riskConfig ? `${riskConfig.kellyMultiplier}×` : null;
  const varThreshold = riskConfig ? `> ${riskConfig.agentVarThreshold}` : null;

  const rows = [
    { label: "Max Position Size", value: maxPos, sub: "of portfolio" },
    { label: "Fractional Kelly", value: kellyMult, sub: "risk multiplier" },
    { label: "Agent VaR Threshold", value: varThreshold, sub: "threshold" },
  ];

  return (
    <div style={{ ...panelStyle, flex: 1 }}>
      <SectionHeader
        title="Risk Limits"
        tooltip="Static safety parameters enforced by the risk engine. These thresholds prevent any single agent or logic branch from over-exposing the bankroll."
      />
      
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)" }}>Status</span>
        {risk ? (
          <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor, fontFamily: "monospace", letterSpacing: "0.08em", border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)` }}>
            {statusLabel}
          </span>
        ) : (
          <Skeleton width={60} height={20} borderRadius={6} />
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>DRAWDOWN</span>
          {risk ? (
            <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: drawdownColor }}>
              {drawdown.toFixed(1)}% / {drawdownLimit}%
            </span>
          ) : (
            <Skeleton width={80} height={12} borderRadius={4} />
          )}
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
            {row.value !== null ? (
              <span style={{ fontFamily: '"SF Mono", monospace', fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>{row.value}</span>
            ) : (
              <Skeleton width={50} height={13} borderRadius={4} />
            )}
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
    function ping() {
      const start = Date.now();
      api.getBalance().then((result) => {
        if (result !== null) {
          setLatency(Date.now() - start);
          setApiOk(true);
        } else {
          setLatency(null);
          setApiOk(false);
        }
      }).catch(() => {
        setLatency(null);
        setApiOk(false);
      });
    }
    ping();
    const iv = setInterval(ping, 30_000);
    return () => clearInterval(iv);
  }, []);

  const agentStatus = apiOk === true ? "READY" : apiOk === false ? "DOWN" : "…";
  const agentStatusColor = apiOk === true ? "#30d158" : apiOk === false ? "#ff453a" : "#ff9f0a";

  return (
    <div style={panelStyle}>
      <SectionHeader
        title="System Status"
        subtitle="Agent config · Layer 1–5"
        tooltip="Shows API connectivity and the registered agent logic blocks. Individual agent health monitoring requires a backend /api/agents/health endpoint."
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
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: agentStatusColor, boxShadow: apiOk ? "0 0 5px rgba(48,209,88,0.5)" : "none", flexShrink: 0 }} />
            <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: agent.color, fontFamily: "monospace", flexShrink: 0, width: 80 }}>{agent.emoji} {agent.name}</span>
            <span style={{ fontSize: META_SIZE, color: "rgba(255,255,255,0.30)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.role}</span>
            <span style={{ fontFamily: "monospace", fontSize: LABEL_SIZE, color: agentStatusColor, flexShrink: 0 }}>{agentStatus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orchestrator Panel ──────────────────────────────────────────────────────

function orchestratorTimeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function OrchestratorPanel() {
  const [candidates, setCandidates] = useState<OrchestratorCandidate[]>([]);
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(false);
  const [scanError, setScanError] = useState(false);

  useEffect(() => {
    function fetchData() {
      Promise.all([
        api.getOrchestratorStatus(),
        api.getOrchestratorCandidates(),
      ]).then(([s, c]) => {
        setStatus(s);
        setCandidates(c.candidates);
        setError(false);
      }).catch(() => setError(true));
    }
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanError(false);
    try {
      await api.triggerOrchestratorScan();
      const [s, c] = await Promise.all([api.getOrchestratorStatus(), api.getOrchestratorCandidates()]);
      if (s) setStatus(s);
      setCandidates(c.candidates);
    } catch {
      setScanError(true);
    }
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

      {/* Scan metadata */}
      {status && (
        <div style={{ padding: "0 20px 10px", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)" }}>
            Last scan: <span style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>{orchestratorTimeAgo(status.lastScanAt)}</span>
          </span>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)" }}>
            Scanned: <span style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>{status.marketsScanned}</span>
          </span>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)" }}>
            Found: <span style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>{status.candidatesFound}</span>
          </span>
        </div>
      )}

      {scanError && (
        <div style={{ padding: "0 20px 8px" }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,69,58,0.7)" }}>Scan failed — try again</span>
        </div>
      )}

      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {error ? (
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,69,58,0.6)", padding: "8px 0" }}>Failed to load orchestrator data</span>
        ) : candidates.length === 0 ? (
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>No candidates — trigger a scan</span>
        ) : (
          candidates.slice(0, 5).map((c) => {
            const badge = badgeColor(c.opportunityScore);
            return (
              <Link key={c.slug} href={`/market/${c.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}>
                <span style={{ flexShrink: 0, padding: "2px 7px", borderRadius: 5, background: badge.bg, color: badge.text, fontSize: LABEL_SIZE, fontWeight: 700, fontFamily: "monospace", minWidth: 32, textAlign: "center" }}>{c.opportunityScore.toFixed(0)}</span>
                <span style={{ flex: 1, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.question}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Risk Status Panel ───────────────────────────────────────────────────────

function RiskStatusPanel() {
  const [risk, setRisk] = useState<RiskStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    function fetch() {
      api.getRiskStatus()
        .then((data) => { setRisk(data); setError(false); })
        .catch(() => setError(true));
    }
    fetch();
    const iv = setInterval(fetch, 30_000);
    return () => clearInterval(iv);
  }, []);

  if (error) {
    return (
      <div style={panelStyle}>
        <SectionHeader title="Risk Status" subtitle="Layer 3 — Live risk monitor" tooltip="Real-time exposure tracking. Monitors current drawdown and total capital deployment to prevent recursive losses." />
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,69,58,0.6)" }}>Failed to load risk data</span>
      </div>
    );
  }

  const cb = risk?.circuitBreaker ?? "ARMED";
  const cbColor = cb === "ARMED" ? "#30d158" : cb === "WARNING" ? "#ff9f0a" : "#ff453a";
  const exposurePct = risk?.exposurePct ?? 0;
  const exposureColor = exposurePct < 50 ? "#30d158" : exposurePct < 80 ? "#ff9f0a" : "#ff453a";
  const dailyPnl = risk?.dailyPnl ?? 0;
  const pnlColor = dailyPnl >= 0 ? "#30d158" : "#ff453a";

  return (
    <div style={panelStyle}>
      <SectionHeader
        title="Risk Status"
        subtitle="Layer 3 — Live risk monitor"
        tooltip="Real-time exposure tracking. Monitors current drawdown and total capital deployment to prevent recursive losses."
      />

      {!risk ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Skeleton width={90} height={13} borderRadius={4} />
              <Skeleton width={50} height={13} borderRadius={4} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 8, background: `color-mix(in srgb, ${cbColor} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${cbColor} 20%, transparent)` }}>
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Circuit Breaker</span>
            <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `color-mix(in srgb, ${cbColor} 12%, transparent)`, color: cbColor, fontFamily: "monospace", letterSpacing: "0.08em", border: `1px solid color-mix(in srgb, ${cbColor} 25%, transparent)` }}>
              {cb}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Exposure</span>
            <span style={{ fontFamily: "monospace", fontSize: META_SIZE, fontWeight: 600, color: exposureColor }}>{exposurePct.toFixed(1)}%</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Daily P&L</span>
            <span style={{ fontFamily: "monospace", fontSize: META_SIZE, fontWeight: 600, color: pnlColor }}>
              {dailyPnl >= 0 ? "+" : ""}{fmtUSDC(dailyPnl)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Available Capital</span>
            <span style={{ fontFamily: "monospace", fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>{fmtUSDC(risk.availableCapital)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr_320px] gap-4 items-stretch">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PortfolioCard />
          <ActivePositionsCard />
          <RiskLimitsCard />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OrchestratorPanel />
          <RiskStatusPanel />
          <PerformanceSummaryWidget />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SystemStatusPanel />
          <div style={{ ...panelStyle, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader title="Recent Signals" tooltip="History of recent trading decisions. Shows the final consensus and executed trade logic for recently analyzed markets." />
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <RecentSignals />
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 0 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <SectionHeader title="Live Market Scanner" tooltip="Real-time monitoring of all active prediction markets. Blue icons indicate high-conviction candidates identified by the Orchestrator." />
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <MarketScanner maxCols={4} visibleLimit={8} />
        </div>
      </div>
    </div>
  );
}
