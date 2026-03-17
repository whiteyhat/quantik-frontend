"use client";

import { ArrowRight, Crown, Flame, Radar, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type ArenaLeaderboardEntry, type ArenaWindow } from "@/lib/api";
import { formatSignedCurrency, protocolKeys, streakLabel } from "@/components/arena/arenaHelpers";

export function TelemetryStrip({
  champion,
  hottestStreak,
  bestTradeLeader,
  activeWindow,
}: {
  champion: ArenaLeaderboardEntry | null;
  hottestStreak: ArenaLeaderboardEntry | null;
  bestTradeLeader: ArenaLeaderboardEntry | null;
  activeWindow: ArenaWindow;
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
      href: "/reports",
    },
    {
      key: "streak",
      icon: Flame,
      label: t("hottestStreak"),
      title: hottestStreak?.name ?? t("telemetryUnavailable"),
      value: hottestStreak ? streakLabel(hottestStreak.currentStreak) : t("telemetryNoSignal"),
      href: "/reports",
    },
    {
      key: "best-trade",
      icon: Zap,
      label: t("bestTradePulse"),
      title: bestTradeLeader?.name ?? t("telemetryUnavailable"),
      value: bestTradeLeader ? formatSignedCurrency(bestTradeLeader.bestTradePnl) : t("telemetryNoSignal"),
      href: "/reports",
    },
    {
      key: "protocol",
      icon: Radar,
      label: t("battleProtocol"),
      title: t(keys.protocolKey),
      value: t("telemetryProtocolHint"),
      href: "/manage-agent",
    },
  ];

  return (
    <div className="arena-telemetry-strip">
      {telemetryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.key} href={card.href} className="arena-telemetry-card">
            <Icon className="size-4" />
            <div className="arena-telemetry-copy">
              <span>{card.label}</span>
              <strong className="arena-telemetry-title" title={card.title}>{card.title}</strong>
              <small className="arena-telemetry-value">{card.value}</small>
            </div>
            <ArrowRight className="arena-telemetry-arrow size-4" />
          </Link>
        );
      })}
    </div>
  );
}
