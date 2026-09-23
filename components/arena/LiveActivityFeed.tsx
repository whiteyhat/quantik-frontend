"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSocketEvent } from "@/context/SocketContext";
import { useViewer } from "@/context/ViewerContext";
import { useFollowedAgents } from "@/hooks/useFollowedAgents";
import { useNow } from "@/hooks/useNow";
import { fmtUSDC } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { arenaFeedSources } from "@/components/arena/arenaHelpers";
import {
  DEMO_ARENA_FEED_SEED_SIZE,
  demoArenaFeedEvent,
  demoArenaFeedSeed,
  type ArenaFeedEvent,
} from "@/lib/demo/arena";

interface ActivityItem {
  id: string;
  agentId: string;
  emoji: string;
  text: string;
  tone: "climb" | "drop" | "crown" | "win" | "loss" | "streak";
  timestamp: number;
}

const MAX_ITEMS = 8;
// Guests watch a sample arena: an uneven beat reads as live, a metronome doesn't
const DEMO_BEATS_MS = [5200, 6800, 4600, 7400, 5900];
const ITEM_SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deltaToItems(event: ArenaFeedEvent, t: (key: any, values?: any) => string): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const delta of event.deltas) {
    const kind = delta.kind ?? "rank";
    const base = { agentId: delta.agentId, timestamp: event.timestamp };
    const id = `${event.timestamp}-${delta.agentId}-${kind}`;

    if (kind === "trade_won" || kind === "trade_lost") {
      const values = { name: delta.name, pnl: fmtUSDC(Math.abs(delta.pnl ?? 0)), market: delta.market ?? "" };
      items.push({
        ...base,
        id,
        emoji: delta.avatarEmoji || "💱",
        text: t(kind === "trade_won" ? "feedTradeWon" : "feedTradeLost", values),
        tone: kind === "trade_won" ? "win" : "loss",
      });
      continue;
    }

    if (kind === "streak") {
      const streak = delta.streak ?? 0;
      if (streak === 0) continue;
      items.push({
        ...base,
        id,
        emoji: delta.avatarEmoji || "🔥",
        text: t(streak > 0 ? "feedStreakWin" : "feedStreakLoss", { name: delta.name, count: Math.abs(streak) }),
        tone: streak > 0 ? "streak" : "loss",
      });
      continue;
    }

    if (delta.rankChange === 0) continue;

    if (delta.currentRank === 1 && delta.rankChange > 0) {
      items.push({
        ...base,
        id,
        emoji: delta.avatarEmoji || "🏆",
        text: t("crownClaimed", { name: delta.name }),
        tone: "crown",
      });
    } else if (delta.rankChange > 0) {
      const from = delta.previousRank ?? "?";
      items.push({
        ...base,
        id,
        emoji: delta.avatarEmoji || "📈",
        text: t("rankClimbed", { name: delta.name, from: String(from), to: String(delta.currentRank) }),
        tone: "climb",
      });
    } else {
      items.push({
        ...base,
        id,
        emoji: delta.avatarEmoji || "📉",
        text: t("rankDropped", { name: delta.name, rank: String(delta.currentRank) }),
        tone: "drop",
      });
    }
  }
  return items;
}

function seedItems(t: Parameters<typeof deltaToItems>[1]): ActivityItem[] {
  return demoArenaFeedSeed(Date.now()).flatMap((event) => deltaToItems(event, t)).reverse().slice(0, MAX_ITEMS);
}

export function LiveActivityFeed() {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const viewer = useViewer();
  const { scripted, live } = arenaFeedSources(viewer.mode);
  const reducedMotion = useReducedMotion();
  const now = useNow(10_000);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [followingOnly, setFollowingOnly] = useState(false);
  const { followed } = useFollowedAgents();

  const push = useCallback((event: ArenaFeedEvent) => {
    const newItems = deltaToItems(event, t);
    if (newItems.length === 0) return;
    setItems((prev) => [...newItems, ...prev].slice(0, MAX_ITEMS));
  }, [t]);

  // Whenever the viewer changes, the feed starts over: guests open on a few
  // recent beats of the sample arena, anyone else never keeps a sample beat
  useEffect(() => {
    setItems(scripted ? seedItems(t) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a viewer change reseeds
  }, [scripted]);

  // Live arena events; guests see the sample arena, so real names stay out of it
  const handler = useCallback((event: ArenaFeedEvent) => {
    if (!live) return;
    push(event);
  }, [live, push]);

  useSocketEvent("arena:leaderboard_delta", handler);

  // Sample arena: keep new beats coming while the page is open
  useEffect(() => {
    if (!scripted) return;
    let step = DEMO_ARENA_FEED_SEED_SIZE;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        push(demoArenaFeedEvent(step, Date.now()));
        step += 1;
        schedule();
      }, DEMO_BEATS_MS[step % DEMO_BEATS_MS.length]);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [scripted, push]);

  const visibleItems = followingOnly && followed.size > 0
    ? items.filter((item) => followed.has(item.agentId))
    : items;

  if (items.length === 0) return null;

  return (
    <div className="arena-feed">
      <div className="arena-feed-header">
        <span className="arena-section-kicker arena-feed-kicker">
          <span className="arena-feed-live" aria-hidden="true" />
          {t("liveActivity")}
        </span>
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
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <motion.div
              key={item.id}
              layout={!reducedMotion}
              initial={reducedMotion ? false : { opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
              transition={reducedMotion ? { duration: 0 } : { ...ITEM_SPRING, opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
              className={`arena-feed-item arena-feed-item--${item.tone}`}
            >
              <span className="arena-feed-emoji">{item.emoji}</span>
              <span className="arena-feed-text">{item.text}</span>
              <time className="arena-feed-time" dateTime={new Date(item.timestamp).toISOString()}>
                {formatRelativeTime(item.timestamp, Math.max(now, item.timestamp), tCommon)}
              </time>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
