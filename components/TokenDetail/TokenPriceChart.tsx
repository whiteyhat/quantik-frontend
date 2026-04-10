"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { useSocketEvent } from "@/context/SocketContext";
import { PriceChartSkeleton } from "./PriceChartSkeleton";
import { MigrationMarker } from "./MigrationMarker";

type Interval = "1h" | "1d" | "7d" | "30d";

const INTERVALS: Interval[] = ["1h", "1d", "7d", "30d"];

interface ChartPoint {
  timestamp: number;
  price_usdc: number;
  source: "dbc" | "damm_v2";
}

function formatXAxisTick(ts: number, interval: Interval): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  if (interval === "1h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatPrice(price: number): string {
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const price = payload[0].value;
  return (
    <div
      className="glass-card-elevated"
      style={{ padding: "8px 14px", borderRadius: 12, fontSize: "var(--text-subhead)" }}
    >
      <div
        className="font-mono-data"
        style={{ color: "#7B61FF", fontWeight: 600 }}
      >
        {formatPrice(price)} USDC
      </div>
      {label != null && (
        <div
          className="text-caption"
          style={{ color: "var(--text-tertiary)", marginTop: 2 }}
        >
          {new Date(label).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface TokenPriceChartProps {
  mint: string;
}

export function TokenPriceChart({ mint }: TokenPriceChartProps) {
  const [interval, setIntervalValue] = useState<Interval>("1d");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [migrationTimestamp, setMigrationTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch price history when interval changes
  useEffect(() => {
    if (!mint) return;
    setLoading(true);
    setError(false);
    api
      .fetchTokenPrices(mint, interval)
      .then((resp) => {
        setData(resp.prices);
        setMigrationTimestamp(resp.migrationTimestamp);
      })
      .catch(() => {
        setData([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [mint, interval]);

  // Append live price updates from Socket.IO (no full re-fetch)
  const handlePriceUpdate = useCallback(
    (payload: { mint: string; price: number; source: "dbc" | "damm_v2"; timestamp: number }) => {
      if (payload.mint !== mint) return;
      setData((prev) => [
        ...prev,
        { timestamp: payload.timestamp, price_usdc: payload.price, source: payload.source },
      ]);
    },
    [mint]
  );
  useSocketEvent("price:token-update", handlePriceUpdate);

  if (loading) return <PriceChartSkeleton />;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h2
          className="text-headline"
          style={{ color: "var(--text-primary)", margin: 0 }}
        >
          Token Price
        </h2>

        {/* Interval tabs */}
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Price chart interval"
        >
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              role="tab"
              aria-selected={interval === iv}
              className={interval === iv ? "active" : ""}
              onClick={() => setIntervalValue(iv)}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height: 280 }}>
        {error || data.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              Price data unavailable
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tokenPriceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7B61FF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts: number) => formatXAxisTick(ts, interval)}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                dataKey="price_usdc"
                tickFormatter={(v: number) => formatPrice(v)}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<GlassTooltip />} />
              {migrationTimestamp !== null && (
                <MigrationMarker migrationTimestamp={migrationTimestamp} />
              )}
              <Area
                type="monotone"
                dataKey="price_usdc"
                stroke="#7B61FF"
                strokeWidth={2}
                fill="url(#tokenPriceGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#7B61FF",
                  stroke: "rgba(123,97,255,0.3)",
                  strokeWidth: 6,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
