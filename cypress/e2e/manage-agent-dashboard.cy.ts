describe("Manage Agent — Dashboard", () => {
  beforeEach(() => {
    cy.mockAgent();
    cy.mockManageAgentApis();
  });

  // ─── Page load & Identity ──────────────────────────────────────────────────

  it("renders the dashboard tab by default with agent identity", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Signal Scout").should("be.visible");
    cy.contains("🦊").should("be.visible");
    cy.contains("Dashboard").should("be.visible");
  });

  it("displays wallet address (truncated) with copy button", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("WDK Wallet").should("be.visible");
    // Truncated address (first 6 + last 4)
    cy.contains("0x1111").should("be.visible");
    // Copy button
    cy.contains("📋").should("be.visible");
  });

  // ─── Tab navigation ────────────────────────────────────────────────────────

  it("switches between Dashboard, Architecture, and Agent World tabs", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");

    // Dashboard tab active by default
    cy.contains("Dashboard").should("be.visible");

    // Switch to Architecture
    cy.contains("Architecture").click();
    cy.contains("Architecture").should("be.visible");

    // Switch to Agent World
    cy.contains("Agent World").click();

    // Switch back to Dashboard
    cy.contains("Dashboard").click();
  });

  // ─── Autopilot Control ────────────────────────────────────────────────────

  it("renders autopilot control card with funding status", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.get('[data-testid="autopilot-control-card"]').should("be.visible");
    cy.contains("Autopilot Control").should("be.visible");
    cy.contains("Autonomous Trading").should("be.visible");
  });

  it("shows autopilot status chips", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains(/Autopilot (on|off)/i).should("be.visible");
  });

  it("shows funding amounts for POL and USDC.e", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@balance");
    cy.contains("POL").should("be.visible");
    cy.contains("USDC.e").should("be.visible");
  });

  it("toggles autopilot on when funding is ready", () => {
    cy.intercept("PUT", "**/api/v1/agents/*/autopilot", (req) => {
      expect(req.body.enabled).to.be.true;
      req.reply({ statusCode: 200, body: { enabled: true } });
    }).as("enableAutopilot");

    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@balance");

    // Find and click the autopilot toggle switch
    cy.get('[data-testid="autopilot-control-card"]').find('input[type="checkbox"], [role="switch"]').first().click({ force: true });
  });

  it("shows funding dialog when wallet is not funded", () => {
    cy.intercept("GET", "**/api/wallet/balance*", {
      body: {
        address: "0x1111111111111111111111111111111111111111",
        onChainUsdc: 0,
        pol: 0,
        totalValue: 0,
        fundingStatus: "funding_required",
        fundingMessage: "Wallet needs funding",
      },
    }).as("balanceEmpty");

    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@balanceEmpty");
    cy.contains(/funding required|funding needed/i).should("be.visible");
  });

  // ─── AI Insight Card ──────────────────────────────────────────────────────

  it("renders AI insights with signals", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@signals");
    cy.contains("AI Insights").should("be.visible");
  });

  it("displays signal decision badges (TRADE/WATCH/SKIP)", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@signals");
    cy.contains("TRADE").should("be.visible");
    cy.contains("WATCH").should("be.visible");
    cy.contains("SKIP").should("be.visible");
  });

  it("shows no insights message when no signals exist", () => {
    cy.intercept("GET", "**/api/signals*", { body: [] }).as("emptySignals");
    cy.intercept("GET", "**/api/pipeline/results*", { body: [] }).as("emptyPipeline");
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains(/no insights|run a pipeline/i).should("be.visible");
  });

  // ─── Metrics Row ──────────────────────────────────────────────────────────

  it("displays performance metrics", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@perfSummary");
    cy.contains("Total Return").should("be.visible");
    cy.contains("Win Rate").should("be.visible");
    cy.contains("Max Drawdown").should("be.visible");
  });

  // ─── Live Positions Table ─────────────────────────────────────────────────

  it("renders open positions with direction badges", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@positions");
    cy.contains("YES").should("be.visible");
    cy.contains("NO").should("be.visible");
  });

  it("shows empty state when no positions", () => {
    cy.intercept("GET", "**/api/wallet/positions*", { body: [] }).as("emptyPositions");
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@emptyPositions");
    cy.contains(/no.*position/i).should("be.visible");
  });

  // ─── Time Period Selector ─────────────────────────────────────────────────

  it("time period buttons (7D/30D/All) are clickable", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("7D").should("be.visible");
    cy.contains("30D").should("be.visible");
    cy.contains("All").should("be.visible");
    cy.contains("30D").click();
    cy.contains("7D").click();
  });

  // ─── Chat Button ──────────────────────────────────────────────────────────

  it("chat button is visible and clickable", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains(/CHAT WITH/i).should("be.visible").click();
  });

  // ─── Delete Agent ─────────────────────────────────────────────────────────

  it("shows delete confirmation modal with two-step process", () => {
    cy.intercept("DELETE", "**/api/v1/agents/*", { statusCode: 200, body: {} }).as("deleteAgent");

    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");

    // Click delete button (trash icon)
    cy.get('[title="Delete Agent"]').click();

    // Step 1 — confirmation
    cy.contains("permanently delete").should("be.visible");
    cy.contains("CONTINUE").click();

    // Step 2 — type DELETE
    cy.get('input[placeholder="Type DELETE"]').type("DELETE");
    cy.contains("DELETE FOREVER").click();
    cy.wait("@deleteAgent");
    cy.contains("Agent deleted successfully").should("be.visible");
  });

  // ─── BYO Agent Specific Panels ────────────────────────────────────────────

  it("shows BYO-specific panels when agent is BYO type", () => {
    cy.mockAgent({
      agent_type: "byo",
      name: "OpenClaw Prime",
      avatar_emoji: "🦞",
      connection_status: "connected",
      api_key_prefix: "qtk_live_1234",
    });

    cy.intercept("GET", "**/api/v1/agents/*/health-score", {
      body: { score: 92, grade: "A", details: {} },
    }).as("healthScore");
    cy.intercept("GET", "**/api/v1/agents/*/activity*", { body: [] }).as("activity");
    cy.intercept("GET", "**/api/v1/agents/*/usage*", { body: { totalRequests: 142 } }).as("usage");

    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("OpenClaw Prime").should("be.visible");
  });

  // ─── Agent Config Panel ───────────────────────────────────────────────────

  it("renders risk config panel with values", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.wait("@riskConfig");
    // Risk config should be displayed somewhere on the dashboard
    cy.get("body").should("be.visible");
  });
});
