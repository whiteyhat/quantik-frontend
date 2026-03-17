"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useSocketEvent } from "@/context/SocketContext";
import { useFollowedAgents } from "@/hooks/useFollowedAgents";

interface ArenaRankDeltaEvent {
  window: string;
  deltas: Array<{
    agentId: string;
    name: string;
    avatarEmoji: string;
    previousRank: number | null;
    currentRank: number;
    rankChange: number;
  }>;
  timestamp: number;
}

interface ActivityItem {
  id: string;
  agentId: string;
  emoji: string;
  text: string;
  tone: "climb" | "drop" | "crown";
  timestamp: number;
}

const MAX_ITEMS = 8;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deltaToItems(event: ArenaRankDeltaEvent, t: (key: any, values?: any) => string): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const delta of event.deltas) {
    if (delta.rankChange === 0) continue;

    if (delta.currentRank === 1 && delta.rankChange > 0) {
      items.push({
        id: `${event.timestamp}-${delta.agentId}-crown`,
        agentId: delta.agentId,
        emoji: delta.avatarEmoji || "🏆",
        text: t("crownClaimed", { name: delta.name }),
        tone: "crown",
        timestamp: event.timestamp,
      });
    } else if (delta.rankChange > 0) {
      const from = delta.previousRank ?? "?";
      items.push({
        id: `${event.timestamp}-${delta.agentId}`,
        agentId: delta.agentId,
        emoji: delta.avatarEmoji || "📈",
        text: t("rankClimbed", { name: delta.name, from: String(from), to: String(delta.currentRank) }),
        tone: "climb",
        timestamp: event.timestamp,
      });
    } else {
      items.push({
        id: `${event.timestamp}-${delta.agentId}`,
        agentId: delta.agentId,
        emoji: delta.avatarEmoji || "📉",
        text: t("rankDropped", { name: delta.name, rank: String(delta.currentRank) }),
        tone: "drop",
        timestamp: event.timestamp,
      });
    }
  }
  return items;
}

export function LiveActivityFeed() {
  const t = useTranslations("arena");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [followingOnly, setFollowingOnly] = useState(false);
  const { followed } = useFollowedAgents();

  const handler = useCallback((event: ArenaRankDeltaEvent) => {
    const newItems = deltaToItems(event, t);
    if (newItems.length === 0) return;
    setItems((prev) => [...newItems, ...prev].slice(0, MAX_ITEMS));
  }, [t]);

  useSocketEvent("arena:leaderboard_delta", handler);

  const visibleItems = followingOnly && followed.size > 0
    ? items.filter((item) => followed.has(item.agentId))
    : items;

  if (items.length === 0) return null;

  return (
    <div className="arena-feed">
      <div className="arena-feed-header">
        <span className="arena-section-kicker">{t("liveActivity")}</span>
        {followed.size > 0 && (
          <button
            type="button"
            className={`arena-feed-toggle ${followingOnly ? "arena-feed-toggle--active" : ""}`}
            onClick={() => setFollowingOnly((prev) => !prev)}
            aria-pressed={followingOnly}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={followingOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {t("feedFollowing")}
          </button>
        )}
      </div>
      <div className="arena-feed-track">
        {visibleItems.map((item) => (
          <div key={item.id} className={`arena-feed-item arena-feed-item--${item.tone}`}>
            <span className="arena-feed-emoji">{item.emoji}</span>
            <span className="arena-feed-text">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
