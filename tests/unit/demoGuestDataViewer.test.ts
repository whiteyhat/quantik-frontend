import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A slow Clerk must never send a personal read to the live API while nobody
// knows who is looking, and must never hand demo data to a member.

const fetchMock = vi.fn();

async function freshApi() {
  vi.resetModules();
  vi.stubGlobal("window", { dispatchEvent: () => true });
  return import("@/lib/api");
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify({ trades: [{ id: "live-1", slug: "real", market: "Real market", direction: "YES", size: 5, price: 0.5, outcome: "OPEN", timestamp: 1 }], count: 1, period: "all", summary: {}, buckets: [], filters: {} })),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("personal reads while the viewer is unknown", () => {
  it("slow Clerk, guest: keeps waiting past the old 5s fall-through, then answers from the demo", async () => {
    const fresh = await freshApi();
    const pending = fresh.api.getTradeReports({ period: "all" });
    await vi.advanceTimersByTimeAsync(9_000);
    expect(fetchMock).not.toHaveBeenCalled();

    fresh.setDemoMode("guest");
    const reports = await pending;
    expect(reports.count).toBeGreaterThan(1);
    expect(reports.trades.every((t) => t.id.startsWith("demo-"))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fresh.takeViewerWaitTimeout()).toBe(false);
  });

  it("slow Clerk, member: keeps waiting, then reads the member's live data (never the demo)", async () => {
    const fresh = await freshApi();
    const pending = fresh.api.getTradeReports({ period: "all" });
    await vi.advanceTimersByTimeAsync(9_000);
    expect(fetchMock).not.toHaveBeenCalled();

    fresh.setAuthToken("member-token");
    fresh.setDemoMode("off");
    const reports = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer member-token");
    expect(reports.trades.map((t) => t.id)).toEqual(["live-1"]);
  });

  it("gives up with a typed error after the cap, without touching the network", async () => {
    const fresh = await freshApi();
    const pending = fresh.api.getTradeReports({ period: "all" });
    const settled = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(fresh.VIEWER_WAIT_CAP_MS + 10);
    const error = await settled;
    expect(error).toBeInstanceOf(fresh.ViewerUnknownError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recovers: the viewer that finally resolves learns a read gave up, once", async () => {
    const fresh = await freshApi();
    const settled = fresh.api.getTradeReports({ period: "all" }).catch(() => null);
    await vi.advanceTimersByTimeAsync(fresh.VIEWER_WAIT_CAP_MS + 10);
    await settled;

    fresh.setDemoMode("guest");
    expect(fresh.takeViewerWaitTimeout()).toBe(true);
    expect(fresh.takeViewerWaitTimeout()).toBe(false);
    // the refetch after recovery is served from the demo
    const reports = await fresh.api.getTradeReports({ period: "all" });
    expect(reports.count).toBeGreaterThan(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("public reads never wait", async () => {
    const fresh = await freshApi();
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ markets: [], total: 0, hasMore: false })));
    await fresh.api.getMarkets();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
