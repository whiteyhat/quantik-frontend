describe("Orchestrator", () => {
  // ── Dashboard panel test ────────────────────────────────────

  it("Dashboard renders OrchestratorPanel with candidate rows", () => {
    // Intercept API calls for predictable rendering
    cy.intercept("GET", "**/api/orchestrator/status", {
      statusCode: 200,
      body: {
        lastScanAt: Date.now() - 60000,
        nextScanAt: Date.now() + 540000,
        marketsScanned: 5000,
        candidatesFound: 12,
        scanIntervalMs: 600000,
        status: "idle",
      },
    }).as("orchStatus");

    cy.intercept("GET", "**/api/orchestrator/candidates", {
      statusCode: 200,
      body: {
        candidates: [
          {
            slug: "test-market-1",
            tokenId: "tok-1",
            question: "Will the test pass?",
            opportunityScore: 85.2,
            components: { volume: 90, priceMove: 80, liquidity: 70, recency: 100 },
            triggers: ["volume_spike"],
            scoredAt: Date.now(),
          },
          {
            slug: "test-market-2",
            tokenId: "tok-2",
            question: "Another test market for scoring",
            opportunityScore: 62.5,
            components: { volume: 60, priceMove: 50, liquidity: 70, recency: 40 },
            triggers: [],
            scoredAt: Date.now(),
          },
        ],
        total: 2,
        scanCycle: 1,
      },
    }).as("orchCandidates");

    // Also intercept the markets call for dashboard
    cy.intercept("GET", "**/api/markets*", { body: { markets: [], total: 0, hasMore: false } }).as("markets");
    cy.intercept("GET", "**/api/portfolio/summary", { body: {} }).as("portfolio");

    cy.visit("/");
    cy.wait(["@orchStatus", "@orchCandidates"]);

    // Verify panel header
    cy.contains("Orchestrator").should("be.visible");
    cy.contains("Tier 0 scanner").should("be.visible");

    // Verify status bar
    cy.contains(/5,?000 markets scanned/).should("be.visible");
    cy.contains("12 candidates").should("be.visible");

    // Verify candidate rows
    cy.contains("Will the test pass?").should("be.visible");
    cy.contains("85").should("be.visible"); // score badge
    cy.contains("volume spike").should("be.visible"); // trigger tag

    // Verify "Scan now" button exists
    cy.contains("Scan now").should("be.visible");
  });
});
