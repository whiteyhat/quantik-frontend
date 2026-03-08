import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken } from "../../lib/api";

describe("agent factory api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setAuthToken("session-token");
  });

  afterEach(() => {
    setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it("generates wallets through the authenticated backend route", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        address: "0x1111111111111111111111111111111111111111",
        privateKey: "0xabc",
        seedPhrase: "alpha beta gamma",
      }), { status: 200 })
    );

    const wallet = await api.generateWallet();

    expect(wallet.address).toBe("0x1111111111111111111111111111111111111111");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/wallet/generate"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });

  it("downloads BYO onboarding wallets through the authenticated backend route", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        address: "0x2222222222222222222222222222222222222222",
        privateKey: "0xdef",
        seedPhrase: "delta epsilon zeta",
      }), { status: 200 })
    );

    const wallet = await api.downloadByoOnboardingWallet("session-123");

    expect(wallet.privateKey).toBe("0xdef");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/byo/onboarding/session-123/wallet-download"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });

  it("persists autopilot state through the authenticated owner route", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        agent_id: "agent-123",
        autopilot_enabled: true,
        autopilot_updated_at: 1_741_397_200_000,
      }), { status: 200 })
    );

    const result = await api.updateAutopilot("agent-123", true);

    expect(result.autopilot_enabled).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-123/autopilot"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
        body: JSON.stringify({ enabled: true }),
      })
    );
  });

  it("surfaces funding-gated autopilot errors with backend details", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: "AUTOPILOT_FUNDING_REQUIRED",
        message: "Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.",
        wallet_address: "0x3333333333333333333333333333333333333333",
        pol: 0,
        on_chain_usdc: 0,
      }), { status: 409 })
    );

    await expect(api.updateAutopilot("agent-123", true)).rejects.toMatchObject({
      message: "Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.",
      status: 409,
      code: "AUTOPILOT_FUNDING_REQUIRED",
      data: expect.objectContaining({
        wallet_address: "0x3333333333333333333333333333333333333333",
        pol: 0,
        on_chain_usdc: 0,
      }),
    });
  });

  it("loads BYO usage from the owner-scoped agent endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        success: true,
        data: {
          total_requests_24h: 8,
          requests_last_hour: 3,
          error_count_24h: 1,
          error_rate_24h: "12.5%",
          by_tool: [
            { tool: "get_markets", requests: 8, avg_latency_ms: null, errors: 1 },
          ],
          daily_breakdown: [],
          recent_errors: [],
        },
      }), { status: 200 })
    );

    const usage = await api.getAgentUsage("agent-usage-1");

    expect(usage.data.by_tool[0]?.avg_latency_ms).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-usage-1/usage"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });

  it("maps wallet funding fields from performance summary responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        address: "0x4444444444444444444444444444444444444444",
        usdc: 12,
        onChainUsdc: 12,
        pol: 0.75,
        pnl: 0,
        pnlPct: null,
        winRate: 0,
        totalTrades: 0,
        pnlToday: 0,
        pnlTodayPct: null,
        totalValue: 12,
        funding_status: "ready",
        funding_message: "Wallet has both POL and USDC.e required for autonomous trading.",
      }), { status: 200 })
    );

    const wallet = await api.getBalance();

    expect(wallet?.fundingStatus).toBe("ready");
    expect(wallet?.fundingMessage).toBe("Wallet has both POL and USDC.e required for autonomous trading.");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/performance/summary"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });
});
