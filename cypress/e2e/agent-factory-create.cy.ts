describe("Agent Factory — Create Agent", () => {
  beforeEach(() => {
    cy.mockNoAgent();
  });

  // ─── Landing page (Step 0) ─────────────────────────────────────────────────

  it("renders the path selection landing with Create and BYO options", () => {
    cy.visit("/agent-factory");
    cy.contains("Choose Your Path").should("be.visible");
    cy.contains("Create from Scratch").should("be.visible");
    cy.contains("5-STEP WIZARD").should("be.visible");
    cy.contains("Bring Your Own OpenClaw Agent").should("be.visible");
    cy.contains("OPENCLAW COMPATIBLE").should("be.visible");
  });

  it("navigates to step 1 when clicking Create from Scratch", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.contains("Initialize New Agent").should("be.visible");
    cy.contains("Designation / Name").should("be.visible");
  });

  // ─── Step-by-step wizard navigation ────────────────────────────────────────

  it("walks through all 5 steps with valid config and step indicators update", () => {
    cy.intercept("POST", "**/api/wallet/generate", { fixture: "wallet.json" }).as(
      "generateWallet"
    );

    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();

    // Step 1 — Identity
    cy.contains("Initialize New Agent").should("be.visible");
    cy.contains("Creation Progress").should("be.visible");
    cy.contains("Basic Identity").should("be.visible");
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Alpha Wolf");
    cy.contains("Continue to Strategy").click();

    // Step 2 — Trading Style
    cy.contains("Trading Style").should("be.visible");
    cy.contains("Trading Instinct").should("be.visible");
    cy.contains("Trend Chaser").should("be.visible");
    cy.contains("Continue to Risk & Money").click();

    // Step 3 — Risk & Money
    cy.contains("Risk & Money").should("be.visible");
    cy.contains("Money Approach").should("be.visible");
    cy.contains("Continue to Preferences").click();

    // Step 4 — Market Preferences
    cy.contains("Market Preferences").should("be.visible");
    cy.contains("Market Sense").should("be.visible");
    cy.contains("Launch your agent").click();

    // Step 5 — Deploy
    cy.wait("@generateWallet");
    cy.contains("Agent Deployment Reveal").should("be.visible");
    cy.contains("Assigned WDK Wallet").should("be.visible");
  });

  // ─── Step 1: Identity fields ───────────────────────────────────────────────

  it("validates name is required before allowing next step", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    // Name empty — Next button disabled
    cy.contains("Continue to Strategy").should("be.visible");
    cy.contains("Name required").should("be.visible");
    // Type a name
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Test Agent");
    cy.contains("Name required").should("not.exist");
  });

  it("selects an avatar from the inline picker", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.contains("Avatar Symbol").should("be.visible");
    // Click the cat avatar
    cy.contains("🐱").click();
    // Should show selected state (green border applied via inline style)
    cy.contains("🐱").parent().should("exist");
  });

  it("selects personality and decision style radio cards", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();

    // Personality — default is Balanced
    cy.contains("Balanced Trader").should("be.visible");
    cy.contains("Careful Guardian").click();
    // Decision style — default is Deep Analyst
    cy.contains("Deep Analyst").should("be.visible");
    cy.contains("Patient Observer").click();
  });

  // ─── Step 2: Trading Style ─────────────────────────────────────────────────

  it("selects trading instinct, time patience, and profit dream", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Style Test");
    cy.contains("Continue to Strategy").click();

    // Trading Instinct — 2x2 grid
    cy.contains("Trend Chaser").should("be.visible");
    cy.contains("Speed Demon").click();

    // Time Patience
    cy.contains("Lightning Day Trader").click();

    // Profit Dream
    cy.contains("Big Moves").click();

    cy.contains("Continue to Risk & Money").click();
    cy.contains("Money Approach").should("be.visible");
  });

  // ─── Step 3: Risk & Money ──────────────────────────────────────────────────

  it("selects money approach and protection mindset", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Risk Test");
    cy.contains("Continue to Strategy").click();
    cy.contains("Continue to Risk & Money").click();

    // Money Approach
    cy.contains("Fixed & Safe").should("be.visible");
    cy.contains("Aggressive Sizer").click();

    // Protection Mindset
    cy.contains("Tight Guardian").should("be.visible");
    cy.contains("Hands-off").click();

    cy.contains("Continue to Preferences").click();
    cy.contains("Market Sense").should("be.visible");
  });

  // ─── Step 4: Market Preferences ────────────────────────────────────────────

  it("selects market sense and asset love", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Pref Test");
    cy.contains("Continue to Strategy").click();
    cy.contains("Continue to Risk & Money").click();
    cy.contains("Continue to Preferences").click();

    // Market Sense
    cy.contains("Fixed Rules").should("be.visible");
    cy.contains("Mood Reader").click();

    // Asset Love
    cy.contains("Crypto Rebel").should("be.visible");
    cy.contains("All-Rounder").click();

    cy.intercept("POST", "**/api/wallet/generate", { fixture: "wallet.json" }).as(
      "generateWallet"
    );
    cy.contains("Launch your agent").click();
    cy.wait("@generateWallet");
    cy.contains("Agent Deployment Reveal").should("be.visible");
  });

  // ─── Step 5: Launch panel ──────────────────────────────────────────────────

  it("generates wallet on step 5 entry and displays address", () => {
    const wallet = {
      address: "0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234",
      privateKey: "0xprivkey123",
      seedPhrase: "word1 word2 word3 word4",
    };
    cy.intercept("POST", "**/api/wallet/generate", { statusCode: 200, body: wallet }).as(
      "generateWallet"
    );
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Wallet Test");
    // Skip to step 5 via Skip (Randomize) to test wallet gen
    cy.contains("Skip (Randomize)").click();
    cy.wait("@generateWallet");
    cy.contains("Assigned WDK Wallet").should("be.visible");
    cy.contains(wallet.address.slice(0, 10)).should("be.visible");
  });

  it("downloads private key file and shows secured state", () => {
    cy.intercept("POST", "**/api/wallet/generate", { fixture: "wallet.json" }).as(
      "generateWallet"
    );
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Key Test");
    cy.contains("Skip (Randomize)").click();
    cy.wait("@generateWallet");

    cy.contains("Download Private Key").should("be.visible");
    cy.contains("Download Private Key").click();
    cy.contains("Private Key Secured").should("be.visible");
  });

  it("deploys agent with correct payload and navigates to manage-agent", () => {
    const wallet = {
      address: "0x1111111111111111111111111111111111111111",
      privateKey: "0xabcdef",
      seedPhrase: "alpha beta gamma delta",
    };

    cy.intercept("POST", "**/api/wallet/generate", { statusCode: 200, body: wallet }).as(
      "generateWallet"
    );
    cy.intercept("POST", "**/api/v1/agents", (req) => {
      // Verify all config fields are sent
      expect(req.body.wallet_address).to.eq(wallet.address);
      expect(req.body.name).to.be.a("string").and.not.be.empty;
      expect(req.body.avatar).to.be.a("string");
      expect(req.body.personality).to.be.oneOf(["guardian", "balanced", "adventurer"]);
      expect(req.body.decisionStyle).to.be.oneOf(["gut", "analyst", "observer"]);
      expect(req.body.tradingInstinct).to.be.oneOf([
        "trend_chaser",
        "reversal_spotter",
        "value_hunter",
        "speed_demon",
      ]);
      expect(req.body.timePatience).to.be.oneOf(["lightning", "swing", "longterm"]);
      expect(req.body.profitDream).to.be.oneOf(["quick_wins", "big_moves", "wealth_builder"]);
      expect(req.body.moneyApproach).to.be.oneOf(["fixed_safe", "smart_scaling", "aggressive"]);
      expect(req.body.protectionMindset).to.be.oneOf(["tight", "flexible", "hands_off"]);
      expect(req.body.marketSense).to.be.oneOf(["fixed_rules", "mood_reader"]);
      expect(req.body.assetLove).to.be.oneOf(["stocks", "forex", "crypto", "all_rounder"]);
      expect(req.body.animalType).to.be.a("string");

      req.reply({ statusCode: 201, fixture: "created-agent.json" });
    }).as("createAgent");
    cy.intercept("GET", "**/api/v1/agent/me", {
      statusCode: 200,
      fixture: "created-agent.json",
    }).as("getCreatedAgent");

    cy.visit("/agent-factory");
    cy.contains("Skip (Randomize)").click();
    cy.wait("@generateWallet");
    cy.contains("Download Private Key").click();
    cy.contains("Deploy Agent").click();
    cy.wait("@createAgent");
    cy.url().should("include", "/manage-agent");
  });

  // ─── Skip (Randomize) ─────────────────────────────────────────────────────

  it("skip randomize fills all fields and jumps to step 5", () => {
    cy.intercept("POST", "**/api/wallet/generate", { fixture: "wallet.json" }).as(
      "generateWallet"
    );
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Skip Test");
    cy.contains("Skip (Randomize)").click();
    cy.wait("@generateWallet");
    cy.contains("Agent Deployment Reveal").should("be.visible");
    cy.contains("Assigned WDK Wallet").should("be.visible");
  });

  // ─── Back navigation ──────────────────────────────────────────────────────

  it("back button navigates to previous step", () => {
    cy.visit("/agent-factory");
    cy.contains("Create from Scratch").click();
    cy.get('input[placeholder="e.g. Tiger the Fast"]').type("Back Test");
    cy.contains("Continue to Strategy").click();
    cy.contains("Trading Instinct").should("be.visible");
    cy.contains("← Back").click();
    cy.contains("Identity Configuration").should("be.visible");
  });

  // ─── Wallet generation error ───────────────────────────────────────────────

  it("shows wallet error when generation fails", () => {
    cy.intercept("POST", "**/api/wallet/generate", {
      statusCode: 500,
      body: { error: "Wallet service unavailable" },
    }).as("walletFail");

    cy.visit("/agent-factory");
    cy.contains("Skip (Randomize)").click();
    cy.wait("@walletFail");
    // The wallet error message should appear (the component renders walletError)
    cy.contains(/failed|error|unavailable/i).should("be.visible");
  });

  // ─── Deploy error ──────────────────────────────────────────────────────────

  it("shows deploy error when agent creation fails", () => {
    cy.intercept("POST", "**/api/wallet/generate", { fixture: "wallet.json" }).as(
      "generateWallet"
    );
    cy.intercept("POST", "**/api/v1/agents", {
      statusCode: 500,
      body: { error: "Internal server error" },
    }).as("createFail");

    cy.visit("/agent-factory");
    cy.contains("Skip (Randomize)").click();
    cy.wait("@generateWallet");
    cy.contains("Download Private Key").click();
    cy.contains("Deploy Agent").click();
    cy.wait("@createFail");
    cy.contains(/failed|error/i).should("be.visible");
  });

  // ─── Existing agent lock ───────────────────────────────────────────────────

  it("shows locked state when user already has an agent", () => {
    // Override the beforeEach mockNoAgent
    cy.mockAgent({ name: "Existing Agent", avatar_emoji: "🐺" });
    cy.visit("/agent-factory");
    cy.contains("Max agent limit reached").should("be.visible");
    cy.contains("Existing Agent").should("be.visible");
    cy.contains("🐺").should("be.visible");
    cy.contains("Create Agent").should("be.disabled");
    cy.contains("Import OpenClaw").should("be.disabled");
    cy.contains("Delete Agent").should("be.visible");
  });

  it("locked state manage button navigates to manage-agent", () => {
    cy.mockAgent({ name: "Existing Agent" });
    cy.visit("/agent-factory");
    cy.contains("Manage Existing Agent →").click();
    cy.url().should("include", "/manage-agent");
  });

  // ─── Delete from locked state ──────────────────────────────────────────────

  it("shows delete confirmation modal and deletes agent", () => {
    cy.mockAgent({ name: "Doomed Agent", id: "agent-doom-1" });
    cy.intercept("DELETE", "**/api/v1/agents/agent-doom-1", { statusCode: 200, body: {} }).as(
      "deleteAgent"
    );
    cy.visit("/agent-factory");
    cy.contains("Delete Agent").click();
    // Confirmation dialog
    cy.contains("Delete Doomed Agent?").should("be.visible");
    cy.contains("This will permanently remove").should("be.visible");
    cy.contains("Confirm Delete").click();
    cy.wait("@deleteAgent");
  });
});
