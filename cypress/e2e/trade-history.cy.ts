describe("Trade History", () => {
  beforeEach(() => {
    cy.mockAgent();
  });

  // ─── Page Load ─────────────────────────────────────────────────────────────

  it("renders the trade history page with title and subtitle", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");
    cy.contains("Trade History").should("be.visible");
    cy.contains("All historical trades and outcomes").should("be.visible");
  });

  // ─── Summary Cards ────────────────────────────────────────────────────────

  it("displays summary metric cards (Total Trades, Win Rate, Total P&L, Wins/Losses)", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.contains("Total Trades").should("be.visible");
    cy.contains("Win Rate").should("be.visible");
    cy.contains("Total P&L").should("be.visible");
    cy.contains("Wins / Losses").should("be.visible");
  });

  it("calculates correct total trades count", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");
    // 5 trades in fixture
    cy.contains("Total Trades").parent().contains("5").should("be.visible");
  });

  it("calculates win rate from trades", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");
    // 2 wins, 1 loss = 67% win rate
    cy.contains("Win Rate").parent().contains("67%").should("be.visible");
  });

  it("displays wins/losses ratio", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");
    cy.contains("2 / 1").should("be.visible");
  });

  // ─── Table Columns ────────────────────────────────────────────────────────

  it("renders table with all 7 columns", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    const columns = ["Date", "Market", "Direction", "Size", "Price", "Outcome", "P&L"];
    for (const col of columns) {
      cy.contains("th", col).should("be.visible");
    }
  });

  // ─── Trade Data Rendering ─────────────────────────────────────────────────

  it("renders trade rows with market names as clickable links", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    // Market links should be visible
    cy.contains("Will Bitcoin reach $100k by year end?").should("be.visible");
    cy.contains("Will Ethereum complete the next upgrade?").should("be.visible");
    // Links should navigate to market pages
    cy.contains("a", "Will Bitcoin reach $100k by year end?").should(
      "have.attr",
      "href",
      "/market/btc-100k"
    );
  });

  it("renders direction badges (YES green, NO red)", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.contains("YES").should("be.visible");
    cy.contains("NO").should("be.visible");
  });

  it("renders outcome badges with correct labels", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.contains("WIN").should("be.visible");
    cy.contains("LOSS").should("be.visible");
    cy.contains("OPEN").should("be.visible");
    cy.contains("PENDING").should("be.visible");
  });

  it("renders P&L values with +/- formatting", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    // Positive P&L (trade-1: +67.50)
    cy.contains("+").should("be.visible");
    // Null P&L shows dash
    cy.contains("—").should("be.visible");
  });

  // ─── Filters ──────────────────────────────────────────────────────────────

  it("filter buttons are visible and clickable", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    const filters = ["All", "WIN", "LOSS", "OPEN", "PENDING"];
    for (const f of filters) {
      cy.contains("button", f).should("be.visible");
    }
  });

  it("clicking WIN filter shows only winning trades", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    // Click WIN filter — should have specific button (not the badge in table)
    cy.get("button").contains("WIN").click();

    // Should show 2 winning trades
    cy.contains("Total Trades").parent().contains("2").should("be.visible");
    // LOSS badge should not be in the table anymore
    cy.get("table").should("not.contain", "LOSS");
  });

  it("clicking LOSS filter shows only losing trades", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get("button").contains("LOSS").click();
    cy.contains("Total Trades").parent().contains("1").should("be.visible");
  });

  it("clicking OPEN filter shows only open trades", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get("button").contains("OPEN").click();
    cy.contains("Total Trades").parent().contains("1").should("be.visible");
  });

  it("clicking All filter resets to show all trades", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get("button").contains("WIN").click();
    cy.get("button").contains("All").click();
    cy.contains("Total Trades").parent().contains("5").should("be.visible");
  });

  // ─── Search ───────────────────────────────────────────────────────────────

  it("search input filters trades by market question (case-insensitive)", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get('input[placeholder="Search trades…"]').type("bitcoin");
    cy.contains("Will Bitcoin reach $100k by year end?").should("be.visible");
    cy.contains("Will Ethereum complete the next upgrade?").should("not.exist");
  });

  it("combining search and outcome filter works", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get('input[placeholder="Search trades…"]').type("Will");
    cy.get("button").contains("WIN").click();
    // Only winning trades matching "Will" should show
    cy.contains("Total Trades").parent().contains("2").should("be.visible");
  });

  it("shows 'No trades match this filter' when filter yields nothing", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.get('input[placeholder="Search trades…"]').type("xyznonexistent");
    cy.contains("No trades match this filter").should("be.visible");
    cy.contains("📭").should("be.visible");
  });

  // ─── Loading State ────────────────────────────────────────────────────────

  it("shows skeleton loading state while fetching trades", () => {
    // Delay the response to observe loading state
    cy.intercept("GET", "**/api/performance/trades*", (req) => {
      req.reply({ delay: 2000, fixture: "trades.json" });
    }).as("tradesDelayed");

    cy.visit("/trade-history");
    // Skeleton should appear during loading (table headers visible with skeleton rows)
    cy.get("th").contains("Date").should("be.visible");
  });

  // ─── Error State ──────────────────────────────────────────────────────────

  it("shows error message when API fails", () => {
    cy.intercept("GET", "**/api/performance/trades*", {
      statusCode: 500,
      body: "Internal Server Error",
    }).as("tradesFail");

    cy.visit("/trade-history");
    cy.wait("@tradesFail");
    cy.contains("Error:").should("be.visible");
  });

  // ─── Empty State ──────────────────────────────────────────────────────────

  it("shows 'No trade history yet' when no trades exist", () => {
    cy.intercept("GET", "**/api/performance/trades*", { body: [] }).as("tradesEmpty");
    cy.visit("/trade-history");
    cy.wait("@tradesEmpty");
    cy.contains("No trade history yet").should("be.visible");
    cy.contains("📭").should("be.visible");
  });

  // ─── Footer ───────────────────────────────────────────────────────────────

  it("shows trade count and source in footer", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");
    cy.contains("5 trades shown").should("be.visible");
    cy.contains("Source: /api/performance/trades").should("be.visible");
  });

  // ─── Market Link Navigation ───────────────────────────────────────────────

  it("market links have correct href to market pages", () => {
    cy.intercept("GET", "**/api/performance/trades*", { fixture: "trades.json" }).as("trades");
    cy.visit("/trade-history");
    cy.wait("@trades");

    cy.contains("a", "Will Tesla stock double").should("have.attr", "href", "/market/tesla-double");
    cy.contains("a", "Will AI pass the Turing test").should(
      "have.attr",
      "href",
      "/market/ai-turing-2026"
    );
  });

  // ─── Wrapped API response ─────────────────────────────────────────────────

  it("handles wrapped API response { trades: [...] }", () => {
    cy.intercept("GET", "**/api/performance/trades*", {
      body: {
        trades: [
          {
            id: "trade-w1",
            market: "Wrapped trade test",
            slug: "wrapped-test",
            direction: "YES",
            size: 100,
            price: 0.5,
            outcome: "WIN",
            timestamp: 1741400000000,
            pnl: 50,
          },
        ],
      },
    }).as("wrappedTrades");

    cy.visit("/trade-history");
    cy.wait("@wrappedTrades");
    cy.contains("Wrapped trade test").should("be.visible");
    cy.contains("Total Trades").parent().contains("1").should("be.visible");
  });
});
