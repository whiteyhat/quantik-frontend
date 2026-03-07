"use client";

import { useEffect, useState } from "react";
import { api, fmtUSDC, type WalletBalance } from "@/lib/api";
import { HelpTooltip } from "./ui/HelpTooltip";
import { Skeleton } from "./ui/skeleton";

function WinRateRing({ rate, trades }: { rate: number; trades: number }) {
  const safeRate = isNaN(rate) ? 0 : Math.max(0, Math.min(1, rate));
  const pct = Math.round(safeRate * 100);
  const r = 36;
  const circumference = 2 * Math.PI * r;
  // Indicator sliver if 0 rate but has trades
  const displayRate = safeRate === 0 && trades > 0 ? 0.01 : safeRate;
  const offset = circumference - (displayRate * circumference);

  return (
    <div style={{ position: "relative", width: 88, height: 88 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5"
        />
        {/* Progress ring */}
        <circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={safeRate > 0 ? "var(--ios-green)" : "rgba(255,255,255,0.15)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
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
          className="font-mono-data"
          style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)" }}
        >
          {pct}%
        </span>
        <span className="text-caption" style={{ color: "var(--text-tertiary)" }}>
          {trades} trades
        </span>
      </div>
    </div>
  );
}

export function PortfolioOverview() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);

  useEffect(() => {
    api.getBalance().then(setWallet).catch(() => {});
  }, []);

  const pnlToday = wallet?.pnlToday ?? wallet?.pnl ?? 0;
  const pnlTodayPct = wallet?.pnlTodayPct ?? wallet?.pnlPct ?? 0;
  const pnlColor = pnlToday >= 0 ? "var(--ios-green)" : "var(--ios-red)";
  const pnlSign = pnlToday >= 0 ? "+" : "";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {/* Total Portfolio Value */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="text-caption" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Portfolio
          </span>
          <HelpTooltip text="Total estimated value of your holdings, including on-chain USDC, CLOB deposits, and open position P&L." />
        </div>
        <div
          className="font-mono-data"
          style={{
            fontSize: "var(--text-title-lg)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginTop: 8,
          }}
        >
          {wallet ? fmtUSDC(wallet.totalValue ?? wallet.usdc) : <Skeleton width={140} height={28} borderRadius={6} style={{ marginTop: 2 }} />}
        </div>
        {wallet ? (
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-subhead)",
              color: pnlColor,
              marginTop: 4,
              display: "inline-block",
            }}
          >
            {pnlSign}{pnlTodayPct.toFixed(1)}% today
          </span>
        ) : (
          <Skeleton width={100} height={14} borderRadius={4} style={{ marginTop: 6 }} />
        )}
      </div>

      {/* P&L Today */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="text-caption" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            P&L Today
          </span>
          <HelpTooltip text="Your profit or loss for the current calendar day, combining realized gains/losses and unrealized price movements." />
        </div>
        <div
          className="font-mono-data"
          style={{
            fontSize: "var(--text-title-lg)",
            fontWeight: 700,
            color: pnlColor,
            marginTop: 8,
          }}
        >
          {wallet ? `${pnlSign}${fmtUSDC(pnlToday)}` : <Skeleton width={120} height={28} borderRadius={6} style={{ marginTop: 2 }} />}
        </div>
        {wallet ? (
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "2px 10px",
              borderRadius: 100,
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              background: pnlToday >= 0 ? "var(--ios-green-glow)" : "var(--ios-red-glow)",
              color: pnlColor,
            }}
          >
            {pnlSign}{pnlTodayPct.toFixed(1)}%
          </span>
        ) : (
          <Skeleton width={60} height={20} borderRadius={100} style={{ marginTop: 8 }} />
        )}
      </div>

      {/* Win Rate */}
      <div className="glass-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="text-caption" style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Win Rate
            </span>
            <HelpTooltip text="Percentage of settled trades that resulted in a profit. Calculated as (winning trades / total settled trades)." />
          </div>
          <div style={{ marginTop: 4 }}>
            {wallet ? (
              <span className="text-headline" style={{ color: "var(--text-primary)" }}>
                {Math.round((wallet.winRate ?? 0) * 100)}%
              </span>
            ) : (
              <Skeleton width={50} height={20} borderRadius={4} />
            )}
          </div>
        </div>
        {wallet ? (
          <WinRateRing rate={wallet.winRate ?? 0} trades={wallet.totalTrades ?? 0} />
        ) : (
          <Skeleton width={88} height={88} borderRadius="50%" />
        )}
      </div>
    </div>
  );
}
