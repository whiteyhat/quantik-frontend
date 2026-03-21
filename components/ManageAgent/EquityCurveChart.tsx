"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fmtUSDC, type Trade, type WalletBalance } from "@/lib/api";
import {
  buildEquityCurve,
  formatEquityAxisLabel,
  formatEquityTooltipLabel,
} from "@/lib/equityCurve";

interface EquityCurveChartProps {
  wallet: WalletBalance | null;
  trades: Trade[];
  timePeriod: "7D" | "30D" | "All";
}

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number | string;
}) {
  if (!active || !payload?.length) return null;
  const timestamp = typeof label === "number" ? label : Number(label);
  return (
    <div
      style={{
        background: "rgba(20,20,25,0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", marginBottom: 4 }}>
        {Number.isFinite(timestamp) ? formatEquityTooltipLabel(timestamp) : label}
      </div>
      <div style={{ fontFamily: '"SF Mono", monospace', fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
        {fmtUSDC(payload[0].value)}
      </div>
    </div>
  );
}

export function EquityCurveChart({ wallet, trades, timePeriod }: EquityCurveChartProps) {
  const t = useTranslations("equityCurve");
  const currentBalance = wallet?.totalValue ?? null;
  const chartData = useMemo(() => {
    return buildEquityCurve(currentBalance, trades, timePeriod);
  }, [currentBalance, trades, timePeriod]);

  const periodPnl = useMemo(() => {
    if (chartData.length < 2) return 0;
    return chartData[chartData.length - 1].value - chartData[0].value;
  }, [chartData]);

  const isPositive = periodPnl >= 0;

  return (
    <div className="glass-card glass-panel-compact">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            {t("title")}
          </div>
          <div
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 28,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {currentBalance != null ? fmtUSDC(currentBalance) : "--"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            {timePeriod} P&L
          </div>
          <div
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 20,
              fontWeight: 700,
              color: isPositive ? "#30d158" : "#ff453a",
            }}
          >
            {currentBalance != null ? `${isPositive ? "+" : ""}${fmtUSDC(periodPnl)}` : "--"}
          </div>
        </div>
      </div>

      {currentBalance == null ? (
        <div
          style={{
            height: 240,
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
            color: "rgba(255,255,255,0.42)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {wallet?.balanceMessage ?? t("noDataYet")}
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#30d158" : "#ff453a"} stopOpacity={0.3} />
              <stop offset="100%" stopColor={isPositive ? "#30d158" : "#ff453a"} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            minTickGap={24}
            tickFormatter={(value: number) => {
              const isCurrentPoint = value === chartData[chartData.length - 1]?.timestamp;
              return isCurrentPoint ? t("now") : formatEquityAxisLabel(value, timePeriod);
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` :
              v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k` :
              `$${v.toFixed(0)}`
            }
          />
          <Tooltip content={<GlassTooltip />} />
          <Area
            type="monotoneX"
            dataKey="value"
            stroke={isPositive ? "#30d158" : "#ff453a"}
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
