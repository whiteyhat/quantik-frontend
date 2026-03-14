import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken } from "../../lib/api";

describe("autopilot policy api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setAuthToken("session-token");
  });

  afterEach(() => {
    setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it("loads per-agent autopilot policy", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          derived: {
            cadenceMinutes: 60,
            cooldownMinutes: 360,
            maxTradesPerDay: 6,
            maxBetUsdc: 25,
            minSigma: 0.72,
            minKelly: 0.03,
            kellyMultiplier: 0.25,
            maxPositionFraction: 0.08,
            dailyLossLimitPct: 0.08,
            useAuraSentiment: true,
          },
          overrides: {
            cadenceMinutes: null,
            cooldownMinutes: null,
            maxTradesPerDay: null,
            maxBetUsdc: null,
            updatedAt: null,
          },
          effective: {
            cadenceMinutes: 60,
            cooldownMinutes: 360,
            maxTradesPerDay: 6,
            maxBetUsdc: 25,
            minSigma: 0.72,
            minKelly: 0.03,
            kellyMultiplier: 0.25,
            maxPositionFraction: 0.08,
            dailyLossLimitPct: 0.08,
            useAuraSentiment: true,
          },
        }),
        { status: 200 }
      )
    );

    const policy = await api.getAutopilotPolicy("agent-1");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-1/autopilot-policy"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    );
    expect(policy.effective.maxBetUsdc).toBe(25);
  });

  it("updates per-agent autopilot policy overrides", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          derived: {
            cadenceMinutes: 60,
            cooldownMinutes: 360,
            maxTradesPerDay: 6,
            maxBetUsdc: 25,
            minSigma: 0.72,
            minKelly: 0.03,
            kellyMultiplier: 0.25,
            maxPositionFraction: 0.08,
            dailyLossLimitPct: 0.08,
            useAuraSentiment: true,
          },
          overrides: {
            cadenceMinutes: 30,
            cooldownMinutes: null,
            maxTradesPerDay: 10,
            maxBetUsdc: null,
            updatedAt: 123,
          },
          effective: {
            cadenceMinutes: 30,
            cooldownMinutes: 360,
            maxTradesPerDay: 10,
            maxBetUsdc: 25,
            minSigma: 0.72,
            minKelly: 0.03,
            kellyMultiplier: 0.25,
            maxPositionFraction: 0.08,
            dailyLossLimitPct: 0.08,
            useAuraSentiment: true,
          },
        }),
        { status: 200 }
      )
    );

    await api.updateAutopilotPolicy("agent-1", {
      cadenceMinutes: 30,
      cooldownMinutes: null,
      maxTradesPerDay: 10,
      maxBetUsdc: null,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/agent-1/autopilot-policy"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
        body: JSON.stringify({
          cadenceMinutes: 30,
          cooldownMinutes: null,
          maxTradesPerDay: 10,
          maxBetUsdc: null,
        }),
      })
    );
  });
});
