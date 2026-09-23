import { describe, expect, it } from "vitest";
import type { ArenaLeaderboardEntry } from "../../lib/api";
import {
  arenaFeedSources,
  biggestClimber,
  championLead,
  cumulativePnlSeries,
  followIdsForViewer,
  humanizeMarketSlug,
  marketQuestion,
  mostActive,
  sparklineTrend,
} from "../../components/arena/arenaHelpers";

function entry(overrides: Partial<ArenaLeaderboardEntry> = {}): ArenaLeaderboardEntry {
  return {
    rank: 1,
    agentId: "agent-1",
    agentCode: "ALPHA-1",
    name: "Alpha One",
    avatarEmoji: "🤖",
    animalType: "hawk",
    agentType: "created",
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
    bestTradeSlug: null,
    bestTradePnl: 0,
    rankChange: null,
    marketBreakdown: [],
    badges: [],
    heat: 0,
    dna: { volume: 0.5, diversity: 0.5, speed: 0.5, streak: 0.5, riskAppetite: 0.5, timing: 0.5 },
    ...overrides,
  };
}

const market = (slug: string, pnl: number, question = "") => ({ slug, question, pnl, trades: 1, winRate: 50, openPositions: 0 });

describe("lane sparkline", () => {
  it("plots a running total that ends on the agent's net result", () => {
    // Backend order: largest |P&L| first
    const series = cumulativePnlSeries([market("a", 500), market("b", -120), market("c", 40)]);
    expect(series[0]).toBe(0);
    expect(series).toHaveLength(4);
    expect(series.at(-1)).toBe(420);
    // Smallest moves first, the biggest one last: a winner climbs into its total
    expect(series).toEqual([0, 40, -80, 420]);
    expect(sparklineTrend(series)).toBe("up");
  });

  it("ends below zero, in red, for a losing agent", () => {
    const series = cumulativePnlSeries([market("a", -300), market("b", 80), market("c", -20)]);
    expect(series.at(-1)).toBe(-240);
    expect(sparklineTrend(series)).toBe("down");
  });

  it("colours by the final value, not by first-versus-last", () => {
    expect(sparklineTrend([50, 80, 10])).toBe("up");
    expect(sparklineTrend([-50, -80, -10])).toBe("down");
    expect(sparklineTrend([0])).toBe("up");
    expect(sparklineTrend([])).toBe("up");
  });

  it("avoids floating point noise in the running total", () => {
    expect(cumulativePnlSeries([market("a", 0.2), market("b", 0.1)]).at(-1)).toBe(0.3);
  });
});

describe("market labels", () => {
  it("uses the market question from any agent's breakdown", () => {
    const leaders = [
      entry({ marketBreakdown: [market("fed-cut-december", 10, "Will the Fed cut in December?")] }),
      entry({ agentId: "agent-2", marketBreakdown: [market("btc-150k", 5, "Will BTC close above $150k?")] }),
    ];
    expect(marketQuestion("btc-150k", leaders)).toBe("Will BTC close above $150k?");
    expect(marketQuestion(null, leaders)).toBeNull();
  });

  it("never shows a raw slug: falls back to a readable label", () => {
    expect(marketQuestion("will-btc-close-above-150k-in-2026", [])).toBe("Will btc close above 150k in 2026");
    expect(humanizeMarketSlug("fed-cut-december")).toBe("Fed cut december");
    expect(humanizeMarketSlug("eth_etf__staking")).toBe("Eth etf staking");
    // A question equal to its own slug is not a real question
    const leaders = [entry({ marketBreakdown: [market("oil-above-90", 1, "oil-above-90")] })];
    expect(marketQuestion("oil-above-90", leaders)).toBe("Oil above 90");
  });
});

describe("podium and telemetry picks", () => {
  const leaders = [
    entry({ rank: 1, agentId: "a", name: "VEX-9", selectedPnl: 2146.8, totalTrades: 188, rankChange: 0 }),
    entry({ rank: 2, agentId: "b", name: "KESTREL-4", selectedPnl: 1318.6, totalTrades: 142, rankChange: 1 }),
    entry({ rank: 3, agentId: "c", name: "ORION-X", selectedPnl: 1276.25, totalTrades: 97, rankChange: -1 }),
    entry({ rank: 4, agentId: "d", name: "RONIN-12", selectedPnl: 398.15, totalTrades: 211, rankChange: 3 }),
  ];

  it("states the champion's lead over the runner-up", () => {
    expect(championLead(leaders)).toEqual({ name: "KESTREL-4", gap: 828.2 });
    expect(championLead(leaders.slice(0, 1))).toBeNull();
    expect(championLead([])).toBeNull();
  });

  it("finds the biggest climber, or nobody when no one climbed", () => {
    expect(biggestClimber(leaders)?.name).toBe("RONIN-12");
    expect(biggestClimber(leaders.map((e) => ({ ...e, rankChange: e.rankChange && e.rankChange > 0 ? 0 : e.rankChange })))).toBeNull();
    // Ties go to the better-ranked agent
    expect(biggestClimber([entry({ rank: 5, agentId: "x", rankChange: 2 }), entry({ rank: 3, agentId: "y", rankChange: 2 })])?.agentId).toBe("y");
  });

  it("finds the most active agent", () => {
    expect(mostActive(leaders)?.name).toBe("RONIN-12");
    expect(mostActive([])).toBeNull();
  });
});

describe("live feed sources per viewer", () => {
  it("guests watch the scripted sample season and ignore real socket events", () => {
    expect(arenaFeedSources("guest")).toEqual({ scripted: true, live: false });
  });

  it("members, with or without an agent, only ever see real events", () => {
    expect(arenaFeedSources("member")).toEqual({ scripted: false, live: true });
    expect(arenaFeedSources("member-no-agent")).toEqual({ scripted: false, live: true });
  });

  it("shows nothing until the viewer is known", () => {
    expect(arenaFeedSources("loading")).toEqual({ scripted: false, live: false });
  });
});

describe("followed agents per viewer", () => {
  const stored = ["demo-arena-vex-9", "demo-nova-7", "real-agent-42"];

  it("guests keep following sample agents", () => {
    expect([...followIdsForViewer(stored, "guest")]).toEqual(stored);
  });

  it("everyone else ignores sample-agent ids", () => {
    for (const mode of ["member", "member-no-agent", "loading"] as const) {
      expect([...followIdsForViewer(stored, mode)]).toEqual(["real-agent-42"]);
    }
  });
});
