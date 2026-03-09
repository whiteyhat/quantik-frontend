describe("Manage Agent — Architecture", () => {
  beforeEach(() => {
    cy.mockAgent();
    cy.mockManageAgentApis();
  });

  // ─── Tab Switch & Canvas Render ────────────────────────────────────────────

  it("renders ReactFlow canvas when switching to Architecture tab", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();
    // ReactFlow renders a container with the agent nodes
    cy.contains("MAIN", { timeout: 10000 }).should("be.visible");
  });

  // ─── Main Agent Node ──────────────────────────────────────────────────────

  it("displays main agent node with emoji, name, and MAIN badge", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();
    cy.contains("MAIN").should("be.visible");
    cy.contains("🦊").should("be.visible");
  });

  // ─── Sub-Agent Nodes ──────────────────────────────────────────────────────

  it("renders all 7 sub-agent nodes with names and roles", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    const agents = [
      { name: "Aura", role: "Sentiment Analysis" },
      { name: "Flux", role: "Liquidity Router" },
      { name: "Clause", role: "Smart Contracts" },
      { name: "Oracle", role: "Probability Engine" },
      { name: "Edge", role: "Data Ingestion" },
      { name: "Lucifer", role: "Risk Veto Protocol" },
      { name: "Sigma", role: "Final Decision" },
    ];

    for (const agent of agents) {
      cy.contains(agent.name).should("be.visible");
      cy.contains(agent.role).should("be.visible");
    }
  });

  it("displays sub-agent emojis", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    const emojis = ["🔮", "🌊", "📜", "🧿", "⚡", "😈", "🎯"];
    for (const emoji of emojis) {
      cy.contains(emoji).should("be.visible");
    }
  });

  // ─── Node Click → Detail Panel (Main Agent) ──────────────────────────────

  it("opens detail panel when clicking main agent node", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    // Click the main node (MAIN badge area)
    cy.contains("MAIN").click({ force: true });

    // Detail panel should show agent info
    cy.contains("PERSONALITY", { timeout: 5000 }).should("be.visible");
    cy.contains("TRADING PROFILE").should("be.visible");
    cy.contains("RISK PROFILE").should("be.visible");
    cy.contains("MARKET PREFERENCES").should("be.visible");
    cy.contains("DEPLOYMENT").should("be.visible");
    cy.contains("CONNECTED AGENTS").should("be.visible");
  });

  it("detail panel shows wallet address with external links", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();
    cy.contains("MAIN").click({ force: true });

    cy.contains("DEPLOYMENT", { timeout: 5000 }).should("be.visible");
    // Truncated wallet address should be visible
    cy.contains("0x1111").should("be.visible");
  });

  // ─── Node Click → Detail Panel (Sub-Agent) ───────────────────────────────

  it("opens detail panel when clicking sub-agent node", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    // Click Aura sub-agent
    cy.contains("Sentiment Analysis").click({ force: true });

    // Should show sub-agent details
    cy.contains("DESCRIPTION", { timeout: 5000 }).should("be.visible");
    cy.contains("CONNECTED SERVICES").should("be.visible");
  });

  it("sub-agent panel shows role and description", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    cy.contains("Liquidity Router").click({ force: true });
    cy.contains("DESCRIPTION", { timeout: 5000 }).should("be.visible");
  });

  // ─── Panel Close ──────────────────────────────────────────────────────────

  it("closes detail panel via X button", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    cy.contains("MAIN").click({ force: true });
    cy.contains("PERSONALITY", { timeout: 5000 }).should("be.visible");

    // Close via X button (× character)
    cy.contains("×").click();
    cy.contains("PERSONALITY").should("not.exist");
  });

  // ─── Navigate Between Nodes ───────────────────────────────────────────────

  it("navigates between main and sub-agent nodes", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    // Click main node first
    cy.contains("MAIN").click({ force: true });
    cy.contains("PERSONALITY", { timeout: 5000 }).should("be.visible");

    // Close panel
    cy.contains("×").click();

    // Click a sub-agent
    cy.contains("Final Decision").click({ force: true });
    cy.contains("DESCRIPTION", { timeout: 5000 }).should("be.visible");
  });

  // ─── Architecture Info Badge ──────────────────────────────────────────────

  it("shows enterprise architecture info badge", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    cy.contains("Enterprise Architecture").should("be.visible");
    cy.contains("7 sub-agents connected").should("be.visible");
  });

  // ─── Service Nodes ────────────────────────────────────────────────────────

  it("renders service nodes with labels", () => {
    cy.visit("/manage-agent");
    cy.wait("@getMyAgent");
    cy.contains("Architecture").click();

    // Check a few service nodes are visible
    cy.contains("Sentiment Analyzer").should("be.visible");
    cy.contains("Ensemble Engine").should("be.visible");
  });
});
