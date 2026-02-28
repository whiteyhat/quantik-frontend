/**
 * agent-field-contracts.cy.ts
 * Guards against field name mismatches between agent API responses and scanner expectations.
 * These tests caught the GAP-1 regression where Oracle/Edge/Clause field names
 * didn't match what runRealPipeline expected.
 */

const API = Cypress.env("API_URL") || "https://quantik-backend-production.up.railway.app";
const TEST_SLUG = "will-trump-acquire-greenland-before-2027";

describe("Agent Field Contracts", () => {
  // Oracle
  describe("Oracle /api/oracle/:slug", () => {
    it("returns 200 with numeric confidence", () => {
      cy.request(`${API}/api/oracle/${TEST_SLUG}`).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body).to.have.property("confidence").that.is.a("number");
        expect(r.body.confidence).to.be.gte(0).and.lte(1);
        expect(r.body).to.have.property("marketSlug");
      });
    });
  });

  // Edge
  describe("Edge /api/edge/:slug", () => {
    it("returns fractional_kelly and position_size (not kelly_fraction/kelly_amount)", () => {
      cy.request(`${API}/api/edge/${TEST_SLUG}`).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body).to.have.property("fractional_kelly").that.is.a("number");
        expect(r.body).to.have.property("position_size").that.is.a("number");
        expect(["YES", "NO"]).to.include(r.body.direction);
      });
    });
  });

  // Clause
  describe("Clause /api/clause/:slug", () => {
    it("returns riskLevel (camelCase) veto and resolutionCriteria", () => {
      cy.request(`${API}/api/clause/${TEST_SLUG}`).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body).to.have.property("riskLevel");
        expect(r.body).to.have.property("veto").that.is.a("boolean");
        expect(r.body).to.have.property("resolutionCriteria").that.is.a("string");
      });
    });
  });

  // Performance
  describe("Performance /api/performance/summary", () => {
    it("returns 200 with all required numeric fields", () => {
      cy.request(`${API}/api/performance/summary`).then((r) => {
        expect(r.status).to.eq(200);
        const b = r.body;
        expect(b).to.have.property("pnlToday").that.is.a("number");
        expect(b).to.have.property("tradesToday").that.is.a("number");
        expect(b).to.have.property("winRate").that.is.a("number");
        expect(b).to.have.property("openPositions").that.is.a("number");
        expect(b.winRate).to.be.gte(0).and.lte(1);
        expect(b.pnlToday).to.not.equal(undefined);
        expect(b.tradesToday).to.not.equal(undefined);
      });
    });
  });

  // Scanner
  describe("Scanner /api/scanner/results", () => {
    it("returns results with non-null sigma_confidence for non-SKIP markets", () => {
      cy.request(`${API}/api/scanner/results`).then((r) => {
        expect(r.status).to.eq(200);
        const results = Array.isArray(r.body) ? r.body : r.body.results ?? [];
        const nonSkip = results.filter((x: any) => x.recommendation !== "SKIP");
        nonSkip.forEach((row: any) => {
          expect(row.sigma_confidence).to.be.a("number");
          expect(row.kelly_fraction).to.be.a("number");
        });
      });
    });
  });
});
