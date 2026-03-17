import { describe, expect, it } from "vitest";
import type { ArenaLeaderboardEntry, ArenaViewerContext } from "../../lib/api";
import {
  buildWindowHref,
  filterArenaLeaders,
  findNextRival,
  progressPercent,
} from "../../components/arena/arenaHelpers";

function makeEntry(overrides: Partial<ArenaLeaderboardEntry> = {}): ArenaLeaderboardEntry {
  return {
    rank: 1,
    agentId: "agent-1",
    agentCode: "ALPHA-1",
    name: "Alpha One",
    avatarEmoji: "🤖",
    animalType: "hawk",
    agentType: "momentum",
    connectionStatus: "connected",
    autopilotEnabled: true,
    polymarketReady: true,
    selectedPnl: 1200,
    selectedRealizedPnl: 900,
    selectedUnrealizedPnl: 300,
    allTimePnl: 4200,
    totalTrades: 24,
    winRate: 61.5,
    openPositions: 2,
    currentStreak: 3,
    lastTradeAt: 1_710_000_000_000,
    bestTradeSlug: "alpha-breakout",
    bestTradePnl: 420,
    rankChange: null,
    marketBreakdown: [],
    badges: [],
    heat: 0,
    dna: { volume: 0.5, diversity: 0.5, speed: 0.5, streak: 0.5, riskAppetite: 0.5, timing: 0.5 },
    ...overrides,
  };
}

function makeViewer(overrides: Partial<ArenaViewerContext> = {}): ArenaViewerContext {
  return {
    agentId: "agent-8",
    eligible: true,
    ranked: true,
    rank: 8,
    entry: null,
    referencePnl: 200,
    gapToTop10: 50,
    gapToPodium: 800,
    gapToCrown: 1_500,
    reason: "ranked",
    ...overrides,
  };
}

describe("arena helpers", () => {
  it("builds bracket links while preserving unrelated query params", () => {
    expect(buildWindowHref("/en/arena", new URLSearchParams("foo=bar"), "week")).toBe("/en/arena?foo=bar&window=week");
    expect(buildWindowHref("/en/arena", new URLSearchParams("foo=bar&window=week"), "all")).toBe("/en/arena?foo=bar");
  });

  it("clamps progress percentages for lock-on bars", () => {
    expect(progressPercent(0, 200)).toBe(100);
    expect(progressPercent(100, 200)).toBe(50);
    expect(progressPercent(300, 200)).toBe(0);
    expect(progressPercent(10, 0)).toBe(100);
  });

  it("filters by query and keeps nearby ranks when viewer focus is active", () => {
    const leaders = [
      makeEntry({ rank: 1, agentId: "agent-1", name: "Alpha One", agentCode: "ALPHA-1" }),
      makeEntry({ rank: 2, agentId: "agent-2", name: "Beta Two", agentCode: "BETA-2" }),
      makeEntry({ rank: 5, agentId: "agent-5", name: "Gamma Five", agentCode: "GAMMA-5" }),
      makeEntry({ rank: 7, agentId: "agent-7", name: "Viewer Target", agentCode: "VIEW-7" }),
      makeEntry({ rank: 8, agentId: "agent-8", name: "Viewer Agent", agentCode: "VIEWER-8" }),
      makeEntry({ rank: 9, agentId: "agent-9", name: "Delta Nine", agentCode: "DELTA-9" }),
      makeEntry({ rank: 10, agentId: "agent-10", name: "Epsilon Ten", agentCode: "EPS-10" }),
      makeEntry({ rank: 14, agentId: "agent-14", name: "Far Away", agentCode: "FAR-14" }),
    ];

    const focused = filterArenaLeaders(leaders, {
      query: "view",
      viewerFocus: true,
      viewer: makeViewer(),
    });

    expect(focused.map((entry) => entry.rank)).toEqual([7, 8]);
  });

  it("returns the matched list unchanged when viewer focus is unavailable", () => {
    const leaders = [
      makeEntry({ rank: 4, agentId: "agent-4", name: "Manual Falcon", agentCode: "FALCON-4" }),
      makeEntry({ rank: 11, agentId: "agent-11", name: "Arena Wolf", agentCode: "WOLF-11" }),
    ];

    const result = filterArenaLeaders(leaders, {
      query: "wolf",
      viewerFocus: true,
      viewer: makeViewer({ ranked: false, rank: null, reason: "no_activity" }),
    });

    expect(result).toEqual([leaders[1]]);
  });

  it("finds the next rival above a ranked viewer or the top-10 cutoff for unranked viewers", () => {
    const leaders = Array.from({ length: 12 }, (_, index) =>
      makeEntry({
        rank: index + 1,
        agentId: `agent-${index + 1}`,
        name: `Agent ${index + 1}`,
        agentCode: `AGENT-${index + 1}`,
        selectedPnl: 2_000 - index * 100,
      }),
    );

    expect(findNextRival(leaders, makeViewer({ rank: 5 }))?.rank).toBe(4);
    expect(findNextRival(leaders, makeViewer({ ranked: false, rank: null, reason: "no_activity" }))?.rank).toBe(10);
    expect(findNextRival(leaders.slice(0, 1), makeViewer({ rank: 1 }))).toBeNull();
  });
});
