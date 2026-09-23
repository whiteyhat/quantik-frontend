"use client";

import { Activity, ChevronDown, ChevronUp, Flame, Minus, TrendingUp, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ArenaLeaderboardEntry } from "@/lib/api";
import {
  biggestClimber,
  formatSignedCurrency,
  marketQuestion,
  mostActive,
  streakLabel,
} from "@/components/arena/arenaHelpers";

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <ChevronUp className="arena-telemetry-trend arena-telemetry-trend--up size-3" />;
  if (value < 0) return <ChevronDown className="arena-telemetry-trend arena-telemetry-trend--down size-3" />;
  return <Minus className="arena-telemetry-trend arena-telemetry-trend--flat size-3" />;
}

// Four angles on the race the podium above does not already show (the
// champion, its lead and the active window are stated once, up there)
export function TelemetryStrip({ leaders }: { leaders: ArenaLeaderboardEntry[] }) {
  const t = useTranslations("arena");

  const hottestStreak = leaders.reduce<ArenaLeaderboardEntry | null>(
    (best, entry) => (!best || Math.abs(entry.currentStreak) > Math.abs(best.currentStreak) ? entry : best),
    null,
  );
  const bestTrade = leaders.reduce<ArenaLeaderboardEntry | null>(
    (best, entry) => (!best || entry.bestTradePnl > best.bestTradePnl ? entry : best),
    null,
  );
  const climber = biggestClimber(leaders);
  const busiest = mostActive(leaders);
  const bestMarket = marketQuestion(bestTrade?.bestTradeSlug, leaders);

  const telemetryCards = [
    {
      key: "streak",
      icon: Flame,
      label: t("hottestStreak"),
      title: hottestStreak?.name ?? t("telemetryUnavailable"),
      value: hottestStreak ? streakLabel(hottestStreak.currentStreak) : t("telemetryNoSignal"),
      backLabel: t("direction"),
      backValue: hottestStreak ? (hottestStreak.currentStreak > 0 ? t("winStreak") : t("lossStreak")) : "—",
      trend: hottestStreak?.currentStreak ?? 0,
    },
    {
      key: "best-trade",
      icon: Zap,
      label: t("bestTradePulse"),
      title: bestTrade?.name ?? t("telemetryUnavailable"),
      value: bestTrade ? formatSignedCurrency(bestTrade.bestTradePnl) : t("telemetryNoSignal"),
      backLabel: t("market"),
      // The market question, never a raw slug
      backValue: bestMarket ?? "—",
      trend: bestTrade?.bestTradePnl ?? 0,
    },
    {
      key: "climber",
      icon: TrendingUp,
      label: t("biggestClimber"),
      title: climber?.name ?? t("telemetryUnavailable"),
      value: climber ? t("climbedPlaces", { n: climber.rankChange ?? 0 }) : t("telemetryNoSignal"),
      backLabel: t("position"),
      backValue: climber ? `#${climber.rank}` : "—",
      trend: climber?.rankChange ?? 0,
    },
    {
      key: "active",
      icon: Activity,
      label: t("mostActive"),
      title: busiest?.name ?? t("telemetryUnavailable"),
      value: busiest ? t("tradesCount", { count: busiest.totalTrades }) : t("telemetryNoSignal"),
      backLabel: t("winRate"),
      backValue: busiest ? `${busiest.winRate.toFixed(1)}%` : "—",
      trend: 0,
    },
  ];

  return (
    <div className="arena-telemetry-strip">
      {telemetryCards.map((card) => {
        const Icon = card.icon;
        return (
          // Focusable so keyboard users can flip it too
          <div key={card.key} className="arena-telemetry-card" tabIndex={0}>
            <div className="arena-telemetry-flipper">
              {/* Front face */}
              <div className="arena-telemetry-front">
                <Icon className="size-4" />
                <div className="arena-telemetry-copy">
                  <span>{card.label}</span>
                  <strong className="arena-telemetry-title" title={card.title}>
                    {card.title}
                    {card.trend !== 0 && <TrendArrow value={card.trend} />}
                  </strong>
                  <small className="arena-telemetry-value" title={card.value}>{card.value}</small>
                </div>
              </div>

              {/* Back face */}
              <div className="arena-telemetry-back">
                <Icon className="size-4" />
                <div className="arena-telemetry-copy">
                  <span>{card.backLabel}</span>
                  <strong className="arena-telemetry-title arena-telemetry-title--wrap" title={card.backValue}>
                    {card.backValue}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
