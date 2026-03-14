import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken } from "../../lib/api";

describe("trade api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setAuthToken("session-token");
  });

  afterEach(() => {
    setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it("posts explicit direction and market context for manual trades", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await api.executeTrade({
      direction: "NO",
      marketSlug: "will-btc-hit-100k",
      tokenId: "no-token",
      size: 18,
      price: 0.39,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trade/execute"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
        body: JSON.stringify({
          direction: "NO",
          marketSlug: "will-btc-hit-100k",
          tokenId: "no-token",
          size: 18,
          price: 0.39,
        }),
      })
    );
  });
});
