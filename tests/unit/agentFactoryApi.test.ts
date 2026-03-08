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
});
