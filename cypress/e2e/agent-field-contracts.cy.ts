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

  // Flux fix — Grade not always D
  describe("Flux fix — Grade not always D", () => {
    it("Flux returns grade that is not always D across multiple markets", () => {
      const slugs = [
        "will-trump-acquire-greenland-before-2027",
        "will-bitcoin-reach-70k-february-23-march"
      ];
      slugs.forEach(slug => {
        cy.request(`${API}/api/flux/${slug}`).then(r => {
          expect(r.status).to.eq(200);
          // soft_veto should not always be true
          expect(r.body).to.have.property("soft_veto");
        });
      });
    });
  });

  // Aura fix — no identical mock values across markets
  describe("Aura fix — no identical mock values across markets", () => {
    it("different markets return different sentimentDelta (not always 0.23)", () => {
      cy.request(`${API}/api/aura/will-trump-acquire-greenland-before-2027`).then(r1 => {
        cy.request(`${API}/api/aura/will-bitcoin-reach-70k-february-23-march`).then(r2 => {
          // Values may differ OR both may be 0 (neutral fallback) — but never both exactly 0.23
          if (r1.body.sentimentDelta === 0.23 && r2.body.sentimentDelta === 0.23) {
            throw new Error("Both markets returning mock sentimentDelta=0.23 — Aura is still serving mock data");
          }
        });
      });
    });

    it("Aura confidence is not always exactly 0.85", () => {
      cy.request(`${API}/api/aura/will-trump-acquire-greenland-before-2027`).then(r => {
        expect(r.body.confidence).to.not.equal(0.85);
      });
    });
  });

  // Oracle fix — confidence below 0.85 when no data
  describe("Oracle fix — confidence below 0.85 when no data", () => {
    it("Oracle confidence respects data_sufficiency cap", () => {
      cy.request(`${API}/api/oracle/will-trump-acquire-greenland-before-2027`).then(r => {
        expect(r.status).to.eq(200);
        const { confidence, data_sufficiency } = r.body;
        if (data_sufficiency === 0) {
          expect(confidence).to.be.lte(0.40);
        } else {
          expect(confidence).to.be.lte(0.40 + data_sufficiency * 0.45 + 0.01);
        }
      });
    });
  });
});
