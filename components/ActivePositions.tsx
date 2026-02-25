"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, fmtUSDC } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useEffect } from "react";

export function ActivePositions() {
  const router = useRouter();
  const setPositions = useQuantikStore((s) => s.setPositions);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["positions"],
    queryFn: api.getPositions,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (data) setPositions(data);
  }, [data, setPositions]);

  return (
    <div className="q-card mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e2e' }}>
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
          Active Positions
        </span>
        {data && (
          <span className="text-xs q-mono" style={{ color: '#606080' }}>
            {data.length} open
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#0f0f1a' }}>
              <th className="text-left px-4 py-2 font-medium" style={{ color: '#606080' }}>Market</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: '#606080' }}>Dir</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>Size</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>Entry</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>Current</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: '#1e1e2e' }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 rounded animate-pulse" style={{ background: '#1e1e2e', width: '70%' }} />
                  </td>
                ))}
              </tr>
            ))}

            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: '#606080' }}>
                  Backend offline
                </td>
              </tr>
            )}

            {!isLoading && !isError && (!data || data.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: '#606080' }}>
                  No open positions
                </td>
              </tr>
            )}

            {data?.map((pos) => {
              const pnlPositive = pos.pnl >= 0;
              return (
                <tr
                  key={pos.id}
                  className="q-table-row border-t cursor-pointer"
                  style={{ borderColor: '#1e1e2e' }}
                  onClick={() => router.push(`/market/${pos.slug}`)}
                >
                  <td className="px-4 py-2.5 max-w-xs">
                    <span className="line-clamp-1" style={{ color: '#e0e0e0' }}>{pos.market}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="q-mono font-bold text-xs px-1.5 py-0.5 rounded"
                      style={{
                        color: pos.direction === "YES" ? '#00ff88' : '#ff4444',
                        background: pos.direction === "YES" ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                      }}
                    >
                      {pos.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right q-mono" style={{ color: '#e0e0e0' }}>
                    {fmtUSDC(pos.size)}
                  </td>
                  <td className="px-3 py-2.5 text-right q-mono" style={{ color: '#606080' }}>
                    {Math.round(pos.entryPrice * 100)}¢
                  </td>
                  <td className="px-3 py-2.5 text-right q-mono" style={{ color: '#4488ff' }}>
                    {Math.round(pos.currentPrice * 100)}¢
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="q-mono font-medium" style={{ color: pnlPositive ? '#00ff88' : '#ff4444' }}>
                      {pnlPositive ? '+' : ''}{fmtUSDC(pos.pnl)}
                    </span>
                    <span className="text-xs ml-1 q-mono" style={{ color: pnlPositive ? '#00ff88' : '#ff4444' }}>
                      ({pnlPositive ? '+' : ''}{(pos.pnlPct * 100).toFixed(1)}%)
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
