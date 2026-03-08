function stubCommonManageAgent(agent: {
  id: string;
  agent_type: "created" | "byo";
  status: "inactive" | "active";
  avatar_emoji: string;
  name: string;
}) {
  cy.intercept("GET", "**/api/v1/agent/me", {
    statusCode: 200,
    body: {
      id: agent.id,
      agent_code: "Q-AGENT-X101",
      status: agent.status,
      name: agent.name,
      avatar_emoji: agent.avatar_emoji,
      animal_type: agent.agent_type === "byo" ? "lobster" : "fox",
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
      deployed_at: agent.status === "active" ? Date.now() : null,
      agent_type: agent.agent_type,
      endpoint_url: agent.agent_type === "byo" ? "https://openclaw.example/webhook" : null,
      agent_url: agent.agent_type === "byo" ? "https://openclaw.example/agents/lobster" : null,
      connection_status: agent.agent_type === "byo" ? "connected" : null,
      last_heartbeat: agent.agent_type === "byo" ? Date.now() : null,
      description: agent.agent_type === "byo" ? "OpenClaw runtime" : null,
      webhook_events: agent.agent_type === "byo" ? ["*"] : [],
      autopilot_enabled: false,
      autopilot_updated_at: null,
    },
  }).as("getMyAgent");

  cy.intercept("GET", "**/api/performance/summary", {
    statusCode: 200,
    body: {
      address: "0x1111111111111111111111111111111111111111",
      usdc: 0,
      onChainUsdc: 0,
      onChainUsdcFormatted: "0.00",
      pol: 0,
      polFormatted: "0.0000",
      totalValue: 0,
      pnl: 0,
      pnlPct: null,
      winRate: 0,
      totalTrades: 0,
      pnlToday: 0,
      pnlTodayPct: null,
      circuitBreakerStatus: "ARMED",
      kellyUtilization: 0,
      drawdown: 0,
      drawdownLimit: 0.15,
      balanceStatus: "unfunded",
      balanceMessage: "Wallet created but no on-chain balance detected yet.",
      fundingStatus: "funding_required",
      fundingMessage: "Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.",
      liveBalanceAvailable: true,
      metrics: {
        currentStreak: 0,
        bestTrade: "",
        bestPnl: 0,
        totalVolume: 0,
      },
      alphaDecay: null,
    },
  }).as("getPerformance");

  cy.intercept("GET", "**/api/wallet/positions", { statusCode: 200, body: [] });
  cy.intercept("GET", "**/api/signals", { statusCode: 200, body: [] });
  cy.intercept("GET", "**/api/v1/risk-config", {
    statusCode: 200,
    body: {
      maxPositionSize: 0.1,
      kellyMultiplier: 0.25,
      drawdownLimit: 0.15,
      agentVarThreshold: 0.05,
    },
  });
  cy.intercept("GET", "**/api/trade", { statusCode: 200, body: { trades: [] } });
  cy.intercept("GET", "**/api/scanner/status", {
    statusCode: 200,
    body: {
      isRunning: false,
      lastScan: new Date().toISOString(),
      scannedToday: 12,
      alertsTriggered: 1,
      marketsChecked: 12,
      tradesToday: 0,
      circuitBreakerTriggered: false,
      paperMode: true,
      scanIntervalMs: 300000,
    },
  });
  cy.intercept("GET", "**/api/scanner/results", { statusCode: 200, body: { ok: true, results: [] } });
  cy.intercept("GET", "**/api/v1/settings/telegram", {
    statusCode: 200,
    body: { chatId: "", botToken: "", hasToken: false },
  });
}

function stubByoPanels(agentId: string) {
  cy.intercept("GET", `**/api/v1/agents/${agentId}/health-score`, {
    statusCode: 200,
    body: {
      success: true,
      data: {
        status: "insufficient_data",
        score: null,
        grade: null,
        components: {
          uptime: null,
          error_rate: null,
          latency: null,
          connection: 100,
        },
        total_requests_24h: 0,
        error_count_24h: 0,
        avg_latency_ms: null,
        connection_status: "connected",
        request_samples_24h: 0,
        heartbeat_samples_24h: 0,
        message: "Not enough BYO telemetry yet.",
      },
    },
  });
  cy.intercept("POST", `**/api/v1/agents/${agentId}/health-check`, {
    statusCode: 200,
    body: { connection_status: "connected" },
  });
  cy.intercept("GET", `**/api/v1/agents/${agentId}/usage`, {
    statusCode: 200,
    body: {
      success: true,
      data: {
        total_requests_24h: 0,
        requests_last_hour: 0,
        error_count_24h: 0,
        error_rate_24h: "0%",
        by_tool: [],
        daily_breakdown: [],
        recent_errors: [],
      },
    },
  });
  cy.intercept("GET", `**/api/v1/agents/${agentId}/activity**`, {
    statusCode: 200,
    body: { success: true, data: [], total: 0, hasMore: false },
  });
  cy.intercept("GET", `**/api/v1/agents/${agentId}/webhook-log**`, {
    statusCode: 200,
    body: { success: true, data: [] },
  });
  cy.intercept("GET", "**/api/v1/api-keys", {
    statusCode: 200,
    body: { keys: [] },
  });
}

