"use client";

import { useEffect, useState } from "react";
import { api, fmtUSDC, type WalletBalance } from "@/lib/api";
import { HelpTooltip } from "./ui/HelpTooltip";

function WinRateRing({ rate, trades }: { rate: number; trades: number }) {
  const safeRate = isNaN(rate) ? 0 : Math.max(0, Math.min(1, rate));
  const pct = Math.round(safeRate * 100);
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (safeRate * circumference);

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
          stroke="var(--ios-green)"
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

  const pnlColor = (wallet?.pnl ?? 0) >= 0 ? "var(--ios-green)" : "var(--ios-red)";
  const pnlSign = (wallet?.pnl ?? 0) >= 0 ? "+" : "";

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
          {wallet ? fmtUSDC(wallet.usdc) : "···"}
        </div>
        {wallet && (
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-subhead)",
              color: pnlColor,
              marginTop: 4,
              display: "inline-block",
            }}
          >
            {pnlSign}{(wallet.pnlPct ?? 0).toFixed(1)}% today
          </span>
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
          {wallet ? `${pnlSign}${fmtUSDC(wallet.pnl)}` : "···"}
        </div>
        {wallet && (
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "2px 10px",
              borderRadius: 100,
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              background: ((wallet.pnl ?? 0) >= 0) ? "var(--ios-green-glow)" : "var(--ios-red-glow)",
              color: pnlColor,
            }}
          >
            {pnlSign}{(wallet.pnlPct ?? 0).toFixed(1)}%
          </span>
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
            <span className="text-headline" style={{ color: "var(--text-primary)" }}>
              {wallet ? `${Math.round((wallet.winRate ?? 0) * 100)}%` : "···"}
            </span>
          </div>
        </div>
        {wallet && <WinRateRing rate={wallet.winRate ?? 0} trades={wallet.totalTrades ?? 0} />}
      </div>
    </div>
  );
}
