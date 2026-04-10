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

  it("generates dual wallets through the authenticated backend route", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        evm: { address: "0x1111111111111111111111111111111111111111", privateKey: "0xabc" },
        stellar: { address: "GABCDEF", privateKey: "SABCDEF" },
      }), { status: 200 })
    );

    const wallet = await api.generateWallet();

    expect(wallet.evm.address).toBe("0x1111111111111111111111111111111111111111");
    expect(wallet.stellar.address).toBe("GABCDEF");
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
        message: "Deposit >= 3 POL for Polygon fees and >= 10 USDC.e for Polymarket trades before enabling autopilot.",
        wallet_address: "0x3333333333333333333333333333333333333333",
        pol: 0,
        on_chain_usdc: 0,
      }), { status: 409 })
    );

    await expect(api.updateAutopilot("agent-123", true)).rejects.toMatchObject({
      message: "Deposit >= 3 POL for Polygon fees and >= 10 USDC.e for Polymarket trades before enabling autopilot.",
      status: 409,
      code: "AUTOPILOT_FUNDING_REQUIRED",
      data: expect.objectContaining({
        wallet_address: "0x3333333333333333333333333333333333333333",
        pol: 0,
        on_chain_usdc: 0,
      }),
    });
  });

  it("surfaces polymarket prep conflicts with backend details", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: "AUTOPILOT_POLYMARKET_PREP_REQUIRED",
        message: "Polymarket approvals are incomplete. Run the approval flow before enabling autopilot.",
        wallet_address: "0x4444444444444444444444444444444444444444",
        polymarket_status: "funding_detected",
        funding_status: "ready",
        funding_message: "Wallet funded",
        missing_items: ["Run the Polymarket approval flow for this wallet."],
      }), { status: 409 })
    );

    await expect(api.updateAutopilot("agent-123", true)).rejects.toMatchObject({
      message: "Polymarket approvals are incomplete. Run the approval flow before enabling autopilot.",
      status: 409,
      code: "AUTOPILOT_POLYMARKET_PREP_REQUIRED",
      data: expect.objectContaining({
        polymarket_status: "funding_detected",
        missing_items: ["Run the Polymarket approval flow for this wallet."],
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
        funding_message: "Wallet meets the >= 3 POL and >= 10 USDC.e autopilot requirements.",
      }), { status: 200 })
    );

    const wallet = await api.getBalance();

    expect(wallet?.fundingStatus).toBe("ready");
    expect(wallet?.fundingMessage).toBe("Wallet meets the >= 3 POL and >= 10 USDC.e autopilot requirements.");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/performance/summary"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });

  it("loads agent-scoped autopilot status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        agentId: "agent-123",
        autopilotEnabled: false,
        polymarketReady: false,
        polymarketStatus: "pending_funding",
        wallet: {
          address: "0x5555555555555555555555555555555555555555",
          onChainUsdc: 7,
          clobBalance: 0,
          pol: 1.2,
          fundingStatus: "funding_required",
          fundingMessage: "Wallet needs funding",
          missingItems: ["Fund with >= 3 POL and >= 10 USDC.e"],
        },
        scheduler: {
          scannerRunning: false,
          lastGlobalScanAt: 1741397200000,
          scanIntervalMs: 300000,
          paperMode: true,
        },
        activity: {
          tradesToday: 0,
          lastExecutedAt: null,
          lastDecisionAt: 1741397100000,
          lastDecision: {
            id: "decision-1",
            slug: "btc-100k",
            direction: "YES",
            decision: "skipped",
            reason_code: "funding",
            size_usdc: null,
            scanned_at: 1741397100000,
            error: null,
          },
          lastReasonCode: "funding",
        },
        blocker: "funding_required",
      }), { status: 200 })
    );

    const status = await api.getAgentAutopilotStatus("agent-123");

    expect(status.blocker).toBe("funding_required");
    expect(status.wallet.fundingStatus).toBe("funding_required");
    expect(status.activity.lastDecision?.reason_code).toBe("funding");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-123/autopilot-status"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });

  it("loads agent-scoped executions and keeps legacy blank sources as unknown", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        executions: [
          {
            id: "execution-1",
            slug: "btc-100k",
            side: "buy",
            direction: "YES",
            amount: 25,
            executedAt: 1741397200000,
            status: "paper",
            orderId: "paper-1",
            fillPrice: 0.62,
            pnl: 1.5,
            source: "",
          },
        ],
      }), { status: 200 })
    );

    const executions = await api.getAgentExecutions("agent-123", { limit: 5 });

    expect(executions[0]?.source).toBe("unknown");
    expect(executions[0]?.fillPrice).toBe(0.62);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-123/executions?limit=5"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
  });
});
