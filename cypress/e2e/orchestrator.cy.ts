describe("Orchestrator", () => {
  const API = Cypress.env("API_URL") || "http://localhost:3001";

  // ── API endpoint tests ──────────────────────────────────────

  it("GET /api/orchestrator/status returns valid data", () => {
    cy.request(`${API}/api/orchestrator/status`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("lastScanAt");
      expect(res.body).to.have.property("nextScanAt");
      expect(res.body).to.have.property("marketsScanned");
      expect(res.body).to.have.property("candidatesFound");
      expect(res.body).to.have.property("scanIntervalMs", 600000);
      expect(res.body).to.have.property("status");
      expect(["idle", "scanning"]).to.include(res.body.status);
    });
  });

  it("GET /api/orchestrator/candidates returns ranked list", () => {
    cy.request(`${API}/api/orchestrator/candidates`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("candidates");
      expect(res.body).to.have.property("total");
      expect(res.body).to.have.property("scanCycle");
      expect(res.body.candidates).to.be.an("array");

      // If candidates exist, verify they are ranked descending
      const candidates = res.body.candidates;
      if (candidates.length > 1) {
        for (let i = 1; i < candidates.length; i++) {
          expect(candidates[i - 1].opportunityScore).to.be.gte(
            candidates[i].opportunityScore
          );
        }
      }

      // Verify candidate shape
      if (candidates.length > 0) {
        const c = candidates[0];
        expect(c).to.have.property("slug");
        expect(c).to.have.property("opportunityScore");
        expect(c).to.have.property("components");
        expect(c.components).to.have.property("volume");
        expect(c.components).to.have.property("priceMove");
        expect(c.components).to.have.property("liquidity");
        expect(c.components).to.have.property("recency");
        expect(c).to.have.property("triggers");
        expect(c.triggers).to.be.an("array");
      }
    });
  });

  it("POST /api/orchestrator/scan triggers a manual scan", () => {
    cy.request({ method: "POST", url: `${API}/api/orchestrator/scan`, timeout: 60000 }).then(
      (res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("triggered", true);
        expect(res.body).to.have.property("marketsScanned");
        expect(res.body.marketsScanned).to.be.a("number");
        expect(res.body).to.have.property("candidatesFound");
        expect(res.body.candidatesFound).to.be.a("number");
      }
    );
  });

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

    cy.visit("/");
    cy.wait(["@orchStatus", "@orchCandidates"]);

    // Verify panel header
    cy.contains("Orchestrator").should("be.visible");
    cy.contains("Tier 0 scanner").should("be.visible");

    // Verify status bar
    cy.contains("5,000 markets scanned").should("be.visible");
    cy.contains("12 candidates").should("be.visible");

    // Verify candidate rows
    cy.contains("Will the test pass?").should("be.visible");
    cy.contains("85").should("be.visible"); // score badge
    cy.contains("volume spike").should("be.visible"); // trigger tag

    // Verify "Scan now" button exists
    cy.contains("Scan now").should("be.visible");
  });
});
