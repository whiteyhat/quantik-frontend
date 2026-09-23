import { DEMO_AUTOPILOT_POLICY } from "./agent";
import { DEMO_AGENT_WEIGHTS, MARKETS, demoPositions, demoSummary, demoTrades } from "./portfolio";
import { ago, HOUR, MINUTE } from "./time";

// ─── The platform around NOVA-7, as a guest sees it ──────────────────────────
// Guests never see production's real system state on showcase pages: these
// answer the dashboard, My Agent and Reports with a healthy, busy platform that
// agrees with NOVA-7's portfolio. Raw backend shapes; api.* normalizes them.

const SCAN_INTERVAL_MS = 5 * MINUTE; // the backend's scanner and orchestrator cadence
const LAST_SCAN_AGO = 4 * MINUTE; // same scan NOVA-7's autopilot card reports
const MARKETS_SCANNED = 2140;
const CANDIDATES_FOUND = 24;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const question = (slug: string) => MARKETS[slug] ?? slug;

// ── Risk ─────────────────────────────────────────────────────────────────────

export function demoRiskStatus(): Record<string, unknown> {
  const summary = demoSummary() as { totalValue: number; positionsValue: number; cashBalance: number; pnlToday: number };
  const policy = DEMO_AUTOPILOT_POLICY.effective;
  return {
    totalCapital: summary.totalValue,
    deployedCapital: summary.positionsValue,
    availableCapital: summary.cashBalance,
    exposurePct: round2((summary.positionsValue / summary.totalValue) * 100),
    dailyPnl: summary.pnlToday,
    dailyPnlPct: round2((summary.pnlToday / summary.totalValue) * 100),
    circuitBreaker: "ARMED",
    circuitBreakerDetail: { state: "ARMED" },
    themeExposure: { crypto: 0.24, macro: 0.16, tech: 0.06 },
    positionCount: demoPositions().length,
    maxDrawdownPct: policy.dailyLossLimitPct,
    maxPositionSizePct: policy.maxPositionFraction,
    kellyFraction: policy.kellyMultiplier,
    luciferVetoThreshold: 0.03,
  };
}

export function demoRiskConfig(): Record<string, unknown> {
  const policy = DEMO_AUTOPILOT_POLICY.effective;
  return {
    agentVarThreshold: 0.05,
    maxPositionSize: policy.maxPositionFraction,
    drawdownLimit: policy.dailyLossLimitPct,
    kellyMultiplier: policy.kellyMultiplier,
  };
}

// ── Signals (Recent Signals card, AI insights) ───────────────────────────────

const SIGNALS: Array<[string, "BET_YES" | "BET_NO", "TRADE" | "WATCH", number, number, number]> = [
  // slug, decision, status, confidence, edge, minutes ago — matches NOVA-7's autopilot log
  ["us-cpi-below-3", "BET_NO", "WATCH", 0.66, 0.021, 4],
  ["gold-record-high", "BET_YES", "WATCH", 0.69, 0.034, 50],
  ["will-btc-close-above-150k-in-2026", "BET_YES", "TRADE", 0.78, 0.071, 185],
  ["fed-cut-december", "BET_YES", "TRADE", 0.81, 0.086, 1800],
  ["nba-finals-game-7", "BET_YES", "WATCH", 0.7, 0.028, 2400],
  ["sol-flip-eth-volume", "BET_NO", "TRADE", 0.76, 0.058, 6600],
];

export function demoSignals(): Array<Record<string, unknown>> {
  return SIGNALS.map(([slug, decision, status, confidence, edge, minutesAgo], i) => ({
    id: `demo-signal-${i + 1}`,
    // No slug: demo markets have no market page to open
    slug: "",
    question: question(slug),
    decision,
    confidence,
    edge,
    timestamp: ago(minutesAgo * MINUTE),
    status,
  }));
}

// ── Pipeline agents, API health, scanner, orchestrator ───────────────────────

const AGENTS: Array<[string, number, number, number]> = [
  // name, latency ms, error rate, minutes since last run
  ["aura", 420, 0, 4],
  ["flux", 260, 0.01, 4],
  ["clause", 610, 0, 4],
  ["oracle", 880, 0.02, 4],
  ["edge", 190, 0, 4],
  ["lucifer", 540, 0, 4],
  ["sigma", 330, 0.01, 4],
];

export function demoAgentsHealth(): Record<string, unknown> {
  return {
    agents: AGENTS.map(([name, latencyMs, errorRate, minutesAgo]) => ({
      name,
      status: "live",
      lastActiveAt: ago(minutesAgo * MINUTE),
      latencyMs,
      errorRate,
    })),
    overall: "healthy",
    checkedAt: Date.now(),
  };
}

