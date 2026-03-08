// cypress/e2e/autopilot.cy.ts
// Autopilot toggle + onboarding modal tests (integrated into Manage Agent)

const API_BASE = "https://quantik-backend-production.up.railway.app";

// Stub the agent endpoint so manage-agent page renders the config panel
function stubAgentAndVisit() {
  cy.intercept("GET", `${API_BASE}/api/agents/me`, {
    statusCode: 200,
    body: {
      id: "agent-1",
      name: "TestBot",
      agent_code: "TB-001",
      avatar_emoji: "🤖",
      status: "active",
      agent_type: "created",
      personality: "balanced",
      decision_style: "analyst",
      trading_instinct: "trend_chaser",
      time_patience: "swing",
      money_approach: "smart_scaling",
      asset_love: "crypto",
      protection_mindset: "flexible",
      leverage_vibe: "moderate",
    },
  }).as("getAgent");

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

  cy.intercept("GET", `${API_BASE}/api/scanner/results`, {
    statusCode: 200,
    body: [],
  }).as("scannerResults");

  cy.intercept("GET", `${API_BASE}/api/wallet/balance`, { statusCode: 200, body: { balance: 100 } });
  cy.intercept("GET", `${API_BASE}/api/positions`, { statusCode: 200, body: [] });
  cy.intercept("GET", `${API_BASE}/api/trades**`, { statusCode: 200, body: [] });
  cy.intercept("GET", `${API_BASE}/api/signals**`, { statusCode: 200, body: [] });
  cy.intercept("GET", `${API_BASE}/api/risk-config`, { statusCode: 200, body: { drawdownLimit: 0.1, maxPositionSize: 0.15, kellyMultiplier: 0.5 } });
  cy.intercept("GET", `${API_BASE}/api/performance/summary`, { statusCode: 200, body: {} });

  cy.visit("/manage-agent");
}

describe("Autopilot toggle in Manage Agent", () => {
  beforeEach(() => {
    localStorage.removeItem("autopilot_onboarded");
    stubAgentAndVisit();
  });

  it("shows AUTOPILOT toggle in agent config panel", () => {
    cy.contains("AUTOPILOT").should("be.visible");
  });

  it("shows onboarding modal on first toggle", () => {
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.contains("AUTOPILOT MODE").should("be.visible");
    cy.contains("Full Consensus Execution").should("be.visible");
    cy.contains("I UNDERSTAND, ENABLE AUTOPILOT").should("be.visible");
  });

  it("cancel on modal keeps autopilot off", () => {
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.contains("CANCEL").click();
    cy.get("[data-testid=autopilot-status-bar]").should("not.exist");
  });

  it("confirm on modal enables autopilot and shows status bar", () => {
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.contains("I UNDERSTAND, ENABLE AUTOPILOT").click();
    cy.get("[data-testid=autopilot-status-bar]").should("be.visible");
  });

  it("skips modal on subsequent toggles after onboarding", () => {
    // First time — onboard
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.contains("I UNDERSTAND, ENABLE AUTOPILOT").click();
    cy.get("[data-testid=autopilot-status-bar]").should("be.visible");

    // Toggle off
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.get("[data-testid=autopilot-status-bar]").should("not.exist");

    // Toggle on again — no modal
    cy.contains("AUTOPILOT").parent().parent().find("input[type=checkbox], [role=switch]").first().click({ force: true });
    cy.contains("AUTOPILOT MODE").should("not.exist");
    cy.get("[data-testid=autopilot-status-bar]").should("be.visible");
  });
});

describe("Autopilot route removed", () => {
  it("/autopilot route no longer exists", () => {
    cy.visit("/autopilot", { failOnStatusCode: false });
    cy.url().should("not.include", "/autopilot");
  });

  it("sidebar does not contain Autopilot nav link", () => {
    cy.visit("/dashboard");
    cy.get("a[href=\"/autopilot\"]").should("not.exist");
  });
});
