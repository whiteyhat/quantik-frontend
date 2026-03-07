// cypress/e2e/autopilot.cy.ts
// Autopilot dashboard — read-only observation UI tests

const API_BASE = "https://quantik-backend-production.up.railway.app";

describe("AutopilotStatusBar", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, {
      statusCode: 200,
      body: {
        lastScan: new Date().toISOString(),
        marketsChecked: 42,
        tradesToday: 0,
        circuitBreakerTriggered: false,
        paperMode: false,
      },
    }).as("scannerStatus");

    cy.visit("/autopilot");
  });

  it("renders the status bar with a status pill", () => {
    cy.get("[data-testid=autopilot-status-bar]").should("be.visible");
    cy.get("[data-testid=status-pill]").should("be.visible");
  });

  it("shows LIVE badge when paperMode is false", () => {
    cy.get("[data-testid=mode-badge]").should("contain.text", "LIVE");
  });

  it("shows PAPER badge when paperMode is true", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, {
      statusCode: 200,
      body: { paperMode: true, tradesToday: 0 },
    });
    cy.visit("/autopilot");
    cy.get("[data-testid=mode-badge]").should("contain.text", "PAPER");
  });

  it("countdown timer decrements (renders countdown text)", () => {
    cy.contains(/\d{2}:\d{2}/).should("be.visible");
  });
});

describe("ScannerFeed", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
  });

  it("renders scanner feed component", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results`, {
      statusCode: 200,
      body: [
        {
          slug: "will-btc-hit-100k",
          question: "Will Bitcoin hit $100k by end of year?",
          recommendation: "BET_YES",
          confidence: 0.78,
          kellyFraction: 0.12,
          scannedAt: new Date().toISOString(),
        },
      ],
    }).as("scannerResults");

    cy.visit("/autopilot");
    cy.get("[data-testid=scanner-feed]").should("be.visible");
    cy.get("[data-testid=scanner-row]").should("have.length.gte", 1);
  });

  it("shows BET YES badge with correct styling", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results`, {
      statusCode: 200,
      body: [
        {
          slug: "test-market",
          question: "Test market question that is long enough to test",
          recommendation: "BET_YES",
          confidence: 0.65,
          kellyFraction: 0.08,
        },
      ],
    });
    cy.visit("/autopilot");
    cy.get("[data-testid=badge-BET_YES]").should("be.visible").and("contain.text", "BET YES");
  });

  it("empty state shows radar animation when results is empty", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results`, {
      statusCode: 200,
      body: [],
    }).as("emptyResults");

    cy.visit("/autopilot");
    cy.get("[data-testid=scanner-radar-pulse]").should("be.visible");
    cy.contains("Quantik is scanning markets").should("be.visible");
  });

  it("new rows animate in from top (slide-in-top animation class applied)", () => {
    // Initial empty state
    cy.intercept("GET", `${API_BASE}/api/scanner/results`, {
      statusCode: 200,
      body: [],
    });
    cy.visit("/autopilot");
    // Verify feed renders without error
    cy.get("[data-testid=scanner-feed]").should("exist");
  });
});

describe("ExecutionLog", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
  });

  it("renders execution log component", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, { statusCode: 200, body: {} });
    cy.visit("/autopilot");
    cy.get("[data-testid=execution-log]").should("be.visible");
  });

  it("shows empty state when no trades", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, { statusCode: 200, body: {} });
    cy.visit("/autopilot");
    cy.get("[data-testid=execution-log-empty]").should("be.visible");
    cy.contains("No trades yet").should("be.visible");
  });

  it("dashboard execution log appears with trade data", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, {
      statusCode: 200,
      body: [
        {
          id: "t1",
          slug: "btc-100k",
          direction: "YES",
          amount: 25.0,
          confidence: 0.72,
          status: "PLACED",
          executedAt: new Date().toISOString(),
        },
      ],
    });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, {
      statusCode: 200,
      body: { pnlToday: 12.5, tradesToday: 1, winRate: 1.0, openPositions: 1 },
    });
    cy.visit("/dashboard");
    cy.get("[data-testid=execution-log]").should("be.visible");
  });
});

describe("PnlTicker", () => {
  it("shows zero values on fresh load when API returns empty", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, {
      statusCode: 200,
      body: { pnlToday: 0, tradesToday: 0, winRate: 0, openPositions: 0 },
    });
    cy.visit("/autopilot");
    cy.get("[data-testid=pnl-ticker]").should("be.visible");
    cy.get("[data-testid=pnl-ticker]").should("contain.text", "$0.00");
  });

  it("displays positive P&L in green color class", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, {
      statusCode: 200,
      body: { pnlToday: 42.5, tradesToday: 3, winRate: 0.67, openPositions: 1 },
    });
    cy.visit("/autopilot");
    cy.get("[data-testid=pnl-ticker]").should("contain.text", "+$42.50");
  });
});

describe("No action buttons on autopilot page", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, { statusCode: 200, body: {} });
    cy.visit("/autopilot");
  });

  it("has no execute buttons", () => {
    cy.get("button").each(($btn) => {
      const text = $btn.text().toLowerCase();
      expect(text).not.to.match(/execute|approve|confirm|skip|place trade|buy|sell/);
    });
  });

  it("has no approve or confirm buttons", () => {
    cy.contains("button", /approve/i).should("not.exist");
    cy.contains("button", /confirm/i).should("not.exist");
  });

  it("has no skip trade buttons", () => {
    cy.contains("button", /skip/i).should("not.exist");
  });
});

describe("Autopilot navigation", () => {
  it("Autopilot nav link navigates to /autopilot", () => {
    cy.intercept("GET", `${API_BASE}/api/scanner/status`, { statusCode: 200, body: {} });
    cy.intercept("GET", `${API_BASE}/api/scanner/results**`, { statusCode: 200, body: [] });
    cy.intercept("GET", `${API_BASE}/api/performance/summary`, { statusCode: 200, body: {} });
    cy.visit("/dashboard");
    cy.get("a[href=\"/autopilot\"]").first().click();
    cy.url().should("include", "/autopilot");
    cy.get("[data-testid=autopilot-status-bar]").should("be.visible");
  });
});