export function demoOrchestratorStatus(): Record<string, unknown> {
  const lastScanAt = ago(LAST_SCAN_AGO);
  return {
    lastScanAt,
    nextScanAt: lastScanAt + SCAN_INTERVAL_MS,
    marketsScanned: MARKETS_SCANNED,
    candidatesFound: CANDIDATES_FOUND,
    scanIntervalMs: SCAN_INTERVAL_MS,
    status: "scanning",
  };
}

export function demoScannerStatus(): Record<string, unknown> {
  return {
    isRunning: true,
    lastScan: new Date(ago(LAST_SCAN_AGO)).toISOString(),
    scannedToday: 1860,
    alertsTriggered: 4,
    marketsChecked: 1860,
    tradesToday: 1,
    circuitBreakerTriggered: false,
    paperMode: true,
    scanIntervalMs: SCAN_INTERVAL_MS,
  };
}

export function demoHealth(): Record<string, unknown> {
  const now = Date.now();
  const orchestrator = demoOrchestratorStatus();
  const agents = demoAgentsHealth();
  const service = (detail: string, meta: Record<string, unknown>) => ({ status: "healthy", detail, checkedAt: now, meta });
  return {
    status: "healthy",
    checkedAt: now,
    message: "All mission systems nominal",
    services: {
      backend: service("API online and serving dashboard telemetry", { uptimeMs: 6 * 24 * HOUR + 7 * HOUR, nodeVersion: "v22.14.0" }),
      relay: service("3 active sessions", { agent: "relay", activeSessions: 3 }),
      scanner: service("Scanner is running now", { ...demoScannerStatus(), running: true, lastScanAgeMs: LAST_SCAN_AGO }),
      orchestrator: service(`Scanning ${MARKETS_SCANNED.toLocaleString("en-US")} markets`, { ...orchestrator, lastScanAgeMs: LAST_SCAN_AGO }),
      pipeline_agents: service(`${AGENTS.length} live · 0 idle · 0 degraded · 0 down`, {
        overall: "healthy",
        agents: agents.agents,
        liveCount: AGENTS.length,
        idleCount: 0,
        degradedCount: 0,
        downCount: 0,
        checkedAt: now,
      }),
    },
  };
}

// ── System log: scans, pipeline runs, alerts ─────────────────────────────────

const SCANS: Array<[string, number, number, string, number]> = [
  // slug, sigma confidence, kelly fraction, recommendation, YES probability
  ["us-cpi-below-3", 0.66, 0.21, "WATCH", 0.31],
  ["gold-record-high", 0.69, 0.34, "WATCH", 0.58],
  ["starship-orbit", 0.52, 0.12, "SKIP", 0.44],
  ["eth-above-5k", 0.61, 0.18, "SKIP", 0.36],
  ["boe-cut-november", 0.71, 0.38, "WATCH", 0.62],
  ["nvda-5t-cap", 0.57, 0.15, "SKIP", 0.41],
  ["oil-above-90", 0.63, 0.22, "WATCH", 0.33],
  ["ecb-hike-october", 0.55, 0.09, "SKIP", 0.27],
];

export function demoScannerResults(limit: number): Record<string, unknown> {
  const count = Math.max(1, Math.min(limit || SCANS.length, SCANS.length * 3));
  // Each scan cycle leads with a different market, so the live log keeps moving
  const offset = Math.floor(Date.now() / SCAN_INTERVAL_MS) % SCANS.length;
  const results = Array.from({ length: count }, (_, i) => {
    const [slug, sigma, kelly, recommendation, probability] = SCANS[(offset + i) % SCANS.length];
    const scannedAt = ago(LAST_SCAN_AGO + i * 7 * MINUTE);
    return {
      id: 9000 - i,
      slug,
      question: question(slug),
      scannedAt,
      sigmaConfidence: sigma,
      sigma_confidence: sigma,
      kellyFraction: kelly,
      kelly_fraction: kelly,
      recommendation,
      probability,
      alertSent: recommendation === "TRADE",
      pipelineResult: null,
    };
  });
  return { ok: true, count: results.length, results };
}

const RUNS: Array<[string, "BET_YES" | "BET_NO" | "PASS", number, "scanner" | "pipeline", number, number]> = [
  // slug, decision, confidence, source, minutes ago, seconds to finish
  ["us-cpi-below-3", "PASS", 0.66, "scanner", 4, 11.8],
  ["gold-record-high", "BET_YES", 0.69, "scanner", 50, 12.4],
  ["will-btc-close-above-150k-in-2026", "BET_YES", 0.78, "scanner", 185, 13.1],
  ["fed-cut-december", "BET_YES", 0.81, "pipeline", 1800, 14.6],
  ["nba-finals-game-7", "PASS", 0.7, "scanner", 2400, 12.9],
  ["sol-flip-eth-volume", "BET_NO", 0.76, "scanner", 6600, 11.2],
];

