"use client";

import { useCallback, useState } from "react";
import { useSocketEvent } from "@/context/SocketContext";

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
  emoji: string;
  text: string;
  tone: "climb" | "drop" | "crown";
  timestamp: number;
}

const MAX_ITEMS = 8;

function deltaToItems(event: ArenaRankDeltaEvent): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const delta of event.deltas) {
    if (delta.rankChange === 0) continue;

    if (delta.currentRank === 1 && delta.rankChange > 0) {
      items.push({
        id: `${event.timestamp}-${delta.agentId}-crown`,
        emoji: delta.avatarEmoji || "🏆",
        text: `${delta.name} claimed the crown!`,
        tone: "crown",
        timestamp: event.timestamp,
      });
    } else if (delta.rankChange > 0) {
      const from = delta.previousRank ?? "?";
      items.push({
        id: `${event.timestamp}-${delta.agentId}`,
        emoji: delta.avatarEmoji || "📈",
        text: `${delta.name} #${from} → #${delta.currentRank}`,
        tone: "climb",
        timestamp: event.timestamp,
      });
    } else {
      items.push({
        id: `${event.timestamp}-${delta.agentId}`,
        emoji: delta.avatarEmoji || "📉",
        text: `${delta.name} dropped to #${delta.currentRank}`,
        tone: "drop",
        timestamp: event.timestamp,
      });
    }
  }
  return items;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  const handler = useCallback((event: ArenaRankDeltaEvent) => {
    const newItems = deltaToItems(event);
    if (newItems.length === 0) return;
    setItems((prev) => [...newItems, ...prev].slice(0, MAX_ITEMS));
  }, []);

  useSocketEvent("arena:leaderboard_delta", handler);

  if (items.length === 0) return null;

  return (
    <div className="arena-feed">
      <div className="arena-feed-header">
        <span className="arena-section-kicker">Live Activity</span>
      </div>
      <div className="arena-feed-track">
        {items.map((item) => (
          <div key={item.id} className={`arena-feed-item arena-feed-item--${item.tone}`}>
            <span className="arena-feed-emoji">{item.emoji}</span>
            <span className="arena-feed-text">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
