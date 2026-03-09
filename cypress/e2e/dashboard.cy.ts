describe("Dashboard", () => {
  beforeEach(() => {
    cy.mockAgent();
    cy.mockDashboardApis();
  });

  it("loads the dashboard mission control grid", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@riskStatus", "@health", "@agentHealth", "@positions", "@signals"]);
    cy.contains("Mission Control").should("be.visible");
    cy.get("[data-testid='dashboard-grid']").should("be.visible");
  });

  it("renders the mission rail with live telemetry tiles", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@health", "@agentHealth"]);
    cy.get("[data-testid='dashboard-command-strip']").should("be.visible");
    cy.contains("Refresh cadence").should("be.visible");
    cy.contains("Capital posture").should("be.visible");
    cy.contains("Runtime fabric").should("be.visible");
    cy.contains("Agent traffic").should("be.visible");
  });

  it("fires summary and risk requests exactly once per refresh cycle", () => {
    let summaryRequests = 0;
    let riskRequests = 0;

    cy.intercept("GET", "**/api/performance/summary*", (req) => {
      summaryRequests += 1;
      req.reply({ fixture: "portfolio.json" });
    }).as("summaryDedup");

    cy.intercept("GET", "**/api/risk/status*", (req) => {
      riskRequests += 1;
      req.reply({
        body: {
          circuitBreaker: "ARMED",
          dailyPnl: 200,
          dailyPnlPct: 2,
          exposurePct: 24.3,
          availableCapital: 5400,
        },
      });
    }).as("riskDedup");

    cy.visit("/dashboard");
    cy.wait(["@summaryDedup", "@riskDedup"]);

    cy.then(() => {
      expect(summaryRequests).to.eq(1);
      expect(riskRequests).to.eq(1);
    });
  });

  it("renders the hero, portfolio, and risk surfaces", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@riskStatus"]);
    cy.contains("Operate the whole trading stack").should("be.visible");
    cy.get("[data-testid='dashboard-portfolio-card']").should("be.visible");
    cy.contains("Portfolio").should("be.visible");
    cy.contains("Available Cash").should("be.visible");
    cy.contains("Capital in Play").should("be.visible");
    cy.contains("Risk Posture").should("be.visible");
    cy.contains("Exposure").should("be.visible");
    cy.contains("Drawdown").should("be.visible");
  });

  it("shows no open positions when the wallet is flat", () => {
    cy.visit("/dashboard");
    cy.wait("@positions");
    cy.contains("No open positions").should("be.visible");
  });

  it("renders open position rows when positions exist", () => {
    cy.intercept("GET", "**/api/wallet/positions*", { fixture: "positions.json" }).as(
      "positionsLoaded"
    );

    cy.visit("/dashboard");
    cy.wait("@positionsLoaded");
    cy.contains("Active Positions").should("be.visible");
    cy.contains("YES").should("be.visible");
  });

  it("renders orchestrator controls and scanner candidates", () => {
    cy.visit("/dashboard");
    cy.wait(["@orchestratorStatus", "@orchestratorCandidates"]);
    cy.get("[data-testid='dashboard-orchestrator-card']").should("be.visible");
    cy.contains("Orchestrator").should("be.visible");
    cy.contains("Scan now").should("be.visible");
    cy.contains("Will Bitcoin reach $100k").should("be.visible");
  });

  it("scan now triggers an orchestrator scan", () => {
    cy.intercept("POST", "**/api/orchestrator/scan*", {
      statusCode: 200,
      body: { triggered: true, marketsScanned: 25, candidatesFound: 4 },
    }).as("triggerScan");

    cy.visit("/dashboard");
    cy.wait("@orchestratorStatus");
    cy.contains("Scan now").click();
    cy.wait("@triggerScan");
  });

  it("renders the market scanner with explicit trending state", () => {
    cy.visit("/dashboard");
    cy.wait("@trendingMarkets");
    cy.contains("Live Market Scanner").should("be.visible");
    cy.contains("Trending stays explicit").should("be.visible");
    cy.contains("button", "Trending 🔥").should("be.visible");
    cy.get('input[placeholder="Search active markets"]').should("be.visible");
  });

  it("shows a CTA when the trending feed is empty", () => {
    cy.intercept("GET", "**/api/markets/trending*", {
      body: { markets: [], total: 0, hasMore: false },
    }).as("emptyTrending");

    cy.visit("/dashboard");
    cy.wait("@emptyTrending");
    cy.contains(/No trending markets|No trending matches/).should("be.visible");
    cy.contains("Browse all markets").should("be.visible");
  });

  it("renders structured service health and live agent telemetry", () => {
    cy.visit("/dashboard");
    cy.wait(["@health", "@agentHealth"]);
    cy.get("[data-testid='dashboard-system-status-card']").should("be.visible");
    cy.contains("System Status").should("be.visible");
    cy.contains("API Health").should("be.visible");
    cy.contains("Service Map").should("be.visible");
    cy.contains("Pipeline Agents").should("be.visible");
    cy.contains("Aura").should("be.visible");
    cy.contains("Oracle").should("be.visible");
  });

  it("shows a deliberate empty state when there is no agent traffic yet", () => {
    cy.intercept("GET", "**/api/agents/health*", {
      body: {
        overall: "down",
        checkedAt: Date.now(),
        agents: [
          { name: "aura", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "flux", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "oracle", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "edge", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "sigma", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "clause", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
          { name: "lucifer", status: "down", lastActiveAt: 0, latencyMs: 0, errorRate: 1 },
        ],
      },
    }).as("quietAgents");

    cy.visit("/dashboard");
    cy.wait("@quietAgents");
    cy.contains("No agent traffic yet").should("be.visible");
  });

  it("renders the architecture mini-map and pilot deck", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@agentHealth", "@getMyAgent"]);
    cy.contains("Neural Web Mini-Map").should("be.visible");
    cy.get("[data-testid='dashboard-pilot-deck-card']").should("be.visible");
    cy.contains("Pilot Deck").should("be.visible");
    cy.contains("Created-agent posture").should("be.visible");
  });

  it("renders BYO pilot deck runtime health when a connected external agent is active", () => {
    cy.mockAgent({
      agent_type: "byo",
      name: "Mercury",
      agent_code: "BYO-009",
      connection_status: "connected",
      autopilot_enabled: true,
      description: "Connected via external runtime bridge",
    });
    cy.intercept("GET", "**/api/v1/agents/*/health-score", {
      body: {
        success: true,
        data: {
          score: 91,
          status: "healthy",
          message: "Runtime is healthy and streaming events.",
        },
      },
    }).as("healthScore");

    cy.visit("/dashboard");
    cy.wait(["@getMyAgent", "@healthScore"]);
    cy.get("[data-testid='dashboard-pilot-deck-card']").should("be.visible");
    cy.contains("Runtime health").should("be.visible");
    cy.contains("connected").should("be.visible");
    cy.contains("Runtime is healthy and streaming events.").should("be.visible");
  });

  it("shows an empty recent-signals state when there are no fresh decisions", () => {
    cy.visit("/dashboard");
    cy.wait("@signals");
    cy.get("[data-testid='recent-signals']").should("be.visible");
    cy.contains("No recent signals").should("be.visible");
  });

  it("renders signal rows when the feed returns entries", () => {
    cy.intercept("GET", "**/api/signals*", { fixture: "signals.json" }).as("signalsLoaded");

    cy.visit("/dashboard");
    cy.wait("@signalsLoaded");
    cy.contains("Recent Signals").should("be.visible");
    cy.get("[data-testid='signal-row']").should("have.length.at.least", 1);
  });

  it("shows health error messaging when /api/health fails", () => {
    cy.intercept("GET", "**/api/health*", { statusCode: 500, body: {} }).as("healthFail");

    cy.visit("/dashboard");
    cy.wait("@healthFail");
    cy.contains(/Health checks unavailable|unavailable/i).should("be.visible");
  });

  it("shows dashboard card error states when core feeds fail", () => {
    cy.intercept("GET", "**/api/performance/summary*", { statusCode: 500, body: {} }).as(
      "summaryFail"
    );
    cy.intercept("GET", "**/api/wallet/positions*", { statusCode: 500, body: {} }).as(
      "positionsFail"
    );
    cy.intercept("GET", "**/api/risk/status*", { statusCode: 500, body: {} }).as("riskFail");
    cy.intercept("GET", "**/api/orchestrator/status*", { statusCode: 500, body: {} }).as(
      "orchestratorFail"
    );
    cy.intercept("GET", "**/api/orchestrator/candidates*", { statusCode: 500, body: {} }).as(
      "candidateFail"
    );
    cy.intercept("GET", "**/api/signals*", { statusCode: 500, body: {} }).as("signalsFail");

    cy.visit("/dashboard");
    cy.wait([
      "@summaryFail",
      "@positionsFail",
      "@riskFail",
      "@orchestratorFail",
      "@candidateFail",
      "@signalsFail",
    ]);
    cy.contains(/Portfolio feed unavailable|unavailable/i).should("be.visible");
    cy.contains(/Positions unavailable|unavailable/i).should("be.visible");
    cy.contains(/Risk telemetry unavailable|unavailable/i).should("be.visible");
    cy.contains(/Orchestrator offline|unavailable/i).should("be.visible");
    cy.contains(/Signal feed unavailable|unavailable/i).should("be.visible");
  });

  it("renders without hydration or page-level runtime errors", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@health"]);
    cy.get("[data-testid='dashboard-grid']").should("be.visible");
    cy.contains("Unhandled Runtime Error").should("not.exist");
  });
});