export function demoPipelineHistory(): Array<Record<string, unknown>> {
  return RUNS.map(([slug, decision, confidence, source, minutesAgo, seconds], i) => {
    const createdAt = ago(minutesAgo * MINUTE);
    return {
      id: `demo-run-${i + 1}`,
      market_slug: slug,
      market_question: question(slug),
      created_at: createdAt,
      completed_at: createdAt + Math.round(seconds * 1000),
      decision,
      confidence,
      source,
      available_agents: AGENTS.map(([name]) => name),
    };
  });
}

const ALERTS: Array<[string, number, "TRADE" | "WATCH", number, number]> = [
  // slug, confidence, signal state, alert_sent (2 approved, 1 pending, -1 vetoed), minutes ago
  ["gold-record-high", 0.69, "WATCH", 1, 50],
  ["will-btc-close-above-150k-in-2026", 0.78, "TRADE", 2, 185],
  ["fed-cut-december", 0.81, "TRADE", 2, 1800],
  ["nba-finals-game-7", 0.7, "TRADE", -1, 2400],
];

export function demoAlertStatus(slug: string | null): Record<string, unknown> {
  const alerts = ALERTS.filter(([alertSlug]) => !slug || alertSlug === slug).map(
    ([alertSlug, confidence, signal_state, alert_sent, minutesAgo], i) => ({
      id: `demo-alert-run-${i + 1}`,
      slug: alertSlug,
      question: question(alertSlug),
      confidence,
      signal_state,
      alert_sent,
      created_at: ago(minutesAgo * MINUTE),
    }),
  );
  return { alerts, muted: false, mutedUntil: null, telegramConfigured: true };
}

// ── L5 monitoring (Reports) ──────────────────────────────────────────────────

/** Brier scores for NOVA-7's latest closed trades: (forecast - outcome)². */
export function demoBrierScores(): Record<string, unknown> {
  const closed = demoTrades().filter((t) => t.outcome === "WIN" || t.outcome === "LOSS").slice(0, 8);
  const scores = closed.map((t, i) => {
    // A winning YES resolved YES; a winning NO resolved NO; losses the other way
    const resolvedYes = (t.outcome === "WIN") === (t.direction === "YES");
    const confident = 0.74 + (i % 3) * 0.04;
    const predicted = t.outcome === "WIN"
      ? (t.direction === "YES" ? confident : 1 - confident)
      : (t.direction === "YES" ? 0.42 : 0.58); // a near miss: it priced the market close to even
    const outcome = resolvedYes ? 1 : 0;
    return {
      id: `demo-resolution-${i + 1}`,
      pipeline_run_id: `demo-run-${i + 1}`,
      market_slug: t.slug,
      question: t.market,
      predicted: round3(predicted),
      outcome,
      brier_score: round3((predicted - outcome) ** 2),
      signal_type: i % 2 === 0 ? "forecast-driven" : "sentiment-driven",
      resolved_at: t.timestamp,
    };
  });
  const avgBrier = scores.length ? round3(scores.reduce((sum, s) => sum + s.brier_score, 0) / scores.length) : 0;
  return { scores, avgBrier, count: scores.length };
}

export function demoAttribution(): Record<string, unknown> {
  const summary = demoSummary() as { alphaDecay: unknown };
  // 29 wins and 16 losses, like the trade report
  const rows: Array<[string, number, number, number]> = [
    ["forecast-driven", 14, 6, 0.064],
    ["liquidity-edge", 5, 3, 0.041],
    ["sentiment-driven", 8, 5, 0.037],
    ["arb", 2, 2, 0.018],
  ];
  return {
    attribution: rows.map(([signalType, wins, losses, avgEdge]) => ({
      signalType,
      wins,
      losses,
      hitRate: round3(wins / (wins + losses)),
      avgEdge,
    })),
    alphaDecay: summary.alphaDecay,
  };
}

export function demoDrift(): Record<string, unknown> {
  return {
    microstructure: { detected: false, avgSpread: 0.021, baseline: 0.03, delta: -0.009 },
    concept: { detected: false, rollingHitRate: 0.63, threshold: 0.45 },
    lastChecked: ago(3 * MINUTE),
  };
}

export function demoCalibration(): Record<string, unknown> {
  return {
    weights: DEMO_AGENT_WEIGHTS.map((w) => ({ ...w, confidence: round2(1 - w.brierScore) })),
  };
}
