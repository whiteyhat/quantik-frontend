"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type ArenaLeaderboardEntry, type ArenaWindow } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { formatSignedCompact, formatSignedCurrency, streakLabel } from "@/components/arena/arenaHelpers";
import { RankChangeBadge } from "@/components/arena/RankChangeBadge";
import { PnlSparkline } from "@/components/arena/PnlSparkline";
import { AchievementBadgeRow } from "@/components/arena/AchievementBadge";
import { AgentHeatGlow } from "@/components/arena/AgentHeatGlow";
import { AgentProfileFlyout } from "@/components/arena/AgentProfileFlyout";
import { cn } from "@/lib/utils";

export function BattleLaneRow({
  entry,
  now,
  isViewer,
  isExpanded,
  onToggleExpand,
  staggerIndex,
  activeWindow,
}: {
  entry: ArenaLeaderboardEntry;
  now: number;
  isViewer: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  staggerIndex?: number;
  activeWindow?: ArenaWindow;
}) {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const connectionLabel = entry.connectionStatus?.replace(/_/g, " ") ?? t("training");
  const reducedMotion = useReducedMotion();

  const content = (
    <>
      <motion.article
        layout={!reducedMotion}
        layoutId={entry.agentId}
        initial={!reducedMotion && staggerIndex != null ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={!reducedMotion ? { opacity: 0, scale: 0.97 } : undefined}
        transition={{
          layout: { type: "spring", stiffness: 400, damping: 30 },
          opacity: { duration: 0.2 },
          ...(staggerIndex != null ? { delay: staggerIndex * 0.05 } : {}),
        }}
        className={cn("arena-lane", isViewer && "arena-lane--viewer", isExpanded && "arena-lane--expanded")}
        onClick={onToggleExpand}
        role={onToggleExpand ? "button" : undefined}
        tabIndex={onToggleExpand ? 0 : undefined}
        onKeyDown={onToggleExpand ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleExpand(); } } : undefined}
      >
        <div className="arena-lane-rankblade">
          <span>#{entry.rank}</span>
          <RankChangeBadge rankChange={entry.rankChange} />
        </div>

        <div className="arena-lane-agent">
          <div className="arena-board-avatar arena-lane-avatar">{entry.avatarEmoji}</div>
          <div className="min-w-0">
            <div className="arena-board-name-row">
              <span className="arena-board-name" title={entry.name}>{entry.name}</span>
              {isViewer ? <span className="arena-viewer-tag">{t("viewerBadge")}</span> : null}
              <AchievementBadgeRow badges={entry.badges} maxVisible={3} />
            </div>
            <div className="arena-lane-meta">
              <span title={entry.agentCode}>{entry.agentCode}</span>
              <span>{entry.openPositions} {t("openShort")}</span>
              <span>{streakLabel(entry.currentStreak)}</span>
              <span>{connectionLabel}</span>
            </div>
          </div>
        </div>

        <div className={cn("arena-lane-pnl", entry.selectedPnl >= 0 ? "arena-lane-pnl--up" : "arena-lane-pnl--down")}>
          <div className="arena-lane-sparkline">
            <strong>{formatSignedCurrency(entry.selectedPnl)}</strong>
            {entry.marketBreakdown.length >= 2 && (
              <PnlSparkline data={entry.marketBreakdown} />
            )}
          </div>
          <span>{t("allTimePnl")} {formatSignedCompact(entry.allTimePnl)}</span>
        </div>

        <div className="arena-lane-intel">
          <div className="arena-lane-intel-chip">
            <span>{t("realized")}</span>
            <strong>{formatSignedCompact(entry.selectedRealizedPnl)}</strong>
          </div>
          <div className="arena-lane-intel-chip">
            <span>{t("unrealized")}</span>
            <strong>{formatSignedCompact(entry.selectedUnrealizedPnl)}</strong>
          </div>
          <div className="arena-lane-intel-chip">
            <span>{t("winRate")}</span>
            <strong>{entry.winRate.toFixed(1)}%</strong>
          </div>
          <div className="arena-lane-intel-chip">
            <span>{t("totalTrades")}</span>
            <strong>{entry.totalTrades}</strong>
          </div>
        </div>

        <div className="arena-lane-trail">
          <div className="arena-lane-tag-stack">
            <span
              className={cn("arena-status-icon", entry.autopilotEnabled ? "arena-status-icon--good" : "arena-status-icon--neutral")}
              data-tooltip={entry.autopilotEnabled ? t("autopilotOn") : t("autopilotOff")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.7 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.7.5-1.1z" />
              </svg>
            </span>
            <span
              className={cn("arena-status-icon", entry.polymarketReady ? "arena-status-icon--good" : "arena-status-icon--warn")}
              data-tooltip={entry.polymarketReady ? t("battleReady") : t("training")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
          </div>
          <div className="arena-lane-last">
            <span>{t("lastTrade")}</span>
            <strong>{formatRelativeTime(entry.lastTradeAt, now, tCommon)}</strong>
          </div>
        </div>
      </motion.article>

      <AnimatePresence>
        {isExpanded && activeWindow && (
          <AgentProfileFlyout
            entry={entry}
            activeWindow={activeWindow}
            onClose={onToggleExpand ?? (() => {})}
          />
        )}
      </AnimatePresence>
    </>
  );

  if (entry.heat > 0.05) {
    return <AgentHeatGlow heat={entry.heat}>{content}</AgentHeatGlow>;
  }

  return content;
}