function visitManageAgent() {
  cy.visit("/manage-agent", {
    onBeforeLoad(win) {
      win.localStorage.removeItem("autopilot_onboarded");
    },
  });
  cy.wait("@getMyAgent");
  cy.wait("@getPerformance");
}

describe("Manage Agent autopilot control", () => {
  it("renders the dedicated autopilot card above AI Insights and blocks underfunded created agents", () => {
    stubCommonManageAgent({
      id: "agent-created-1",
      agent_type: "created",
      status: "inactive",
      avatar_emoji: "🦊",
      name: "Signal Scout",
    });

    cy.intercept("PATCH", "**/api/v1/agents/agent-created-1/autopilot", {
      statusCode: 409,
      body: {
        error: "AUTOPILOT_FUNDING_REQUIRED",
        message: "Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.",
        wallet_address: "0x1111111111111111111111111111111111111111",
        pol: 0,
        on_chain_usdc: 0,
      },
    }).as("patchAutopilot");

    visitManageAgent();

    cy.get("[data-testid='autopilot-control-card']").should("be.visible");
    cy.contains("Autonomous Trading").should("be.visible");
    cy.contains("AI Insights").should("be.visible");

    cy.get("[data-testid='autopilot-control-card']").then(($card) => {
      cy.contains("AI Insights").then(($insights) => {
        expect($card[0].compareDocumentPosition($insights[0]) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(0);
      });
    });

    cy.get("[data-testid='autopilot-control-card']").find("button[aria-label='Toggle']").click();
    cy.wait("@patchAutopilot");
    cy.contains("Fund Wallet Before Enabling Autopilot").should("be.visible");
    cy.contains("Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.").should("be.visible");
    cy.contains("Copy Wallet Address").should("be.visible");
    cy.get("[data-testid='autopilot-status-bar']").should("not.exist");
  });

  it("shows the same shared autopilot control for BYO agents and enables after funding + onboarding", () => {
    stubCommonManageAgent({
      id: "agent-byo-1",
      agent_type: "byo",
      status: "inactive",
      avatar_emoji: "🦞",
      name: "OpenClaw Lobster",
    });
    stubByoPanels("agent-byo-1");

    let performanceCalls = 0;
    cy.intercept("GET", "**/api/performance/summary", (req) => {
      performanceCalls += 1;
      const funded = performanceCalls > 1;
      req.reply({
        statusCode: 200,
        body: {
          address: "0x1111111111111111111111111111111111111111",
          usdc: funded ? 24 : 0,
          onChainUsdc: funded ? 24 : 0,
          onChainUsdcFormatted: funded ? "24.00" : "0.00",
          pol: funded ? 1.5 : 0,
          polFormatted: funded ? "1.5000" : "0.0000",
          totalValue: funded ? 24 : 0,
          pnl: 0,
          pnlPct: null,
          winRate: 0,
          totalTrades: 0,
          pnlToday: 0,
          pnlTodayPct: null,
          circuitBreakerStatus: "ARMED",
          kellyUtilization: 0,
          drawdown: 0,
          drawdownLimit: 0.15,
          balanceStatus: funded ? "live" : "unfunded",
          balanceMessage: funded ? "Live on-chain USDC balance available." : "Wallet created but no on-chain balance detected yet.",
          fundingStatus: funded ? "ready" : "funding_required",
          fundingMessage: funded
            ? "Wallet has both POL and USDC.e required for autonomous trading."
            : "Deposit POL for Polygon fees and USDC.e for Polymarket trades before enabling autopilot.",
          liveBalanceAvailable: true,
          metrics: {
            currentStreak: 0,
            bestTrade: "",
            bestPnl: 0,
            totalVolume: 0,
          },
          alphaDecay: null,
        },
      });
    }).as("getPerformanceDynamic");

    cy.intercept("PATCH", "**/api/v1/agents/agent-byo-1/autopilot", (req) => {
      expect(req.body.enabled).to.eq(true);
      req.reply({
        statusCode: 200,
        body: {
          ok: true,
          agent_id: "agent-byo-1",
          autopilot_enabled: true,
          autopilot_updated_at: Date.now(),
        },
      });
    }).as("patchAutopilot");

    cy.intercept("POST", "**/api/v1/agents/agent-byo-1/deploy", {
      statusCode: 200,
      body: {
        ok: true,
        status: "active",
        deployed_at: Date.now(),
      },
    }).as("deployAgent");

    visitManageAgent();

    cy.contains("Health Score").should("be.visible");
    cy.get("[data-testid='autopilot-control-card']").find("button[aria-label='Toggle']").click();
    cy.contains("AUTOPILOT MODE").should("be.visible");
    cy.contains("Continuous Scanning").should("be.visible");
    cy.contains("I UNDERSTAND, ENABLE AUTOPILOT").click();
    cy.wait("@patchAutopilot");
    cy.wait("@deployAgent");
    cy.get("[data-testid='autopilot-status-bar']").should("be.visible");
  });
});
