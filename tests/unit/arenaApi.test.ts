import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken } from "../../lib/api";

function buildArenaResponse() {
  return {
    window: "all",
    updatedAt: 1_763_030_400_000,
    meta: {
      rankedAgents: 2,
      activeAgents: 3,
      totalSelectedPnlPool: 1842.14,
      totalRealizedPnlPool: 1520.88,
      totalUnrealizedPnlPool: 321.26,
      lastTradeAt: 1_763_030_340_000,
    },
    leaders: [
      {
        rank: 1,
        agentId: "agent-crown",
        agentCode: "Q-AGENT-X101",
        name: "Signal Scout",
        avatarEmoji: "🦊",
        animalType: "fox",
        agentType: "quantik",
        connectionStatus: "connected",
        autopilotEnabled: true,
        polymarketReady: true,
        selectedPnl: 1240.55,
        selectedRealizedPnl: 920.55,
        selectedUnrealizedPnl: 320,
        allTimePnl: 4240.55,
        totalTrades: 48,
        winRate: 68.5,
        openPositions: 2,
        currentStreak: 4,
        lastTradeAt: 1_763_030_300_000,
        bestTradeSlug: "fed-cuts-june",
        bestTradePnl: 440.15,
      },
      {
        rank: 2,
        agentId: "agent-flank",
        agentCode: "Q-AGENT-X202",
        name: "Macro Fang",
        avatarEmoji: "🐺",
        animalType: "wolf",
        agentType: "openclaw",
        connectionStatus: "connected",
        autopilotEnabled: false,
        polymarketReady: true,
        selectedPnl: 601.59,
        selectedRealizedPnl: 520.1,
        selectedUnrealizedPnl: 81.49,
        allTimePnl: 2100.88,
        totalTrades: 35,
        winRate: 61.2,
        openPositions: 1,
        currentStreak: -1,
        lastTradeAt: 1_763_030_200_000,
        bestTradeSlug: "btc-100k-2026",
        bestTradePnl: 210,
      },
    ],
    viewer: {
      agentId: "agent-crown",
      eligible: true,
      ranked: true,
      rank: 1,
      entry: {
        rank: 1,
        agentId: "agent-crown",
        agentCode: "Q-AGENT-X101",
        name: "Signal Scout",
        avatarEmoji: "🦊",
        animalType: "fox",
        agentType: "quantik",
        connectionStatus: "connected",
        autopilotEnabled: true,
        polymarketReady: true,
        selectedPnl: 1240.55,
        selectedRealizedPnl: 920.55,
        selectedUnrealizedPnl: 320,
        allTimePnl: 4240.55,
        totalTrades: 48,
        winRate: 68.5,
        openPositions: 2,
        currentStreak: 4,
        lastTradeAt: 1_763_030_300_000,
        bestTradeSlug: "fed-cuts-june",
        bestTradePnl: 440.15,
      },
      referencePnl: 1240.55,
      gapToTop10: 0,
      gapToPodium: 0,
      gapToCrown: 0,
      reason: "ranked",
    },
  };
}

describe("arena api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setAuthToken("session-token");
  });

  afterEach(() => {
    setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it("preserves live arena identities from the service response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(buildArenaResponse()), { status: 200 })
    );

    const response = await api.getArenaLeaderboard("all");

    expect(response.leaders[0].name).toBe("Signal Scout");
    expect(response.leaders[0].avatarEmoji).toBe("🦊");
    expect(response.leaders[1].agentType).toBe("openclaw");
    expect(response.viewer.entry?.agentCode).toBe("Q-AGENT-X101");
  });

  it("rejects invalid arena payloads instead of inventing placeholder agent data", async () => {
    const invalidResponse = buildArenaResponse();
    delete (invalidResponse.leaders[0] as Partial<(typeof invalidResponse.leaders)[number]>).name;

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(invalidResponse), { status: 200 })
    );

    await expect(api.getArenaLeaderboard("all")).rejects.toThrow("arena.leaders[0].name");
  });
});
