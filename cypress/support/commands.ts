/* eslint-disable @typescript-eslint/no-namespace */
// ─── Custom Cypress Commands ─────────────────────────────────────────────────

const STANDARD_AGENT = {
  id: "agent-std-1",
  agent_code: "Q-AGENT-X101",
  status: "active",
  name: "Signal Scout",
  avatar_emoji: "🦊",
  animal_type: "fox",
  agent_type: "standard",
  avatar_image: null,
  personality: "balanced",
  decision_style: "analyst",
  trading_instinct: "value_hunter",
  time_patience: "swing",
  profit_dream: "wealth_builder",
  money_approach: "smart_scaling",
  protection_mindset: "flexible",
  leverage_vibe: "none",
  market_sense: "fixed_rules",
  asset_love: "crypto",
  wallet_address: "0x1111111111111111111111111111111111111111",
  created_at: Date.now(),
  updated_at: Date.now(),
  deployed_at: Date.now(),
  autopilot_enabled: false,
};

const DEFAULT_WALLET = {
  address: "0x1111111111111111111111111111111111111111",
  privateKey: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  seedPhrase: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
};

Cypress.Commands.add("mockAgent", (overrides = {}) => {
  const agent = { ...STANDARD_AGENT, ...overrides };
  cy.intercept("GET", "**/api/v1/agent/me", { statusCode: 200, body: agent }).as("getMyAgent");
});

Cypress.Commands.add("mockNoAgent", () => {
  cy.intercept("GET", "**/api/v1/agent/me", {
    statusCode: 404,
    body: { error: "No agent configured" },
  }).as("getMyAgent");
});

Cypress.Commands.add("mockWallet", (overrides = {}) => {
  const wallet = { ...DEFAULT_WALLET, ...overrides };
  cy.intercept("POST", "**/api/wallet/generate", { statusCode: 200, body: wallet }).as(
    "generateWallet"
  );
  return cy.wrap(wallet);
});

Cypress.Commands.add("mockDashboardApis", () => {
  cy.intercept("GET", "**/api/performance/summary*", { fixture: "portfolio.json" }).as("summary");
  cy.intercept("GET", "**/api/risk/status*", {
    body: {
      circuitBreaker: "ARMED",
      dailyPnl: 200,
      dailyPnlPct: 2,
      exposurePct: 24.3,
      availableCapital: 5400,
    },
  }).as("riskStatus");
  cy.intercept("GET", "**/api/v1/risk-config*", { fixture: "risk-config.json" }).as("riskConfig");
  cy.intercept("GET", "**/api/health*", {
    body: {
      status: "healthy",
      checkedAt: Date.now(),
      message: "All mission systems nominal",
      services: {
        backend: { status: "healthy", detail: "API online and serving dashboard telemetry" },
        relay: { status: "healthy", detail: "2 active sessions" },
        scanner: { status: "healthy", detail: "Last scan 2m ago" },
        orchestrator: { status: "healthy", detail: "2 candidates, last scan 1m ago" },
        pipeline_agents: { status: "degraded", detail: "6 live · 1 degraded · 0 down" },
      },
    },
  }).as("health");
  cy.intercept("GET", "**/api/agents/health*", { fixture: "system-agent-health.json" }).as("agentHealth");
  cy.intercept("GET", "**/api/wallet/positions*", { body: [] }).as("positions");
  cy.intercept("GET", "**/api/signals*", { body: [] }).as("signals");
  cy.intercept("GET", "**/api/orchestrator/status*", {
    body: {
      lastScanAt: Date.now() - 60_000,
      nextScanAt: Date.now() + 240_000,
      marketsScanned: 5000,
      candidatesFound: 2,
      scanIntervalMs: 300000,
      status: "idle",
    },
  }).as("orchestratorStatus");
  cy.intercept("GET", "**/api/orchestrator/candidates*", {
    fixture: "orchestrator-candidates.json",
  }).as("orchestratorCandidates");
  cy.intercept("GET", "**/api/markets/trending*", { fixture: "trending-markets.json" }).as(
    "trendingMarkets"
  );
  cy.intercept("GET", "**/api/stream/prices*", { body: {} }).as("streamPrices");
});

Cypress.Commands.add("mockManageAgentApis", () => {
  cy.intercept("GET", "**/api/wallet/balance*", { fixture: "balance.json" }).as("balance");
  cy.intercept("GET", "**/api/wallet/positions*", { fixture: "positions.json" }).as("positions");
  cy.intercept("GET", "**/api/signals*", { fixture: "signals.json" }).as("signals");
  cy.intercept("GET", "**/api/performance/summary*", {
    fixture: "performance-summary.json",
  }).as("perfSummary");
  cy.intercept("GET", "**/api/v1/risk-config*", { fixture: "risk-config.json" }).as("riskConfig");
  cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
  cy.intercept("GET", "**/api/execution/log*", { body: [] }).as("execLog");
  cy.intercept("GET", "**/api/scanner/status*", {
    body: { status: "idle", lastScanAt: Date.now() },
  }).as("scannerStatus");
  cy.intercept("GET", "**/api/scanner/results*", { body: [] }).as("scannerResults");
  cy.intercept("GET", "**/api/pipeline/history*", { body: [] }).as("pipelineHistory");
  cy.intercept("GET", "**/api/stream/prices*", { body: {} }).as("streamPrices");
});

// ─── Type declarations ───────────────────────────────────────────────────────

declare namespace Cypress {
  interface Chainable {
    mockAgent(overrides?: Record<string, unknown>): Chainable<void>;
    mockNoAgent(): Chainable<void>;
    mockWallet(overrides?: Record<string, unknown>): Chainable<typeof DEFAULT_WALLET>;
    mockDashboardApis(): Chainable<void>;
    mockManageAgentApis(): Chainable<void>;
  }
}
