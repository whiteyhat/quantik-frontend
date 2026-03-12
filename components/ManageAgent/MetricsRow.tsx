"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { WalletBalance, PerformanceSummary } from "@/lib/api";

interface MetricsRowProps {
  wallet: WalletBalance | null;
  performance: PerformanceSummary | null;
  loading: boolean;
}

interface MetricCard {
  label: string;
  value: string;
  delta?: string;
  color: string;
}

export function MetricsRow({ wallet, performance, loading }: MetricsRowProps) {
  const t = useTranslations("manageAgent");
  const totalReturnPct = wallet?.pnlPct ?? null;
  const todayPnlPct = wallet?.pnlTodayPct ?? null;
  const streak = performance?.metrics?.currentStreak ?? 0;

  const metrics: MetricCard[] = [
    {
      label: t("totalReturn"),
      value: totalReturnPct != null ? `${totalReturnPct >= 0 ? "+" : ""}${(totalReturnPct * 100).toFixed(1)}%` : "--",
      delta: todayPnlPct != null ? `${todayPnlPct >= 0 ? "+" : ""}${(todayPnlPct * 100).toFixed(1)}% ${t("today")}` : wallet?.balanceMessage ?? undefined,
      color: totalReturnPct == null ? "rgba(255,255,255,0.45)" : totalReturnPct >= 0 ? "#30d158" : "#ff453a",
    },
    {
      label: t("winRate"),
      value: wallet ? `${(wallet.winRate * 100).toFixed(0)}%` : "--",
      delta: wallet ? `${wallet.totalTrades} ${t("trades")}` : undefined,
      color: "#0a84ff",
    },
    {
      label: t("maxDrawdown"),
      value: wallet?.drawdown != null ? `${(wallet.drawdown * 100).toFixed(1)}%` : "--",
      delta: wallet?.drawdownLimit != null ? `${t("limit")} ${(wallet.drawdownLimit * 100).toFixed(0)}%` : undefined,
      color: "#ff453a",
    },
    {
      label: t("streak"),
      value: streak !== 0 ? `${streak > 0 ? streak : Math.abs(streak)}` : "--",
      delta: streak !== 0
        ? `${streak > 0 ? t("winning") : t("losing")}`
        : undefined,
      color: streak >= 0 ? "#bf5af2" : "#ff453a",
    },
    {
      label: t("trades"),
      value: wallet ? `${wallet.totalTrades}` : "--",
      delta: performance ? `$${performance.metrics.totalVolume.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${t("vol")}` : undefined,
      color: "#ff9f0a",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            flex: "1 1 140px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.40)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            {m.label}
          </div>
          {loading ? (
            <Skeleton width={80} height={28} borderRadius={4} />
          ) : (
            <>
              <div
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {m.value}
              </div>
              {m.delta && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: m.color,
                    fontFamily: '"SF Mono", monospace',
                  }}
                >
                  {m.delta}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
