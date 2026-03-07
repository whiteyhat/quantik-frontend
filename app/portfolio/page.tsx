"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtUSDC, fmtPrice, type WalletBalance, type Position } from "@/lib/api";
import { PnlTicker } from "@/components/PnlTicker";
import { ExecutionLog } from "@/components/ExecutionLog";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

const fmt1 = (n: unknown) => ((n as number) ?? 0).toFixed(1);

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

interface RiskSummary {
  drawdown: number;
  drawdownLimit: number;
  kellyUtilization: number;
  status: "NORMAL" | "WARNING" | "HALT";
  circuitArmed: boolean;
}

function SectionHeader({ title, subtitle, tooltip }: { title: string; subtitle?: string; tooltip?: string }) {
  return (
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
  );
}

function MetricTile({
  label,
  value,
  valueColor = "rgba(255,255,255,0.92)",
  sub,
  tooltip
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  tooltip?: string;
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
      <div style={{ display: "flex", alignItems: "center" }}>
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
        {tooltip && <HelpTooltip text={tooltip} />}
      </div>
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
      <div style={{ width: 80, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.07)" }} />
      <div style={{ width: 120, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
        No open positions
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
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
            const pnl = (p.pnl ?? 0) as number;
            const pnlPct = (p.pnlPct ?? 0) as number;
            const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
            const pnlSign = pnl >= 0 ? "+" : "";

            return (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link href={`/market/${p.slug}`} style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.75)", textDecoration: "none", display: "block", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.market}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: isYes ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)", color: dirColor, border: `1px solid ${isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`, fontFamily: "monospace" }}>
                    {p.direction}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>{fmtUSDC(p.size ?? 0)}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.50)", fontFamily: "monospace" }}>{fmtPrice(p.entryPrice ?? 0)}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>{fmtPrice(p.currentPrice ?? 0)}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: pnlColor, fontFamily: "monospace" }}>{pnlSign}{fmtUSDC(pnl)}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: BODY_SIZE, fontWeight: 600, color: pnlColor, fontFamily: "monospace" }}>{pnlSign}{fmt1(pnlPct)}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RiskPanel({ risk, wallet }: { risk: RiskSummary | null; wallet: WalletBalance | null }) {
  if (!risk) return null;

  const drawdown = (risk.drawdown ?? 0) as number;
  const drawdownLimit = ((risk.drawdownLimit ?? 1) as number) || 1;
  const kellyUtilization = (risk.kellyUtilization ?? 0) as number;
  const circuitArmed = (wallet?.circuitBreakerStatus ?? "ARMED") !== "TRIGGERED";

  const drawdownPct = (drawdown / drawdownLimit) * 100;
  const drawdownColor = drawdownPct < 50 ? "#30d158" : drawdownPct < 80 ? "#ff9f0a" : "#ff453a";
  const statusColor = risk.status === "NORMAL" ? "#30d158" : risk.status === "WARNING" ? "#ff9f0a" : "#ff453a";

  return (
    <div style={panelStyle}>
      <SectionHeader 
        title="Risk Summary" 
        tooltip="Analysis of the current risk state. Drawdown monitors intraday losses against hard limits, and Kelly Utilization tracks bankroll efficiency."
      />
      
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Status</span>
        <span style={{ fontSize: LABEL_SIZE, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor, fontFamily: "monospace", letterSpacing: "0.08em", border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)` }}>
          {risk.status ?? "NORMAL"}
        </span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drawdown</span>
          <span style={{ fontFamily: "monospace", fontSize: META_SIZE, color: drawdownColor }}>{fmt1(drawdown)}% / {fmt1(drawdownLimit)}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(drawdownPct, 100)}%`, borderRadius: 3, background: drawdownColor, transition: "width 600ms ease" }} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Kelly Utilization</span>
          <span style={{ fontFamily: "monospace", fontSize: META_SIZE, color: "rgba(255,255,255,0.65)" }}>{fmt1(kellyUtilization)}% / 100%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(kellyUtilization, 100)}%`, borderRadius: 3, background: "#0a84ff", transition: "width 600ms ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: circuitArmed ? "rgba(48,209,88,0.07)" : "rgba(255,69,58,0.10)", border: `1px solid ${circuitArmed ? "rgba(48,209,88,0.20)" : "rgba(255,69,58,0.30)"}` }}>
        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>Circuit Breaker</span>
        <span style={{ fontSize: META_SIZE, fontWeight: 700, fontFamily: "monospace", color: circuitArmed ? "#30d158" : "#ff453a", letterSpacing: "0.08em" }}>
          {circuitArmed ? "ARMED" : "TRIGGERED"}
        </span>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getBalance().then(setWallet).catch(() => {}),
      api.getPositions().then((data) => {
        const safe = Array.isArray(data) ? data : (data as any)?.positions ?? [];
        setPositions(safe as Position[]);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));

    const iv = setInterval(() => {
      api.getBalance().then(setWallet).catch(() => {});
      api.getPositions().then((data) => {
        const safe = Array.isArray(data) ? data : (data as any)?.positions ?? [];
        setPositions(safe as Position[]);
      }).catch(() => {});
    }, 15_000);

    return () => clearInterval(iv);
  }, []);

  const totalPnl = wallet?.pnl ?? positions.reduce((acc, p) => acc + ((p.pnl ?? 0) as number), 0);
  const pnlColor = totalPnl >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = totalPnl >= 0 ? "+" : "";

  // Derive risk summary from wallet fields (already returned by /api/portfolio/summary)
  const risk: RiskSummary | null = wallet && (wallet.drawdown != null || wallet.kellyUtilization != null) ? {
    drawdown: wallet.drawdown ?? 0,
    drawdownLimit: wallet.drawdownLimit ?? 1,
    kellyUtilization: wallet.kellyUtilization ?? 0,
    status: wallet.circuitBreakerStatus === "TRIGGERED" ? "HALT" : wallet.circuitBreakerStatus === "WARNING" ? "WARNING" : "NORMAL",
    circuitArmed: wallet.circuitBreakerStatus !== "TRIGGERED",
  } : null;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8 w-full max-w-full overflow-hidden">
      <div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.92)", fontFamily: '"SF Mono", "JetBrains Mono", monospace', letterSpacing: "0.04em" }}>Portfolio</h1>
          <HelpTooltip text="Overview of all capital active in the Quantik network. Includes marked-to-market valuations and live risk parameters." />
        </div>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>Live positions, balances, and risk exposure</p>
      </div>

      <PnlTicker />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <SkeletonTile key={i} />)}
          </div>
          <div style={{ ...panelStyle, padding: 40, textAlign: "center", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>Loading portfolio…</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricTile label="Total Value" value={wallet ? fmtUSDC(wallet.totalValue ?? wallet.usdc ?? 0) : "···"} tooltip="Total portfolio value including on-chain USDC.e, CLOB collateral, and marked-to-market open positions." />
            <MetricTile label="Open Positions" value={String(positions.length)} tooltip="Count of currently active trades on Polymarket." />
            <MetricTile label="Total P&L" value={`${pnlSign}${fmtUSDC(totalPnl)}`} valueColor={pnlColor} tooltip="Sum of realized and unrealized profit or loss from all historical and current trades." />
            <MetricTile label="Win Rate" value={wallet ? `${Math.round(((wallet.winRate ?? 0) as number) * 100)}%` : "···"} sub={wallet ? `${wallet.totalTrades ?? 0} trades` : undefined} tooltip="Success rate of settled trades. Calculated as total wins divided by total settled trade outcomes." />
          </div>

          <div className={`grid grid-cols-1 ${risk ? "lg:grid-cols-[1fr_320px]" : ""} gap-4 items-start w-full`}>
            <div style={panelStyle} className="w-full max-w-full overflow-hidden">
              <SectionHeader title="Open Positions" subtitle={`${positions.length} active trade${positions.length !== 1 ? "s" : ""}`} tooltip="Active bets on prediction markets. MARK-PRICE is the current probability from the scanner." />
              <PositionsTable positions={positions} />
            </div>
            {risk && <RiskPanel risk={risk} wallet={wallet} />}
          </div>

          <div style={{ ...panelStyle, background: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="Execution Log" tooltip="Unified audit trail of trade executions. Monitors order placement, fill status, and simulated paper fills." />
            <ExecutionLog />
          </div>
        </>
      )}
    </div>
  );
}
