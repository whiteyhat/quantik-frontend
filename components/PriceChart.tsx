"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";

interface PriceChartProps {
  tokenId: string;
  slug: string;
}

const INTERVALS = [
  { label: "1D", value: "1h" },
  { label: "1W", value: "1d" },
  { label: "1M", value: "1d" },
  { label: "All", value: "1d" },
];

interface TooltipPayload {
  value?: number;
  name?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="text-xs q-mono p-2 rounded"
      style={{ background: '#14141f', border: '1px solid #1e1e2e', color: '#e0e0e0' }}
    >
      <div style={{ color: '#606080' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.name === "yes" ? '#00ff88' : '#ff4444' }}>
          {p.name === "yes" ? "YES" : "NO"}: {Math.round((p.value ?? 0) * 100)}¢
        </div>
      ))}
    </div>
  );
}

export function PriceChart({ tokenId, slug }: PriceChartProps) {
  const [interval, setInterval] = useState("1d");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["price-history", tokenId, interval],
    queryFn: () => api.getPriceHistory(tokenId, interval),
    refetchInterval: 60000,
  });

  const chartData = data?.map((p) => ({
    ...p,
    time: new Date(p.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="q-card mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e2e' }}>
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
          YES Price History
        </span>
        <div className="flex gap-1">
          {INTERVALS.map((i) => (
            <button
              key={i.label}
              onClick={() => setInterval(i.value)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                background: interval === i.value ? 'rgba(68, 136, 255, 0.2)' : 'transparent',
                color: interval === i.value ? '#4488ff' : '#606080',
                border: interval === i.value ? '1px solid rgba(68, 136, 255, 0.4)' : '1px solid transparent',
              }}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4" style={{ height: 240 }}>
        {isLoading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-xs agent-running" style={{ color: '#606080' }}>Loading chart...</div>
          </div>
        )}

        {isError && (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs" style={{ color: '#606080' }}>Price data unavailable</span>
          </div>
        )}

        {!isLoading && !isError && chartData && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#606080', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v * 100)}¢`}
                tick={{ fill: '#606080', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 1]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0.5} stroke="#1e1e2e" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="yes"
                stroke="#00ff88"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: '#00ff88' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!isLoading && !isError && (!chartData || chartData.length === 0) && (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs" style={{ color: '#606080' }}>No price history available</span>
          </div>
        )}
      </div>
    </div>
  );
}
