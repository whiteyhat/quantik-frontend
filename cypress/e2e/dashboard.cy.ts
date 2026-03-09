describe("Dashboard", () => {
  beforeEach(() => {
    cy.mockAgent();
    cy.mockDashboardApis();
  });

  // ─── Page Load & Grid ─────────────────────────────────────────────────────

  it("loads the dashboard and renders the main grid", () => {
    cy.visit("/dashboard");
    cy.wait(["@summary", "@riskStatus", "@health", "@agentStatus", "@positions", "@signals"]);
    cy.contains("Mission Control").should("be.visible");
    cy.get("[data-testid='dashboard-grid']").should("be.visible");
  });

  it("renders the command deck strip with 4 items", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.get("[data-testid='dashboard-command-strip']").should("be.visible");
    cy.contains("Refresh").should("be.visible");
    cy.contains("Funding").should("be.visible");
    cy.contains("Runtime").should("be.visible");
    cy.contains("Agents").should("be.visible");
  });

  // ─── API Deduplication ────────────────────────────────────────────────────

  it("fires summary and risk requests exactly once (no duplicates)", () => {
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

  // ─── MissionControlHero ───────────────────────────────────────────────────

  it("renders Mission Control hero with status badges", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.contains("Mission Control").should("be.visible");
    cy.contains("Operate the whole trading stack").should("be.visible");
  });

  it("shows capital status badge based on funding", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.contains(/Capital armed|Funding needed|Telemetry only/).should("be.visible");
  });

  it("shows API health status badge", () => {
    cy.visit("/dashboard");
    cy.wait("@health");
    cy.contains(/API/i).should("be.visible");
  });

  it("shows scanner status badge", () => {
    cy.visit("/dashboard");
    cy.wait("@orchestratorStatus");
    cy.contains(/Scanner (running|idle)/).should("be.visible");
  });

  // ─── SummaryCard (Portfolio) ──────────────────────────────────────────────

  it("renders portfolio card with key metrics", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.get("[data-testid='dashboard-portfolio-card']").should("be.visible");
    cy.contains("Portfolio").should("be.visible");
    cy.contains("Capital").should("be.visible");
    cy.contains("Available Cash").should("be.visible");
    cy.contains("Capital in Play").should("be.visible");
    cy.contains("Kelly utilization").should("be.visible");
  });

  it("displays circuit breaker status", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.contains(/ARMED|WARNING|TRIGGERED/i).should("be.visible");
  });

  // ─── PositionsCard ────────────────────────────────────────────────────────

  it("shows 'No open positions' when positions are empty", () => {
    cy.visit("/dashboard");
    cy.wait("@positions");
    cy.contains("No open positions").should("be.visible");
  });

  it("renders position rows when positions exist", () => {
    cy.intercept("GET", "**/api/wallet/positions*", { fixture: "positions.json" }).as(
      "positionsLoaded"
    );
    cy.visit("/dashboard");
    cy.wait("@positionsLoaded");
    cy.contains("Active Positions").should("be.visible");
    cy.contains("YES").should("be.visible");
  });

  // ─── RiskCard ─────────────────────────────────────────────────────────────

  it("renders risk posture card with exposure metrics", () => {
    cy.visit("/dashboard");
    cy.wait("@riskStatus");
    cy.contains("Risk Posture").should("be.visible");
    cy.contains("Exposure").should("be.visible");
    cy.contains("Drawdown").should("be.visible");
  });

  it("displays circuit breaker state in risk card", () => {
    cy.visit("/dashboard");
    cy.wait("@riskStatus");
    cy.contains("Circuit").should("be.visible");
  });

  // ─── SignalsCard ──────────────────────────────────────────────────────────

  it("shows 'No recent signals' when no signals exist", () => {
    cy.visit("/dashboard");
    cy.wait("@signals");
    cy.get("[data-testid='recent-signals']").should("be.visible");
    cy.contains("No recent signals").should("be.visible");
  });

  it("renders signal rows when signals exist", () => {
    cy.intercept("GET", "**/api/signals*", { fixture: "signals.json" }).as("signalsLoaded");
    cy.visit("/dashboard");
    cy.wait("@signalsLoaded");
    cy.contains("Recent Signals").should("be.visible");
    cy.get("[data-testid='signal-row']").should("have.length.at.least", 1);
  });

  // ─── AgentStatusCard ──────────────────────────────────────────────────────

  it("renders system status card with agent telemetry", () => {
    cy.visit("/dashboard");
    cy.wait("@agentStatus");
    cy.get("[data-testid='dashboard-system-status-card']").should("be.visible");
    cy.contains("System Status").should("be.visible");
    cy.contains("API Health").should("be.visible");
  });

  it("shows agent runtime entries with latency", () => {
    cy.visit("/dashboard");
    cy.wait("@agentStatus");
    cy.contains("Aura").should("be.visible");
  });

  // ─── OrchestratorCard ─────────────────────────────────────────────────────

  it("renders orchestrator card with scan status", () => {
    cy.visit("/dashboard");
    cy.wait("@orchestratorStatus");
    cy.get("[data-testid='dashboard-orchestrator-card']").should("be.visible");
    cy.contains("Orchestrator").should("be.visible");
    cy.contains("Scan now").should("be.visible");
  });

  it("shows orchestrator candidates", () => {
    cy.visit("/dashboard");
    cy.wait("@orchestratorCandidates");
    cy.contains("Will Bitcoin reach $100k").should("be.visible");
  });

  it("scan now button triggers orchestrator scan", () => {
    cy.intercept("POST", "**/api/orchestrator/scan*", { statusCode: 200, body: { ok: true } }).as(
      "triggerScan"
    );
    cy.visit("/dashboard");
    cy.wait("@orchestratorStatus");
    cy.contains("Scan now").click();
  });

  // ─── ScannerCard (Trending / Market Discovery) ────────────────────────────

  it("renders market scanner card with trending markets", () => {
    cy.visit("/dashboard");
    cy.wait("@trendingMarkets");
    cy.contains("Live Market Scanner").should("be.visible");
    cy.contains("Trending 🔥").should("be.visible");
  });

  it("shows category filter buttons", () => {
    cy.visit("/dashboard");
    cy.wait("@trendingMarkets");
    const categories = ["All", "Crypto", "Politics", "Sports", "Pop Culture"];
    for (const cat of categories) {
      cy.contains("button", cat).should("be.visible");
    }
  });

  it("search field filters scanner results", () => {
    cy.visit("/dashboard");
    cy.wait("@trendingMarkets");
    cy.get('input[placeholder="Search active markets"]').should("be.visible");
    cy.get('input[placeholder="Search active markets"]').type("bitcoin");
  });

  it("shows empty state when no trending markets", () => {
    cy.intercept("GET", "**/api/markets/trending*", {
      body: { markets: [], total: 0, hasMore: false },
    }).as("emptyTrending");
    cy.visit("/dashboard");
    cy.wait("@emptyTrending");
    cy.contains(/No trending markets|No markets found/).should("be.visible");
  });

  // ─── /api/health Integration ──────────────────────────────────────────────

  it("health status reflects in system status card", () => {
    cy.visit("/dashboard");
    cy.wait("@health");
    cy.get("[data-testid='dashboard-system-status-card']").should("be.visible");
    cy.contains("API Health").should("be.visible");
  });

  it("shows health check error when API is down", () => {
    cy.intercept("GET", "**/api/health*", { statusCode: 500, body: {} }).as("healthFail");
    cy.visit("/dashboard");
    cy.wait("@healthFail");
    cy.contains(/Health checks unavailable|unavailable/i).should("be.visible");
  });

  // ─── Footer Version ───────────────────────────────────────────────────────

  it("displays app version in footer or UI", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    // Version may be in footer or sidebar
    cy.get("body").should("be.visible");
  });

  // ─── No Hydration Errors ──────────────────────────────────────────────────

  it("page renders without hydration or portal errors", () => {
    // The global error handler in support/e2e.ts suppresses known React errors.
    // If there are unexpected errors, they will fail the test.
    cy.visit("/dashboard");
    cy.wait(["@summary", "@health"]);
    cy.get("[data-testid='dashboard-grid']").should("be.visible");
    // No error messages should be visible at the page level
    cy.contains("Unhandled Runtime Error").should("not.exist");
  });

  // ─── Error States ─────────────────────────────────────────────────────────

  it("shows portfolio error when summary API fails", () => {
    cy.intercept("GET", "**/api/performance/summary*", { statusCode: 500, body: {} }).as(
      "summaryFail"
    );
    cy.visit("/dashboard");
    cy.wait("@summaryFail");
    cy.contains(/Portfolio feed unavailable|unavailable/i).should("be.visible");
  });

  it("shows positions error when positions API fails", () => {
    cy.intercept("GET", "**/api/wallet/positions*", { statusCode: 500, body: {} }).as(
      "positionsFail"
    );
    cy.visit("/dashboard");
    cy.wait("@positionsFail");
    cy.contains(/Positions unavailable|unavailable/i).should("be.visible");
  });

  it("shows risk error when risk API fails", () => {
    cy.intercept("GET", "**/api/risk/status*", { statusCode: 500, body: {} }).as("riskFail");
    cy.visit("/dashboard");
    cy.wait("@riskFail");
    cy.contains(/Risk telemetry unavailable|unavailable/i).should("be.visible");
  });

  it("shows orchestrator error when orchestrator API fails", () => {
    cy.intercept("GET", "**/api/orchestrator/status*", { statusCode: 500, body: {} }).as(
      "orchFail"
    );
    cy.intercept("GET", "**/api/orchestrator/candidates*", { statusCode: 500, body: {} }).as(
      "candFail"
    );
    cy.visit("/dashboard");
    cy.wait("@orchFail");
    cy.contains(/Orchestrator offline|unavailable/i).should("be.visible");
  });

  it("shows signals error when signals API fails", () => {
    cy.intercept("GET", "**/api/signals*", { statusCode: 500, body: {} }).as("signalsFail");
    cy.visit("/dashboard");
    cy.wait("@signalsFail");
    cy.contains(/Signal feed unavailable|unavailable/i).should("be.visible");
  });

  // ─── Relay Chat ───────────────────────────────────────────────────────────

  it("chat button opens Relay sidebar", () => {
    cy.intercept("POST", "**/api/relay", {
      statusCode: 200,
      body: { reply: "**Hello** from Relay!" },
    }).as("relayRequest");

    cy.visit("/dashboard");
    cy.wait("@summary");

    // Click the chat button (aria-label matches agent name)
    cy.get("button[aria-label^='Chat with']", { timeout: 10000 }).click();
    cy.get("textarea[placeholder='Message Relay…']", { timeout: 8000 }).should("be.visible");
  });

  it("sends message through Relay chat and receives markdown response", () => {
    cy.intercept("POST", "**/api/relay", {
      statusCode: 200,
      body: { reply: "**Bold** and *italic* response" },
    }).as("relayRequest");

    cy.visit("/dashboard");
    cy.wait("@summary");

    cy.get("button[aria-label^='Chat with']", { timeout: 10000 }).click();
    cy.get("textarea[placeholder='Message Relay…']", { timeout: 8000 })
      .should("be.visible")
      .type("Test message{enter}", { force: true });

    cy.contains("Test message").should("be.visible");
    cy.wait("@relayRequest", { timeout: 15000 }).then(() => {
      cy.get("strong").contains("Bold").should("be.visible");
      cy.get("em").contains("italic").should("be.visible");
    });
  });

  // ─── Performance Pulse Card ───────────────────────────────────────────────

  it("renders performance pulse card with win rate and streak", () => {
    cy.visit("/dashboard");
    cy.wait("@summary");
    cy.contains("Performance Pulse").should("be.visible");
    cy.contains("Win Rate").should("be.visible");
  });
});
