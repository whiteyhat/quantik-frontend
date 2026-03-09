const SCANNER_SSE = [
  'data: {"type":"trace","key":"signal_scout","label":"Signal Scout","status":"Checking cached scanner results","state":"running"}\n\n',
  'data: {"type":"context","kind":"scanner","data":{"count":2,"newSignalCount":1,"lastScannedAt":1741399200000,"stale":false,"signals":[{"question":"Question for btc-signal","recommendation":"BET_YES","sigmaConfidence":0.87}],"action":{"label":"Refresh signals","message":"Refresh scanner signals now."}}}\n\n',
  'data: {"type":"trace","key":"signal_scout","label":"Signal Scout","status":"Scanner snapshot ready","state":"done"}\n\n',
  'data: {"type":"token","token":"Cached scanner check found 2 live signals. "}\n\n',
  'data: {"type":"token","token":"Top setup is Question for btc-signal. "}\n\n',
  'data: {"type":"done","reply":"Cached scanner check found 2 live signals. Top setup is Question for btc-signal.","latencyMs":120,"model":"fallback","suggestions":["Refresh signals now.","What\'s my portfolio status?"],"contexts":{"scanner":{"count":2,"newSignalCount":1,"lastScannedAt":1741399200000,"stale":false,"signals":[{"question":"Question for btc-signal","recommendation":"BET_YES","sigmaConfidence":0.87}],"action":{"label":"Refresh signals","message":"Refresh scanner signals now."}}}}\n\n',
].join('');

const PORTFOLIO_SSE = [
  'data: {"type":"trace","key":"portfolio_analyst","label":"Portfolio Analyst","status":"Syncing portfolio","state":"running"}\n\n',
  'data: {"type":"context","kind":"portfolio","data":{"totalValue":142.5,"dailyPnl":4.2,"positions":[{"slug":"btc-signal"}],"exposurePct":21.4,"balanceMessage":"Live on-chain USDC balance plus tracked open exposure."}}\n\n',
  'data: {"type":"context","kind":"risk","data":{"circuitBreaker":"ARMED","exposurePct":21.4,"dailyPnl":4.2,"maxPositionSizePct":0.1,"themeExposure":{"crypto":21.4}}}\n\n',
  'data: {"type":"trace","key":"portfolio_analyst","label":"Portfolio Analyst","status":"Portfolio snapshot ready","state":"done"}\n\n',
  'data: {"type":"token","token":"Portfolio value $142.50. "}\n\n',
  'data: {"type":"token","token":"Daily PnL +$4.20. "}\n\n',
  'data: {"type":"done","reply":"Portfolio value $142.50. Daily PnL +$4.20.","latencyMs":95,"model":"fallback","suggestions":["Show my active positions."],"contexts":{"portfolio":{"totalValue":142.5,"dailyPnl":4.2,"positions":[{"slug":"btc-signal"}],"exposurePct":21.4,"balanceMessage":"Live on-chain USDC balance plus tracked open exposure."},"risk":{"circuitBreaker":"ARMED","exposurePct":21.4,"dailyPnl":4.2,"maxPositionSizePct":0.1,"themeExposure":{"crypto":21.4}}}}\n\n',
].join('');

describe("Agent Sidebar Chat 2.0", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/agent/me", {
      statusCode: 200,
      body: {
        id: "agent-123",
        agent_code: "Q-AGENT-321",
        status: "active",
        name: "Signal Scout",
        avatar_emoji: "🦊",
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
        connection_status: "connected",
        autopilot_enabled: true,
      },
    }).as("getMyAgent");

    cy.intercept("GET", "**/api/performance/summary", {
      body: {
        address: "0x1111111111111111111111111111111111111111",
        usdc: 100,
        onChainUsdc: 100,
        pol: 2,
        pnl: 4.2,
        pnlPct: 0.04,
        winRate: 0.55,
        totalTrades: 12,
        pnlToday: 4.2,
        pnlTodayPct: 0.03,
        totalValue: 142.5,
      },
    }).as("portfolio");
  });

  it("renders trace rows and inline scanner logs", () => {
    cy.intercept("POST", "**/api/v1/agent/chat", {
      statusCode: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: SCANNER_SSE,
    }).as("agentChat");

    cy.visit("/dashboard");
    cy.wait("@getMyAgent");

    cy.get('button[aria-label*="Chat with"]', { timeout: 10000 }).click();
    cy.get("[data-testid='relay-sidebar-input']").should("be.visible").type("Any new scanner signals?{enter}");
    cy.wait("@agentChat");

    cy.contains("Signal Scout").should("be.visible");
    cy.get("[data-testid='relay-sidebar-trace']").should("contain", "Signal Scout");
    cy.get("[data-testid='relay-sidebar-context-log']").should("contain", "SCANNER");
    cy.get("[data-testid='relay-sidebar-context-log']").should("contain", "Question for btc-signal");
    cy.get("[data-testid='relay-sidebar-context-toggle']").first().click();
    cy.get("[data-testid='relay-sidebar-context-card']").should("contain", "Scanner");
    cy.contains("Refresh signals").should("be.visible");
    cy.contains("Cached scanner check found 2 live signals").should("be.visible");
  });

  it("shows scoped portfolio and risk cards for portfolio questions", () => {
    cy.intercept("POST", "**/api/v1/agent/chat", {
      statusCode: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: PORTFOLIO_SSE,
    }).as("agentChat");

    cy.visit("/dashboard");
    cy.wait("@getMyAgent");

    cy.get('button[aria-label*="Chat with"]', { timeout: 10000 }).click();
    cy.get("[data-testid='relay-sidebar-input']").type("What's my portfolio status?{enter}");
    cy.wait("@agentChat");

    cy.get("[data-testid='relay-sidebar-context-log']").should("contain", "PORTFOLIO");
    cy.get("[data-testid='relay-sidebar-context-log']").should("contain", "$142.50 total");
    cy.get("[data-testid='relay-sidebar-context-log']").should("contain", "RISK");
    cy.get("[data-testid='relay-sidebar-context-toggle']").first().click();
    cy.get("[data-testid='relay-sidebar-context-card']").should("contain", "Portfolio");
    cy.get("[data-testid='relay-sidebar-context-card']").should("contain", "$142.50");
    cy.contains("Portfolio value $142.50.").should("be.visible");
  });
});
