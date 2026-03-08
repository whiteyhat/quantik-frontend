describe("Agent Factory", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/agent/me", { statusCode: 404, body: { error: "No agent configured" } }).as("getMyAgent");
  });

  it("creates a standard agent with a generated WDK wallet", () => {
    const wallet = {
      address: "0x1111111111111111111111111111111111111111",
      privateKey: "0xabcdef",
      seedPhrase: "alpha beta gamma delta",
    };

    cy.intercept("POST", "**/api/wallet/generate", { statusCode: 200, body: wallet }).as("generateWallet");
    cy.intercept("POST", "**/api/v1/agents", (req) => {
      expect(req.body.wallet_address).to.eq(wallet.address);
      req.reply({
        statusCode: 201,
        body: {
          id: "agent-created-1",
          agent_code: "Q-AGENT-X101",
          status: "inactive",
          name: "Signal Scout",
          avatar_emoji: "🦊",
          animal_type: "fox",
          avatar_image: null,
          personality: "balanced",
          decision_style: "analyst",
          trading_instinct: "value_hunter",
          time_patience: "swing",
          profit_dream: "wealth_builder",
          money_approach: "smart_scaling",
          protection_mindset: "flexible",
          leverage_vibe: "none",
          market_sense: "fixed_rules",
          asset_love: "crypto",
          wallet_address: wallet.address,
          created_at: Date.now(),
          updated_at: Date.now(),
          deployed_at: null,
        },
      });
    }).as("createAgent");
    cy.intercept("GET", "**/api/v1/agent/me", {
      statusCode: 200,
      body: {
        id: "agent-created-1",
        agent_code: "Q-AGENT-X101",
        status: "inactive",
        name: "Signal Scout",
        avatar_emoji: "🦊",
        animal_type: "fox",
        avatar_image: null,
        personality: "balanced",
        decision_style: "analyst",
        trading_instinct: "value_hunter",
        time_patience: "swing",
        profit_dream: "wealth_builder",
        money_approach: "smart_scaling",
        protection_mindset: "flexible",
        leverage_vibe: "none",
        market_sense: "fixed_rules",
        asset_love: "crypto",
        wallet_address: wallet.address,
        created_at: Date.now(),
        updated_at: Date.now(),
        deployed_at: null,
      },
    }).as("getCreatedAgent");

    cy.visit("/agent-factory");
    cy.contains("Skip (Randomize)").click();

    cy.wait("@generateWallet");
    cy.contains("Assigned WDK Wallet").should("be.visible");
    cy.contains(wallet.address.slice(0, 10)).should("be.visible");

    cy.contains("Download Private Key").click();
    cy.contains("Private Key Secured").should("be.visible");

    cy.contains("Deploy Agent").click();
    cy.wait("@createAgent");
    cy.url().should("include", "/manage-agent");
  });
});
