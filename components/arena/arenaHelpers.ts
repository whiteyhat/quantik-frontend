import type { ArenaLeaderboardEntry, ArenaMarketBreakdown, ArenaViewerContext, ArenaWindow } from "@/lib/api";
import { fmtCompact, fmtUSDC } from "@/lib/api";
import type { ViewerMode } from "@/lib/viewer";

export const ARENA_WINDOW_OPTIONS: Array<{
  value: ArenaWindow;
  label: "tab24h" | "tab7d" | "tabAllTime";
  rulesKey: "rules24h" | "rules7d" | "rulesAll";
  protocolKey: "protocol24h" | "protocol7d" | "protocolAll";
}> = [
  { value: "day", label: "tab24h", rulesKey: "rules24h", protocolKey: "protocol24h" },
  { value: "week", label: "tab7d", rulesKey: "rules7d", protocolKey: "protocol7d" },
  { value: "all", label: "tabAllTime", rulesKey: "rulesAll", protocolKey: "protocolAll" },
];

export function formatSignedCurrency(value: number) {
  const absolute = fmtUSDC(Math.abs(value));
  if (value > 0) return `+${absolute}`;
  if (value < 0) return `-${absolute}`;
  return absolute;
}

export function formatSignedCompact(value: number) {
  const absolute = fmtCompact(Math.abs(value));
  if (value > 0) return `+${absolute}`;
  if (value < 0) return `-${absolute}`;
  return absolute;
}

export function battleTone(value: number) {
  if (value > 0) return "good" as const;
  if (value < 0) return "bad" as const;
  return "neutral" as const;
}

export function streakLabel(streak: number) {
  if (streak > 0) return `${streak}W`;
  if (streak < 0) return `${Math.abs(streak)}L`;
  return "0";
}

export function isOpenClawAgent(agentType: string | null | undefined) {
  const normalized = String(agentType ?? "").trim().toLowerCase();
  return normalized === "byo" || normalized.includes("openclaw");
}

