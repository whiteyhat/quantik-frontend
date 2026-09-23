import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setDemoMode } from "@/lib/api";
import { MARKETS, demoPositions, demoSummary, demoTradeReports } from "@/lib/demo/portfolio";
import { normalizeDashboardHealth, selectSystemAgentRows } from "@/lib/dashboard";

// The guest showcase must look healthy and alive, agree with NOVA-7's numbers,
// and never show production's real system state. Members keep the truth.

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setDemoMode("off");
  vi.unstubAllGlobals();
});

const summary = demoSummary() as {
  totalValue: number;
  cashBalance: number;
  positionsValue: number;
  pnl: number;
  winRate: number;
  totalTrades: number;
  metrics: { bestTrade: string; bestPnl: number; bestTradeQuestion?: string };
};

describe("guest dashboard system telemetry", () => {
  beforeEach(() => setDemoMode("guest"));

  it("answers every dashboard, My Agent and Reports system read without the network", async () => {
    await Promise.all([
      api.getRiskStatus(),
      api.getRiskConfig(),
      api.getSignals(),
      api.getSystemAgentHealth(),
      api.getHealth(),
      api.getOrchestratorStatus(),
      api.getScannerStatus(),
      api.getScannerResults(30),
      api.getPipelineHistory(),
      api.getAlertStatus(),
      api.getBrierScores(),
      api.getAttribution(),
      api.getDriftStatus(),
      api.getCalibration(),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports risk that matches NOVA-7's portfolio", async () => {
    const risk = await api.getRiskStatus();
    expect(risk).not.toBeNull();
    expect(risk!.availableCapital).toBe(summary.cashBalance);
    expect(risk!.exposurePct).toBeCloseTo((summary.positionsValue / summary.totalValue) * 100, 1);
    expect(risk!.circuitBreaker).toBe("ARMED");
    const config = await api.getRiskConfig();
    // a small drawdown, well inside the limit
    expect(Math.abs(risk!.dailyPnlPct)).toBeLessThan(config!.drawdownLimit * 100 * 0.5);
  });

  it("shows the seven pipeline agents live with realistic latencies", async () => {
    const health = await api.getSystemAgentHealth();
    expect(health!.overall).toBe("healthy");
    const rows = selectSystemAgentRows(health!.agents);
    expect(rows.map((r) => r.id).sort()).toEqual(["aura", "clause", "edge", "flux", "lucifer", "oracle", "sigma"]);
    for (const row of rows) {
      expect(row.status).toBe("live");
      expect(row.latencyMs).toBeGreaterThanOrEqual(180);
      expect(row.latencyMs).toBeLessThanOrEqual(900);
      expect(row.lastActiveAt).not.toBeNull();
      expect(Date.now() - row.lastActiveAt!).toBeLessThan(10 * 60_000);
    }
  });

  it("reports a healthy API and service map", async () => {
    const health = normalizeDashboardHealth(await api.getHealth() as never);
    expect(health.label).toBe("healthy");
    expect(health.services.length).toBeGreaterThanOrEqual(4);
    expect(health.services.every((s) => s.status === "healthy")).toBe(true);
  });

  it("answers API health after a plausible network delay", async () => {
    const started = Date.now();
    await api.getHealth();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(60);
    expect(elapsed).toBeLessThan(600);
  });

  it("shows the scanner and orchestrator running with a recent scan", async () => {
    const orchestrator = await api.getOrchestratorStatus();
    expect(orchestrator!.status).toBe("scanning");
    expect(Date.now() - orchestrator!.lastScanAt).toBeLessThan(5 * 60_000);
    expect(orchestrator!.marketsScanned).toBeGreaterThan(0);
    const scanner = await api.getScannerStatus();
    expect(scanner!.isRunning).toBe(true);
    expect(Date.now() - new Date(scanner!.lastScan!).getTime()).toBeLessThan(5 * 60_000);
  });

  it("feeds recent signals and AI insights with readable market questions", async () => {
    const signals = await api.getSignals();
    expect(signals.length).toBeGreaterThanOrEqual(4);
    for (const s of signals) {
      expect(["TRADE", "WATCH"]).toContain(s.status);
      expect(s.question.length).toBeGreaterThan(10);
      expect(s.confidence).toBeGreaterThan(50);
      expect(s.confidence).toBeLessThanOrEqual(100);
      expect(Date.now() - s.timestamp).toBeLessThan(7 * 24 * 3_600_000);
    }
  });

  it("fills the system log with scans, pipeline runs and alerts", async () => {
    expect((await api.getScannerResults(30)).length).toBeGreaterThan(0);
    const runs = await api.getPipelineHistory();
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((r) => r.market_question.length > 0)).toBe(true);
    expect((await api.getAlertStatus()).alerts.length).toBeGreaterThan(0);
  });

  it("shows healthy L5 monitoring: Brier scores, attribution, clear drift, calibration", async () => {
    const brier = await api.getBrierScores();
    expect(brier.length).toBeGreaterThan(0);
    expect(brier.every((b) => b.score >= 0 && b.score < 0.2 && b.slug.length > 0)).toBe(true);
    const attribution = await api.getAttribution();
    expect(attribution.length).toBeGreaterThan(0);
    expect(attribution.every((a) => a.hitRate > 0 && a.hitRate <= 1)).toBe(true);
    expect(await api.getDriftStatus()).toMatchObject({ microstructure: "clear", concept: "clear" });
    const calibration = await api.getCalibration();
    expect(calibration.length).toBeGreaterThanOrEqual(5);
    expect(calibration.every((c) => c.weight > 0)).toBe(true);
  });
});

describe("members keep the truth", () => {
  it("sends platform reads to the live API for a member without an agent", async () => {
    setDemoMode("no-agent");
    await api.getHealth();
    await api.getSystemAgentHealth();
    await api.getOrchestratorStatus();
    await api.getBrierScores();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("still shows NOVA-7's risk to a member without an agent (it describes the portfolio shown)", async () => {
    setDemoMode("no-agent");
    const risk = await api.getRiskStatus();
    expect(risk!.availableCapital).toBe(summary.cashBalance);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("monitoring normalizers accept the real backend shapes", () => {
  const respond = (body: unknown) => fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify(body)));

  it("reads wrapped Brier scores", async () => {
    respond({
      scores: [{ id: "r1", pipeline_run_id: "p1", market_slug: "fed-cut", predicted: 0.8, outcome: 1, brier_score: 0.04, signal_type: "forecast-driven", resolved_at: 1700 }],
      avgBrier: 0.04,
      count: 1,
    });
    expect(await api.getBrierScores()).toEqual([{ slug: "fed-cut", score: 0.04, timestamp: 1700 }]);
  });

  it("reads wrapped attribution and calibration", async () => {
    respond({ attribution: [{ signalType: "arb", wins: 3, losses: 1, hitRate: 0.75, avgEdge: 0.05 }], alphaDecay: {} });
    expect(await api.getAttribution()).toEqual([{ signalType: "arb", hitRate: 0.75, count: 4 }]);
    respond({ weights: [{ agent: "Edge", weight: 0.3, brierScore: null, trend: "stable", confidence: null }] });
    expect(await api.getCalibration()).toEqual([{ agent: "Edge", weight: 0.3, confidence: 0 }]);
  });

  it("reads drift objects: detected false is clear, not DETECTED", async () => {
    respond({ microstructure: { detected: false, avgSpread: 0 }, concept: { detected: true, rollingHitRate: 0.3 }, lastChecked: 5 });
    expect(await api.getDriftStatus()).toEqual({ microstructure: "clear", concept: "detected", lastChecked: 5 });
  });

  it("still reads the older array and string shapes", async () => {
    respond([{ slug: "a", score: 0.1, timestamp: 1 }]);
    expect(await api.getBrierScores()).toEqual([{ slug: "a", score: 0.1, timestamp: 1 }]);
    respond({ microstructure: "clear", concept: "clear", lastChecked: 2 });
    expect(await api.getDriftStatus()).toEqual({ microstructure: "clear", concept: "clear", lastChecked: 2 });
  });
});

describe("NOVA-7's report agrees with the rest of the demo", () => {
  const all = demoTradeReports(new URLSearchParams("period=all"));

  it("has 47 trades and a 64% win rate", () => {
    expect(all.count).toBe(summary.totalTrades);
    expect(all.summary.totalTrades).toBe(47);
    expect(Math.round(all.summary.winRate * 100)).toBe(Math.round(summary.winRate * 100));
  });

  it("totals the same P&L and best trade as the dashboard", () => {
    expect(all.summary.totalPnl).toBeCloseTo(summary.pnl, 2);
    expect(all.bestTrade?.slug).toBe(summary.metrics.bestTrade);
    expect(all.bestTrade?.pnl).toBe(summary.metrics.bestPnl);
  });

  it("lists exactly the open positions as its OPEN trades (same market, side, stake and source)", () => {
    const key = (x: { slug: string; direction: string; size: number; source?: string }) =>
      `${x.slug}|${x.direction}|${x.size}|${x.source}`;
    const openTrades = all.trades.filter((t) => t.outcome === "OPEN").map(key).sort();
    const positions = demoPositions().map(key).sort();
    expect(positions).toEqual(openTrades);
    expect(all.summary.open).toBe(demoPositions().length);
  });

  it("never lists a still-open position's market as a closed trade from the same entry", () => {
    const closed = all.trades.filter((t) => t.outcome === "WIN" || t.outcome === "LOSS");
    for (const p of demoPositions()) {
      const sameEntry = closed.find((t) => t.slug === p.slug && t.direction === p.direction && t.size === p.size && t.price === p.entryPrice);
      expect(sameEntry, p.slug).toBeUndefined();
    }
  });

  it("lists trades newest first, all inside NOVA-7's lifetime", () => {
    const times = all.trades.map((t) => t.timestamp);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(Date.now() - times[times.length - 1]).toBeLessThan(21 * 24 * 3_600_000);
  });

  it("gives every trade a market question", () => {
    expect(all.trades.every((t) => t.market && t.market !== t.slug && MARKETS[t.slug] === t.market)).toBe(true);
  });
});

describe("demo fixtures carry market questions, not just slugs", () => {
  beforeEach(() => setDemoMode("guest"));

  it("names the best trade's market", () => {
    expect(summary.metrics.bestTradeQuestion).toBe(MARKETS[summary.metrics.bestTrade]);
  });

  it("puts the question on execution-log and agent-execution rows", async () => {
    const log = await api.getExecutionLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((row) => row.question === MARKETS[row.slug])).toBe(true);
    const executions = await api.getAgentExecutions("demo-nova-7", { limit: 10 });
    expect(executions.every((row) => row.question === MARKETS[row.slug])).toBe(true);
  });

  it("puts the question on scanner results and Brier scores", async () => {
    const scans = await api.getScannerResults(30);
    expect(scans.length).toBeGreaterThan(0);
    expect(scans.every((s) => typeof s.question === "string" && s.question.length > 10)).toBe(true);
  });

  it("gives My Agent a max drawdown", async () => {
    const wallet = await api.getBalance();
    expect(wallet?.drawdown).toBeGreaterThan(0);
    expect(wallet!.drawdown!).toBeLessThan(wallet!.drawdownLimit!);
  });
});
