import { describe, expect, it } from "vitest";
import {
  formatRelativeTime,
  normalizeDashboardHealth,
  normalizeDashboardSummary,
  selectSystemAgentRows,
} from "../../lib/dashboard";

describe("dashboard normalizers", () => {
  it("normalizes mixed legacy and current summary fields", () => {
    const summary = normalizeDashboardSummary({
      totalValue: 1200,
      cashBalance: 400,
      pnl: 120,
      pnlPct: 0.12,
      dailyPnl: 15,
      dailyPnlPct: 1.5,
      winRate: 0.64,
      totalTrades: 42,
      kellyUtilization: 0.33,
      circuitBreakerStatus: { state: "WARNING" },
      funding_status: "ready",
      metrics: {
        currentStreak: 4,
        bestTrade: "btc-breakout",
        bestPnl: 33,
        totalVolume: 930,
      },
      alphaDecay: {
        detected: true,
        rollingHitRate: 0.58,
        recommendation: "Reduce position sizing",
      },
    });

    expect(summary.totalValue).toBe(1200);
    expect(summary.cashBalance).toBe(400);
    expect(summary.positionsValue).toBe(800);
    expect(summary.pnlToday).toBe(15);
    expect(summary.totalPnl).toBe(120);
    expect(summary.circuitBreakerStatus).toBe("WARNING");
    expect(summary.fundingStatus).toBe("ready");
    expect(summary.metrics.bestTrade).toBe("btc-breakout");
    expect(summary.alphaDecay?.recommendation).toBe("Reduce position sizing");
  });

  it("falls back to safe defaults when summary fields are missing", () => {
    const summary = normalizeDashboardSummary({});

    expect(summary.totalValue).toBeNull();
    expect(summary.cashBalance).toBeNull();
    expect(summary.positionsValue).toBeNull();
    expect(summary.pnlToday).toBe(0);
    expect(summary.totalTrades).toBe(0);
    expect(summary.circuitBreakerStatus).toBe("ARMED");
    expect(summary.metrics.totalVolume).toBe(0);
    expect(summary.alphaDecay).toBeNull();
  });

  it("renders generic agent labels and runtime defaults when telemetry is missing", () => {
    const rows = selectSystemAgentRows([
      {
        name: "",
        latencyMs: 85,
        errorRate: 0.12,
        lastActiveAt: 0,
        status: "down",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Agent 1");
    expect(rows[0]?.status).toBe("down");
    expect(rows[0]?.detail).toBe("No recent traffic");
  });

  it("normalizes structured health services for the mission rail", () => {
    const health = normalizeDashboardHealth({
      status: "degraded",
      message: "Mission control is degraded but still operational",
      checkedAt: 1_234,
      services: {
        backend: {
          status: "healthy",
          detail: "API online",
          checkedAt: 1_230,
          meta: { uptimeMs: 40_000 },
        },
        pipeline_agents: {
          status: "degraded",
          detail: "No pipeline activity has been recorded yet",
        },
      },
    });

    expect(health.label).toBe("Degraded");
    expect(health.services[0]?.name).toBe("Backend");
    expect(health.services[0]?.status).toBe("healthy");
    expect(health.services[1]?.name).toBe("Pipeline Agents");
    expect(health.services[1]?.detail).toContain("No pipeline activity");
  });

  it("formats relative times for recent events", () => {
    expect(formatRelativeTime(9_000, 10_000)).toBe("Just now");
    expect(formatRelativeTime(4_000, 15_000)).toBe("11s ago");
    expect(formatRelativeTime(10_000 - 180_000, 10_000)).toBe("3m ago");
  });
});