export function buildWindowHref(pathname: string, searchParams: URLSearchParams, window: ArenaWindow) {
  const params = new URLSearchParams(searchParams.toString());
  if (window === "all") params.delete("window");
  else params.set("window", window);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function progressPercent(gap: number, crownGap: number) {
  if (crownGap <= 0) return 100;
  const value = 100 - Math.min(100, (gap / crownGap) * 100);
  return Math.max(0, Math.min(100, value));
}

export function protocolKeys(window: ArenaWindow) {
  const item = ARENA_WINDOW_OPTIONS.find((option) => option.value === window) ?? ARENA_WINDOW_OPTIONS[2];
  return { rulesKey: item.rulesKey, protocolKey: item.protocolKey, label: item.label };
}

export function matchArenaLeader(entry: ArenaLeaderboardEntry, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry.name,
    entry.agentCode,
    entry.connectionStatus ?? "",
    entry.agentType,
    entry.animalType ?? "",
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function filterArenaLeaders(
  leaders: ArenaLeaderboardEntry[],
  {
    query,
    viewerFocus,
    viewer,
    followingFocus,
    followedIds,
  }: {
    query: string;
    viewerFocus: boolean;
    viewer?: ArenaViewerContext;
    followingFocus?: boolean;
    followedIds?: Set<string>;
  },
) {
  let filtered = leaders.filter((entry) => matchArenaLeader(entry, query));

  if (followingFocus && followedIds && followedIds.size > 0) {
    filtered = filtered.filter((entry) => followedIds.has(entry.agentId));
  }

  if (viewerFocus && viewer?.ranked && viewer.rank) {
    const nearbyRanks = new Set([1, 2, 3, viewer.rank - 2, viewer.rank - 1, viewer.rank, viewer.rank + 1, viewer.rank + 2]);
    filtered = filtered.filter((entry) => nearbyRanks.has(entry.rank));
  }

  return filtered;
}

export function findNextRival(leaders: ArenaLeaderboardEntry[], viewer?: ArenaViewerContext | null) {
  if (leaders.length === 0) return null;
  const viewerRank = viewer?.rank ?? null;
  if (viewer?.ranked && viewerRank) {
    if (viewerRank <= 1) return leaders[1] ?? null;
    return leaders.find((entry) => entry.rank === viewerRank - 1) ?? null;
  }
  return leaders[Math.min(9, leaders.length - 1)] ?? null;
}

export function podiumLabel(rank: number, labels: {
  topPerformer: string;
  runnerUp: string;
  thirdPlace: string;
}) {
  if (rank === 1) return labels.topPerformer;
  if (rank === 2) return labels.runnerUp;
  return labels.thirdPlace;
}

export function contenderReasonCopy(
  reason: ArenaViewerContext["reason"],
  labels: {
    viewerInactive: string;
    viewerNoActivity: string;
    viewerRanked: string;
    viewerNoAgent: string;
  },
) {
  if (reason === "inactive") return labels.viewerInactive;
  if (reason === "no_activity") return labels.viewerNoActivity;
  if (reason === "ranked") return labels.viewerRanked;
  return labels.viewerNoAgent;
}

export function contenderEyebrow(reason: ArenaViewerContext["reason"], labels: {
  dockRankedEyebrow: string;
  dockClimbEyebrow: string;
  dockOpenEyebrow: string;
}) {
  if (reason === "ranked") return labels.dockRankedEyebrow;
  if (reason === "no_agent") return labels.dockOpenEyebrow;
  return labels.dockClimbEyebrow;
}

export function contenderDetailCopy(reason: ArenaViewerContext["reason"], labels: {
  dockRankedDetail: string;
  dockInactiveDetail: string;
  dockNoActivityDetail: string;
  dockNoAgentDetail: string;
}) {
  if (reason === "ranked") return labels.dockRankedDetail;
  if (reason === "inactive") return labels.dockInactiveDetail;
  if (reason === "no_activity") return labels.dockNoActivityDetail;
  return labels.dockNoAgentDetail;
}

export function qualifierLabel(viewer: ArenaViewerContext | undefined, labels: {
  qualifierReady: string;
  qualifierLocked: string;
  qualifierMissing: string;
}) {
  if (!viewer || viewer.reason === "no_agent") return labels.qualifierMissing;
  if (viewer.eligible) return labels.qualifierReady;
  return labels.qualifierLocked;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Lane sparkline: a running total of per-market P&L. The breakdown arrives
 * sorted by |P&L| (largest first), so it is replayed smallest-first: winners
 * climb into their total, losers end below zero.
 */
export function cumulativePnlSeries(breakdown: Array<Pick<ArenaMarketBreakdown, "pnl">>): number[] {
  const series = [0];
  for (let i = breakdown.length - 1; i >= 0; i--) {
    series.push(round2(series[series.length - 1] + breakdown[i].pnl));
  }
  return series;
}

/** A sparkline is green when it ends at or above zero. */
export function sparklineTrend(values: number[]): "up" | "down" {
  const last = values.length > 0 ? values[values.length - 1] : 0;
  return last >= 0 ? "up" : "down";
}

/** "will-btc-close-above-150k" -> "Will btc close above 150k" (last resort only). */
export function humanizeMarketSlug(slug: string): string {
  const words = slug.split(/[-_]+/).filter(Boolean).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : slug;
}

/** The market question for a slug, looked up in the board's market breakdowns. */
export function marketQuestion(slug: string | null | undefined, leaders: ArenaLeaderboardEntry[]): string | null {
  if (!slug) return null;
  for (const entry of leaders) {
    const found: ArenaMarketBreakdown | undefined = entry.marketBreakdown.find((m) => m.slug === slug);
    if (found?.question && found.question !== slug) return found.question;
  }
  return humanizeMarketSlug(slug);
}

/** The champion's lead over the runner-up, rounded to cents. */
export function championLead(leaders: ArenaLeaderboardEntry[]): { name: string; gap: number } | null {
  const [champion, runnerUp] = leaders;
  if (!champion || !runnerUp) return null;
  return { name: runnerUp.name, gap: round2(champion.selectedPnl - runnerUp.selectedPnl) };
}

/** The agent that gained the most places since the last snapshot (ties: better rank). */
export function biggestClimber(leaders: ArenaLeaderboardEntry[]): ArenaLeaderboardEntry | null {
  let best: ArenaLeaderboardEntry | null = null;
  for (const entry of leaders) {
    const climb = entry.rankChange ?? 0;
    if (climb <= 0) continue;
    const bestClimb = best?.rankChange ?? 0;
    if (!best || climb > bestClimb || (climb === bestClimb && entry.rank < best.rank)) best = entry;
  }
  return best;
}

/** The agent with the most trades. */
export function mostActive(leaders: ArenaLeaderboardEntry[]): ArenaLeaderboardEntry | null {
  return leaders.reduce<ArenaLeaderboardEntry | null>((best, entry) => (!best || entry.totalTrades > best.totalTrades ? entry : best), null);
}

/**
 * Which feed a viewer may see. Guests watch the scripted sample season and
 * never real socket events (real names stay out of the showcase); members only
 * ever see real events; nobody sees anything until the viewer is known.
 */
export function arenaFeedSources(mode: ViewerMode): { scripted: boolean; live: boolean } {
  if (mode === "guest") return { scripted: true, live: false };
  if (mode === "member" || mode === "member-no-agent") return { scripted: false, live: true };
  return { scripted: false, live: false };
}

/** Sample-arena agents (demo-…) only exist for guests. */
export const DEMO_FOLLOW_PREFIX = "demo-";

export function followIdsForViewer(ids: Iterable<string>, mode: ViewerMode): Set<string> {
  const all = [...ids];
  if (mode === "guest") return new Set(all);
  return new Set(all.filter((id) => !id.startsWith(DEMO_FOLLOW_PREFIX)));
}
