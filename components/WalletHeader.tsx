"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtUSDC } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useEffect } from "react";

export function WalletHeader() {
  const setWallet = useQuantikStore((s) => s.setWallet);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: api.getBalance,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (data) setWallet(data);
  }, [data, setWallet]);

  if (isLoading) {
    return (
      <div className="q-card p-4 mb-4 animate-pulse">
        <div className="h-5 w-48 rounded" style={{ background: '#1e1e2e' }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="q-card p-4 mb-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ background: '#ff4444' }} />
        <span className="text-xs" style={{ color: '#606080' }}>
          Backend offline — wallet unavailable
        </span>
      </div>
    );
  }

  const pnlPositive = data.pnl >= 0;

  return (
    <div className="q-card p-4 mb-4 flex flex-wrap items-center gap-6">
      {/* Address */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs" style={{ color: '#606080' }}>Wallet</span>
        <span className="q-mono text-sm" style={{ color: '#e0e0e0' }}>
          {data.address}
        </span>
      </div>

      {/* USDC Balance */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs" style={{ color: '#606080' }}>USDC Balance</span>
        <span className="q-mono text-lg font-semibold" style={{ color: '#4488ff' }}>
          {fmtUSDC(data.usdc)}
        </span>
      </div>

      {/* P&L */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs" style={{ color: '#606080' }}>P&amp;L</span>
        <div className="flex items-center gap-2">
          <span
            className="q-mono text-sm font-semibold px-2 py-0.5 rounded"
            style={{
              color: pnlPositive ? '#00ff88' : '#ff4444',
              background: pnlPositive ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
            }}
          >
            {pnlPositive ? '+' : ''}{fmtUSDC(data.pnl)}
          </span>
          <span className="text-xs q-mono" style={{ color: pnlPositive ? '#00ff88' : '#ff4444' }}>
            ({pnlPositive ? '+' : ''}{(data.pnlPct * 100).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Win Rate */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs" style={{ color: '#606080' }}>Win Rate</span>
        <div className="flex items-center gap-2">
          <span className="q-mono text-sm font-semibold" style={{ color: '#e0e0e0' }}>
            {(data.winRate * 100).toFixed(1)}%
          </span>
          <span className="text-xs" style={{ color: '#606080' }}>
            ({data.totalTrades} trades)
          </span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="ml-auto flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full agent-running" style={{ background: '#00ff88' }} />
        <span className="text-xs" style={{ color: '#606080' }}>Live</span>
      </div>
    </div>
  );
}
