"use client";

import { useEffect, useState } from "react";
import { api, type PricePoint } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const INTERVALS = ["1h", "1d", "1w", "all"] as const;
const INTERVAL_LABELS: Record<string, string> = {
  "1h": "1H",
  "1d": "1D",
  "1w": "1W",
  "all": "All",
};

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card-elevated"
      style={{
        padding: "8px 14px",
        borderRadius: 12,
        fontSize: "var(--text-subhead)",
      }}
    >
      <div className="font-mono-data" style={{ color: "var(--ios-green)", fontWeight: 600 }}>
        YES: {Math.round(payload[0].value * 100)}¢
      </div>
      {label && (
        <div className="text-caption" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
          {new Date(label).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function PriceChart({ tokenId }: { tokenId: string; slug: string }) {
  const [interval, setInterval] = useState<string>("1d");
  const [data, setData] = useState<PricePoint[]>([]);

  useEffect(() => {
    api.getPriceHistory(tokenId, interval).then(setData).catch(() => {});
  }, [tokenId, interval]);

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      {/* Header with segmented control */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: 0 }}>
          Price History
        </h2>

        <div className="segmented-control">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              className={interval === iv ? "active" : ""}
              onClick={() => setInterval(iv)}
            >
              {INTERVAL_LABELS[iv]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ios-green)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--ios-green)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => {
                if (!ts) return "";
                const d = new Date(ts);
                if (isNaN(d.getTime())) return "";
                return interval === "1h"
                  ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : d.toLocaleDateString([], { month: "short", day: "numeric" });
              }}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}¢`}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<GlassTooltip />} />
            <Area
              type="monotone"
              dataKey="yes"
              stroke="var(--ios-green)"
              strokeWidth={2}
              fill="url(#greenGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--ios-green)",
                stroke: "rgba(48,209,88,0.3)",
                strokeWidth: 6,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }} className="text-body">
          No price data available
        </div>
      )}
    </div>
  );
}
