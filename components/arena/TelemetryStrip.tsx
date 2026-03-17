"use client";

import { ArrowRight, ChevronDown, ChevronUp, Crown, Flame, Minus, Radar, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type ArenaLeaderboardEntry, type ArenaWindow } from "@/lib/api";
import { formatSignedCurrency, protocolKeys, streakLabel } from "@/components/arena/arenaHelpers";

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <ChevronUp className="arena-telemetry-trend arena-telemetry-trend--up size-3" />;
  if (value < 0) return <ChevronDown className="arena-telemetry-trend arena-telemetry-trend--down size-3" />;
  return <Minus className="arena-telemetry-trend arena-telemetry-trend--flat size-3" />;
}

export function TelemetryStrip({
  champion,
  hottestStreak,
  bestTradeLeader,
  activeWindow,
  runnerUpGap,
}: {
  champion: ArenaLeaderboardEntry | null;
  hottestStreak: ArenaLeaderboardEntry | null;
  bestTradeLeader: ArenaLeaderboardEntry | null;
  activeWindow: ArenaWindow;
  runnerUpGap?: number;
}) {
  const t = useTranslations("arena");
  const keys = protocolKeys(activeWindow);

  const telemetryCards = [
    {
      key: "crown",
      icon: Crown,
      label: t("crownPressure"),
      title: champion?.name ?? t("telemetryUnavailable"),
      value: champion ? formatSignedCurrency(champion.selectedPnl) : t("telemetryNoSignal"),
      backLabel: t("runnerUpGap"),
      backValue: runnerUpGap != null ? formatSignedCurrency(runnerUpGap) : "—",
      trend: champion?.selectedPnl ?? 0,
      href: "/reports",
    },
    {
      key: "streak",
      icon: Flame,
      label: t("hottestStreak"),
      title: hottestStreak?.name ?? t("telemetryUnavailable"),
      value: hottestStreak ? streakLabel(hottestStreak.currentStreak) : t("telemetryNoSignal"),
      backLabel: t("direction"),
      backValue: hottestStreak ? ((hottestStreak.currentStreak ?? 0) > 0 ? t("winStreak") : t("lossStreak")) : "—",
      trend: hottestStreak?.currentStreak ?? 0,
      href: "/reports",
    },
    {
      key: "best-trade",
      icon: Zap,
      label: t("bestTradePulse"),
      title: bestTradeLeader?.name ?? t("telemetryUnavailable"),
      value: bestTradeLeader ? formatSignedCurrency(bestTradeLeader.bestTradePnl) : t("telemetryNoSignal"),
      backLabel: t("market"),
      backValue: bestTradeLeader?.bestTradeSlug ?? "—",
      trend: bestTradeLeader?.bestTradePnl ?? 0,
      href: "/reports",
    },
    {
      key: "protocol",
      icon: Radar,
      label: t("battleProtocol"),
      title: t(keys.protocolKey),
      value: t("telemetryProtocolHint"),
      backLabel: t("window"),
      backValue: activeWindow === "day" ? t("window24h") : activeWindow === "week" ? t("window7d") : t("windowAllTime"),
      trend: 0,
      href: "/manage-agent",
    },
  ];

  return (
    <div className="arena-telemetry-strip">
      {telemetryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.key} href={card.href} className="arena-telemetry-card">
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
                  <small className="arena-telemetry-value">{card.value}</small>
                </div>
                <ArrowRight className="arena-telemetry-arrow size-4" />
              </div>

              {/* Back face */}
              <div className="arena-telemetry-back">
                <Icon className="size-4" />
                <div className="arena-telemetry-copy">
                  <span>{card.backLabel}</span>
                  <strong className="arena-telemetry-title">{card.backValue}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
