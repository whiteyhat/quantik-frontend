import type { ArenaLeaderboardEntry, ArenaViewerContext, ArenaWindow } from "@/lib/api";
import { fmtCompact, fmtUSDC } from "@/lib/api";

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

export function buildWindowHref(pathname: string, searchParams: URLSearchParams | ReadonlyURLSearchParamsLike, window: ArenaWindow) {
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

export interface ReadonlyURLSearchParamsLike {
  toString(): string;
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
