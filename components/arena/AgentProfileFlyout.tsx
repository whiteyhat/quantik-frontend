"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { type ArenaLeaderboardEntry, type ArenaWindow } from "@/lib/api";
import { useArenaAgentHistoryQuery } from "@/components/dashboard/dashboardQueries";
import { formatSignedCurrency } from "@/components/arena/arenaHelpers";
import { AchievementBadge } from "@/components/arena/AchievementBadge";
import { PnlSparkline } from "@/components/arena/PnlSparkline";
import { WinRateRing } from "@/components/arena/WinRateRing";
import { StrategyDNAChart } from "@/components/arena/StrategyDNAChart";
import { useFollowedAgents } from "@/hooks/useFollowedAgents";

export function AgentProfileFlyout({
  entry,
  activeWindow,
  onClose,
}: {
  entry: ArenaLeaderboardEntry;
  activeWindow: ArenaWindow;
  onClose: () => void;
}) {
  const t = useTranslations("arena");
  const panelRef = useRef<HTMLDivElement>(null);
  const historyQuery = useArenaAgentHistoryQuery(entry.agentId, activeWindow);
  const { isFollowing, toggle: toggleFollow } = useFollowedAgents();
  const following = isFollowing(entry.agentId);

  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const historyData = historyQuery.data ?? [];

  return (
    <motion.div
      ref={panelRef}
      className="arena-flyout"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="arena-flyout-inner">
        {/* Follow Button */}
        <div className="arena-flyout-actions">
          <button
            type="button"
            className={`arena-flyout-follow ${following ? "arena-flyout-follow--active" : ""}`}
            onClick={() => toggleFollow(entry.agentId)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={following ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {following ? t("following") : t("follow")}
          </button>
        </div>

        {/* Equity Curve */}
        <div className="arena-flyout-section">
          <div className="arena-section-kicker">PnL History</div>
          <div className="arena-flyout-chart">
            {historyData.length >= 2 ? (
              <PnlSparkline
                data={historyData.map((p) => ({ slug: "", pnl: p.pnl, trades: 0, winRate: 0, openPositions: 0 }))}
                width={280}
                height={80}
              />
            ) : (
              <span className="arena-flyout-no-data">Not enough history</span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="arena-flyout-stats">
          <WinRateRing winRate={entry.winRate} />
          <div className="arena-flyout-stat">
            <span>{t("realized")}</span>
            <strong>{formatSignedCurrency(entry.selectedRealizedPnl)}</strong>
          </div>
          <div className="arena-flyout-stat">
            <span>{t("unrealized")}</span>
            <strong>{formatSignedCurrency(entry.selectedUnrealizedPnl)}</strong>
          </div>
          <div className="arena-flyout-stat">
            <span>{t("totalTrades")}</span>
            <strong>{entry.totalTrades}</strong>
          </div>
          <div className="arena-flyout-stat">
            <span>Streak</span>
            <strong>{entry.currentStreak > 0 ? `+${entry.currentStreak}W` : entry.currentStreak < 0 ? `${entry.currentStreak}L` : "—"}</strong>
          </div>
        </div>

        {/* Market Breakdown */}
        {entry.marketBreakdown.length > 0 && (
          <div className="arena-flyout-section">
            <div className="arena-section-kicker">Market Breakdown</div>
            <div className="arena-flyout-markets">
              {entry.marketBreakdown.map((m) => (
                <div key={m.slug} className="arena-flyout-market-row">
                  <span className="arena-flyout-market-slug" title={m.slug}>{m.slug}</span>
                  <span className={m.pnl >= 0 ? "arena-flyout-pnl--up" : "arena-flyout-pnl--down"}>
                    {formatSignedCurrency(m.pnl)}
                  </span>
                  <span>{m.trades} trades</span>
                  <span>{m.winRate.toFixed(0)}% WR</span>
                  {m.openPositions > 0 && <span className="arena-flyout-open-tag">{m.openPositions} open</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy DNA */}
        <div className="arena-flyout-section">
          <div className="arena-section-kicker">{t("strategyDNA")}</div>
          <div className="arena-flyout-dna">
            <StrategyDNAChart dna={entry.dna} size={160} />
          </div>
        </div>

        {/* Badges */}
        {entry.badges.length > 0 && (
          <div className="arena-flyout-section">
            <div className="arena-section-kicker">Achievements</div>
            <div className="arena-flyout-badges">
              {entry.badges.map((badge, i) => (
                <AchievementBadge key={badge.id} badge={badge} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
