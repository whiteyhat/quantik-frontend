import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setDemoMode, type ArenaWindow } from "@/lib/api";
import { DEMO_AGENT_ID } from "@/lib/demo/agent";
import { demoPositions, demoSummary } from "@/lib/demo/portfolio";
import { resolveDemoGet } from "@/lib/demo/routes";
import {
  demoArenaFeedEvent,
  demoArenaFeedSeed,
  isDemoArenaCode,
} from "@/lib/demo/arena";

const WINDOWS: ArenaWindow[] = ["day", "week", "all"];
const NOW = new Date("2026-09-23T15:00:00Z").getTime();
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => {
    throw new Error("the arena demo must never hit the network");
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setDemoMode("off");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("guest arena leaderboard", () => {
  beforeEach(() => setDemoMode("guest"));

  it.each(WINDOWS)("serves a full, normalized board for the %s window", async (window) => {
    const board = await api.getArenaLeaderboard(window);
    expect(board.window).toBe(window);
    expect(board.leaders.length).toBeGreaterThanOrEqual(12);
    expect(board.leaders.map((e) => e.rank)).toEqual(board.leaders.map((_, i) => i + 1));
    expect(board.meta.rankedAgents).toBe(board.leaders.length);
    expect(board.meta.activeAgents).toBeGreaterThanOrEqual(board.leaders.length);

    // Sorted the way the backend sorts: selected P&L, highest first
    const pnls = board.leaders.map((e) => e.selectedPnl);
    expect([...pnls].sort((a, b) => b - a)).toEqual(pnls);

    // Unique identities, demo-prefixed codes
    expect(new Set(board.leaders.map((e) => e.agentId)).size).toBe(board.leaders.length);
    expect(board.leaders.every((e) => isDemoArenaCode(e.agentCode))).toBe(true);

    // The guest's own contender is NOVA-7, ranked, with backend-style gaps
    const viewer = board.viewer;
    expect(viewer.entry?.name).toBe("NOVA-7");
    expect(viewer.agentId).toBe(DEMO_AGENT_ID);
    expect(viewer.eligible).toBe(true);
    expect(viewer.ranked).toBe(true);
    expect(viewer.reason).toBe("ranked");
    expect(board.leaders[viewer.rank! - 1].agentId).toBe(DEMO_AGENT_ID);
    const gap = (rank: number) => Math.max(0, Math.round((board.leaders[rank - 1].selectedPnl - viewer.referencePnl) * 100) / 100);
    expect(viewer.gapToCrown).toBe(gap(1));
    expect(viewer.gapToPodium).toBe(gap(3));
    expect(viewer.gapToTop10).toBe(gap(10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks like a real season: a spread of win rates, streaks and a few agents in the red", async () => {
    const board = await api.getArenaLeaderboard("all");
    const winRates = board.leaders.map((e) => e.winRate);
    expect(Math.min(...winRates)).toBeGreaterThanOrEqual(38);
    expect(Math.max(...winRates)).toBeLessThanOrEqual(71);
    expect(board.leaders.filter((e) => e.selectedPnl < 0).length).toBeGreaterThanOrEqual(2);
    expect(board.leaders.some((e) => e.currentStreak < 0)).toBe(true);
    for (const e of board.leaders) {
      expect(e.heat).toBeGreaterThanOrEqual(0);
      expect(e.heat).toBeLessThanOrEqual(1);
      expect(e.marketBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(e.badges.some((b) => b.id === "market_maker")).toBe(e.totalTrades >= 50);
      expect(e.badges.some((b) => b.id === "streak_master")).toBe(Math.abs(e.currentStreak) >= 10);
      expect(e.openPositions).toBeLessThanOrEqual(e.totalTrades);
      expect(e.lastTradeAt).toBeLessThanOrEqual(NOW);
    }
    // Only the best single trade of the window earns Diamond Hands
    const diamond = board.leaders.filter((e) => e.badges.some((b) => b.id === "diamond_hands"));
    expect(diamond).toHaveLength(1);
    expect(diamond[0].bestTradePnl).toBe(Math.max(...board.leaders.map((e) => e.bestTradePnl)));
  });

  it("keeps windows consistent: all-time pool > week pool > day pool", async () => {
    const [day, week, all] = await Promise.all(WINDOWS.map((w) => api.getArenaLeaderboard(w)));
    const pool = (b: typeof day) => Math.abs(b.meta.totalSelectedPnlPool);
    expect(pool(all)).toBeGreaterThan(pool(week));
    expect(pool(week)).toBeGreaterThan(pool(day));
    // Ranks shuffle a little between windows
    const order = (b: typeof day) => b.leaders.map((e) => e.agentId).join();
    expect(order(day)).not.toBe(order(all));
    expect(order(week)).not.toBe(order(all));
    // Lifetime stats do not depend on the window
    const byId = new Map(all.leaders.map((e) => [e.agentId, e]));
    for (const e of day.leaders) {
      expect(e.allTimePnl).toBe(byId.get(e.agentId)!.allTimePnl);
      expect(e.totalTrades).toBe(byId.get(e.agentId)!.totalTrades);
    }
  });

  it("matches NOVA-7's numbers on the guest dashboard", async () => {
    const summary = demoSummary();
    const [day, all] = await Promise.all([api.getArenaLeaderboard("day"), api.getArenaLeaderboard("all")]);
    const nova = all.viewer.entry!;
    expect(nova.allTimePnl).toBe(summary.pnl);
    expect(nova.totalTrades).toBe(summary.totalTrades);
    expect(nova.winRate).toBeCloseTo((summary.winRate as number) * 100, 5);
    expect(nova.currentStreak).toBe((summary.metrics as { currentStreak: number }).currentStreak);
    expect(nova.openPositions).toBe(demoPositions().length);
    expect(day.viewer.entry!.selectedPnl).toBe(summary.pnlToday);
    expect(all.viewer.rank).toBeGreaterThanOrEqual(4);
    expect(all.viewer.rank).toBeLessThanOrEqual(6);
  });

  it("is deterministic for a fixed clock", async () => {
    for (const window of WINDOWS) {
      expect(await api.getArenaLeaderboard(window)).toEqual(await api.getArenaLeaderboard(window));
    }
    const leader = (await api.getArenaLeaderboard("all")).leaders[0];
    expect(await api.getArenaAgentHistory(leader.agentId, "week")).toEqual(await api.getArenaAgentHistory(leader.agentId, "week"));
  });
});

describe("guest arena detail reads", () => {
  beforeEach(() => setDemoMode("guest"));

  it("serves public profiles for demo agents", async () => {
    const board = await api.getArenaLeaderboard("all");
    const champion = board.leaders[0];
    const profile = await api.getPublicAgentProfile(champion.agentCode);
    expect(profile).not.toBeNull();
    expect(profile!.name).toBe(champion.name);
    expect(profile!.rank).toBe(1);
    expect(profile!.allTimePnl).toBe(champion.allTimePnl);
    expect(profile!.sparkline.length).toBeGreaterThanOrEqual(24);
    expect(profile!.sparkline.at(-1)!.pnl).toBe(champion.allTimePnl);
    expect(profile!.needsSetup).toBe(false);

    const nova = await api.getPublicAgentProfile("Q-DEMO-NOVA7");
    expect(nova?.name).toBe("NOVA-7");
    expect(await api.getPublicAgentProfile("Q-AGENT-X123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(WINDOWS)("serves %s history that ends at the agent's current number", async (window) => {
    const board = await api.getArenaLeaderboard(window);
    for (const entry of [board.leaders[0], board.viewer.entry!, board.leaders.at(-1)!]) {
      const history = await api.getArenaAgentHistory(entry.agentId, window);
      expect(history.length).toBeGreaterThanOrEqual(12);
      const last = history.at(-1)!;
      expect(last.pnl).toBe(entry.selectedPnl);
      expect(last.rank).toBe(entry.rank);
      const times = history.map((p) => p.timestamp);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(last.timestamp).toBeLessThanOrEqual(NOW);
    }
    expect(await api.getArenaAgentHistory("not-a-demo-agent", window)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("compares two demo agents", async () => {
    const board = await api.getArenaLeaderboard("week");
    const [a, b] = [board.viewer.entry!, board.leaders[0]];
    const result = await api.getArenaComparison(a.agentId, b.agentId, "week");
    expect(result?.window).toBe("week");
    expect(result?.agents.map((x) => x.name)).toEqual([a.name, b.name]);
    expect(result?.agents[1].rank).toBe(1);
    expect(result?.agents[0].selectedPnl).toBe(a.selectedPnl);
    expect(result?.agents[0].sparkline.length).toBeGreaterThanOrEqual(12);
    expect(await api.getArenaComparison("nobody", "no-one", "week")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("members keep the live arena", () => {
  it.each([
    "/api/performance/arena",
    "/api/performance/arena?window=day",
    "/api/performance/arena/compare?a1=x&a2=y&window=all",
    "/api/performance/arena/agent/Q-DEMO-NOVA7",
    "/api/performance/arena/demo-nova-7/history?window=week",
  ])("no-agent mode sends %s to the server", (path) => {
    expect(resolveDemoGet(path, "no-agent")).toBeUndefined();
    expect(resolveDemoGet(path, "guest")).not.toBeUndefined();
  });
});

describe("live arena feed for guests", () => {
  it("seeds a handful of recent events so the feed is never empty", () => {
    const seed = demoArenaFeedSeed(NOW);
    expect(seed.length).toBeGreaterThanOrEqual(4);
    expect(seed.every((event) => event.timestamp < NOW)).toBe(true);
    expect(seed.every((event) => event.deltas.length > 0)).toBe(true);
  });

  it("cycles deterministically through trades, rank moves and streaks", () => {
    const events = Array.from({ length: 24 }, (_, step) => demoArenaFeedEvent(step, NOW + step * 5_000));
    expect(events).toEqual(Array.from({ length: 24 }, (_, step) => demoArenaFeedEvent(step, NOW + step * 5_000)));
    const kinds = new Set<string>(events.flatMap((e) => e.deltas.map((d) => d.kind ?? "rank")));
    for (const kind of ["rank", "trade_won", "trade_lost", "streak"]) expect(kinds.has(kind)).toBe(true);
    expect(new Set(events.flatMap((e) => e.deltas.map((d) => d.agentId))).size).toBeGreaterThanOrEqual(8);
    for (const event of events) {
      for (const delta of event.deltas) {
        expect(delta.name.length).toBeGreaterThan(0);
        expect(delta.avatarEmoji.length).toBeGreaterThan(0);
        if ((delta.kind ?? "rank") === "rank") expect(delta.rankChange).not.toBe(0);
      }
    }
  });
});

describe("live arena feed after the first pass", () => {
  it("never replays rank moves once the script has run through", async () => {
    const { DEMO_ARENA_FEED_SCRIPT_LENGTH } = await import("@/lib/demo/arena");
    const firstPass = Array.from({ length: DEMO_ARENA_FEED_SCRIPT_LENGTH }, (_, step) => demoArenaFeedEvent(step, NOW));
    expect(firstPass.some((e) => e.deltas.some((d) => (d.kind ?? "rank") === "rank"))).toBe(true);
    for (let step = DEMO_ARENA_FEED_SCRIPT_LENGTH; step < DEMO_ARENA_FEED_SCRIPT_LENGTH * 3; step++) {
      for (const delta of demoArenaFeedEvent(step, NOW).deltas) {
        expect(delta.kind ?? "rank", `step ${step}`).not.toBe("rank");
        expect(delta.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("varies trade amounts on later passes so the loop is not obvious", async () => {
    const { DEMO_ARENA_FEED_SCRIPT_LENGTH: n } = await import("@/lib/demo/arena");
    const trades = (pass: number) =>
      Array.from({ length: n }, (_, i) => demoArenaFeedEvent(pass * n + i, NOW).deltas[0])
        .filter((d) => d.kind === "trade_won" || d.kind === "trade_lost")
        .map((d) => d.pnl);
    const [first, second, third] = [trades(0), trades(1), trades(2)];
    expect(second).not.toEqual(first);
    expect(third).not.toEqual(second);
    // Deterministic per step, and wins stay wins
    expect(trades(1)).toEqual(second);
    for (let step = n; step < n * 2; step++) {
      const d = demoArenaFeedEvent(step, NOW).deltas[0];
      if (d.kind === "trade_won") expect(d.pnl!).toBeGreaterThan(0);
      if (d.kind === "trade_lost") expect(d.pnl!).toBeLessThan(0);
    }
  });
});

describe("best-trade markets in the sample arena", () => {
  beforeEach(() => setDemoMode("guest"));

  it.each(WINDOWS)("every %s best trade has a real market question on the board", async (window) => {
    const { marketQuestion, humanizeMarketSlug } = await import("@/components/arena/arenaHelpers");
    const board = await api.getArenaLeaderboard(window);
    for (const e of board.leaders) {
      if (!e.bestTradeSlug) continue;
      const label = marketQuestion(e.bestTradeSlug, board.leaders);
      expect(label, e.name).not.toBe(humanizeMarketSlug(e.bestTradeSlug));
      expect(label).toMatch(/\?$/);
    }
  });
});
