"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, fmtUSDC } from "@/lib/api";

export function RecentTrades() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: api.getOrders,
    refetchInterval: 15000,
  });

  // Use orders as recent trades (last 10)
  const trades = data?.slice(0, 10);

  function outcomeLabel(status: string) {
    switch (status) {
      case "FILLED": return { label: "FILLED", color: "#00ff88", bg: "rgba(0,255,136,0.1)" };
      case "CANCELLED": return { label: "CANCELLED", color: "#ff4444", bg: "rgba(255,68,68,0.1)" };
      case "OPEN": return { label: "OPEN", color: "#ffaa00", bg: "rgba(255,170,0,0.1)" };
      default: return { label: status, color: "#606080", bg: "rgba(96,96,128,0.1)" };
    }
  }

  return (
    <div className="q-card mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e2e' }}>
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
          Recent Orders
        </span>
        {trades && (
          <span className="text-xs q-mono" style={{ color: '#606080' }}>
            last {trades.length}
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
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>Price</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: '#606080' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: '#1e1e2e' }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 rounded animate-pulse" style={{ background: '#1e1e2e', width: '70%' }} />
                  </td>
                ))}
              </tr>
            ))}

            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center" style={{ color: '#606080' }}>
                  Backend offline
                </td>
              </tr>
            )}

            {!isLoading && !isError && (!trades || trades.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center" style={{ color: '#606080' }}>
                  No recent orders
                </td>
              </tr>
            )}

            {trades?.map((order) => {
              const { label, color, bg } = outcomeLabel(order.status);
              return (
                <tr
                  key={order.id}
                  className="q-table-row border-t"
                  style={{ borderColor: '#1e1e2e' }}
                >
                  <td className="px-4 py-2.5 max-w-xs">
                    <span className="line-clamp-1" style={{ color: '#e0e0e0' }}>{order.market}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="q-mono font-bold text-xs px-1.5 py-0.5 rounded"
                      style={{
                        color: order.direction === "YES" ? '#00ff88' : '#ff4444',
                        background: order.direction === "YES" ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                      }}
                    >
                      {order.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right q-mono" style={{ color: '#e0e0e0' }}>
                    {fmtUSDC(order.size)}
                  </td>
                  <td className="px-3 py-2.5 text-right q-mono" style={{ color: '#4488ff' }}>
                    {Math.round(order.limitPrice * 100)}¢
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="text-xs q-mono px-2 py-0.5 rounded"
                      style={{ color, background: bg }}
                    >
                      {label}
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
