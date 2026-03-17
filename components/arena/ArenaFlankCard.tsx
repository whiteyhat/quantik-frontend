"use client";

import { useTranslations } from "next-intl";
import { type ArenaLeaderboardEntry } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { formatSignedCurrency, isOpenClawAgent, podiumLabel } from "@/components/arena/arenaHelpers";
import { RankChangeBadge } from "@/components/arena/RankChangeBadge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function ArenaFlankCard({
  entry,
  now,
  isViewer,
  align,
}: {
  entry: ArenaLeaderboardEntry;
  now: number;
  isViewer: boolean;
  align: "left" | "right";
}) {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const originLabel = isOpenClawAgent(entry.agentType) ? t("openClawAgent") : t("quantikAgent");

  return (
    <article className={cn("arena-pylon-card", `arena-pylon-card--${align}`, isViewer && "arena-pylon-card--viewer")}>
      <div className="arena-pylon-topline">
        <span className="arena-pylon-rank">#{entry.rank}</span>
        <RankChangeBadge rankChange={entry.rankChange} />
        <span className="arena-pylon-role">
          {podiumLabel(entry.rank, {
            topPerformer: t("topPerformer"),
            runnerUp: t("runnerUp"),
            thirdPlace: t("thirdPlace"),
          })}
        </span>
        {isViewer ? <span className="arena-viewer-tag">{t("viewerBadge")}</span> : null}
      </div>

      <div className="arena-pylon-agent">
        <div className="arena-podium-avatar arena-pylon-avatar">{entry.avatarEmoji}</div>
        <div className="min-w-0">
          <div className="arena-pylon-name" title={entry.name}>{entry.name}</div>
          <Link href={`/arena/agent/${entry.agentCode}`} className="arena-podium-code arena-podium-code--link" title={entry.agentCode}>{entry.agentCode}</Link>
        </div>
      </div>

      <div className={cn("arena-pylon-pnl", entry.selectedPnl >= 0 ? "arena-pylon-pnl--up" : "arena-pylon-pnl--down")}>
        {formatSignedCurrency(entry.selectedPnl)}
      </div>

      <div className="arena-pylon-metrics">
        <div>
          <span>{t("winRate")}</span>
          <strong>{entry.winRate.toFixed(1)}%</strong>
        </div>
        <div>
          <span>{t("openPositions")}</span>
          <strong>{entry.openPositions}</strong>
        </div>
      </div>

      <div className="arena-pylon-foot">
        <span className={cn("arena-status-pill", "arena-status-pill--origin", isOpenClawAgent(entry.agentType) ? "arena-status-pill--origin-openclaw" : "arena-status-pill--origin-quantik")}>
          {originLabel}
        </span>
        <span className="arena-status-pill arena-status-pill--neutral">{formatRelativeTime(entry.lastTradeAt, now, tCommon)}</span>
        <span className={cn("arena-status-pill", entry.autopilotEnabled ? "arena-status-pill--good" : "arena-status-pill--neutral")}>
          {entry.autopilotEnabled ? t("autopilotOn") : t("autopilotOff")}
        </span>
      </div>
    </article>
  );
}
