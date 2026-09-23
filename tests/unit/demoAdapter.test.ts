import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, assertNotDemoWrite, DemoWriteBlockedError, setDemoMode } from "@/lib/api";
import { DEMO_AGENT } from "@/lib/demo/agent";
import { resolveDemoGet } from "@/lib/demo/routes";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ markets: [], total: 0, hasMore: false })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setDemoMode("off");
  vi.unstubAllGlobals();
});

describe("guest demo mode", () => {
  beforeEach(() => setDemoMode("guest"));

  it("serves the demo agent without touching the network", async () => {
    const agent = await api.getMyAgent();
    expect(agent?.name).toBe("NOVA-7");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves personal reads from fixtures", async () => {
    const positions = await api.getPositions();
    const trades = await api.getTrades();
    const reports = await api.getTradeReports({ period: "all" });
    expect(positions.length).toBeGreaterThan(0);
    expect(trades.length).toBeGreaterThan(0);
    expect(reports.count).toBe(reports.trades.length);
    expect(reports.count).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps public data live", async () => {
    await api.getMarkets();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses writes locally", async () => {
    await expect(api.executeTrade({ direction: "YES", size: 10, marketSlug: "btc" })).rejects.toBeInstanceOf(DemoWriteBlockedError);
    await expect(api.updateAutopilot(DEMO_AGENT.id, true)).rejects.toBeInstanceOf(DemoWriteBlockedError);
    expect(() => assertNotDemoWrite()).toThrow(DemoWriteBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("filters demo trade reports by outcome", () => {
    const wins = resolveDemoGet("/api/performance/trades?period=all&outcome=WIN", "guest") as { trades: { outcome: string }[] };
    expect(wins.trades.length).toBeGreaterThan(0);
    expect(wins.trades.every((t) => t.outcome === "WIN")).toBe(true);
  });

  it("exports demo trades as CSV without the network", async () => {
    const blob = await api.downloadTradeReportsCsv({ period: "all" });
    expect(await blob.text()).toMatch(/^timestamp,market,direction,source,size,price,outcome,pnl/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("no-agent demo mode", () => {
  beforeEach(() => setDemoMode("no-agent"));

  it("still shows the demo agent", async () => {
    expect((await api.getMyAgent())?.name).toBe("NOVA-7");
  });

  it("lets a signed-in member's writes reach the server", async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ ok: true })));
    await api.addWatchlistItem("btc-150k");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(() => assertNotDemoWrite()).not.toThrow();
  });

  it("serves the member's real watchlist, not a demo one", async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ items: [] })));
    await api.getWatchlist();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
