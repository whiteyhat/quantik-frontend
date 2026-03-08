describe("Agent Factory BYO", () => {
  beforeEach(() => {
    const initialAgentChecks = { count: 0 };

    cy.intercept("GET", "**/api/v1/agent/me", (req) => {
      initialAgentChecks.count += 1;

      if (initialAgentChecks.count === 1) {
        req.reply({ statusCode: 404, body: { error: "No agent configured" } });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          id: "agent-byo-1",
          agent_code: "Q-BYO-101",
          status: "active",
          name: "OpenClaw Prime",
          avatar_emoji: "🦞",
          animal_type: "lobster",
          avatar_image: null,
          personality: "balanced",
          decision_style: "analyst",
          trading_instinct: "opportunistic",
          time_patience: "swing",
          profit_dream: "wealth_builder",
          money_approach: "smart_scaling",
          protection_mindset: "guarded",
          leverage_vibe: "none",
          market_sense: "adaptive",
          asset_love: "crypto",
          wallet_address: "0x2222222222222222222222222222222222222222",
          created_at: Date.now(),
          updated_at: Date.now(),
          deployed_at: Date.now(),
        },
      });
    }).as("getMyAgent");
  });

  it("creates, reviews, and activates a BYO onboarding session", () => {
    const now = Date.parse("2026-03-08T12:00:00.000Z");
    const expiresAt = now + 15 * 60 * 1000;
    const sessionId = "session-1";
    const onboardingUrl = "http://localhost:3001/api/v1/agents/byo/claim/token-1";
    let sessionPolls = 0;
    let walletDownloaded = false;
    let currentEndpointUrl = "https://quantik.example/api/v1/agents/agent-byo-1/webhook";
    let currentWebhookEvents = ["decision.made", "trade.executed"];

    cy.clock(now, ["Date", "setTimeout", "setInterval", "clearTimeout", "clearInterval"]);

    cy.intercept("POST", "**/api/v1/agents/byo/onboarding", {
      statusCode: 200,
      body: {
        session_id: sessionId,
        onboarding_url: onboardingUrl,
        expires_at: expiresAt,
      },
    }).as("createByoSession");

    cy.intercept("GET", `**/api/v1/agents/byo/onboarding/${sessionId}`, (req) => {
      sessionPolls += 1;

      if (sessionPolls === 1) {
        req.reply({
          statusCode: 200,
          body: {
            session_id: sessionId,
            status: "pending_claim",
            expires_at: expiresAt,
            claimed_at: null,
            agent_id: null,
            identity: null,
            agent_url: null,
            endpoint_url: null,
            webhook_events: [],
            api_key_prefix: null,
            wallet_address: null,
            connection_status: "pending",
            wallet_download_ready: false,
            wallet_downloaded_at: null,
            last_error: null,
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          session_id: sessionId,
          status: "claimed",
          expires_at: expiresAt,
          claimed_at: now + 30_000,
          agent_id: "agent-byo-1",
          identity: {
            name: "OpenClaw Prime",
            description: "Imports live runtime identity from OpenClaw",
            avatar: "🦞",
          },
          agent_url: "https://openclaw.example/agents/openclaw-prime",
          endpoint_url: currentEndpointUrl,
          webhook_events: currentWebhookEvents,
          api_key_prefix: "qtk_live_1234",
          wallet_address: "0x2222222222222222222222222222222222222222",
          connection_status: "connected",
          wallet_download_ready: !walletDownloaded,
          wallet_downloaded_at: walletDownloaded ? now + 31_000 : null,
          last_error: null,
        },
      });
    }).as("getByoSession");

    cy.intercept("PATCH", "**/api/v1/agents/agent-byo-1/byo-config", (req) => {
      expect(req.body.endpoint_url).to.eq("https://openclaw.example/webhook");
      expect(req.body.webhook_events).to.deep.eq(["trade:executed"]);
      currentEndpointUrl = "https://openclaw.example/webhook";
      currentWebhookEvents = ["trade:executed"];
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            agent_url: "https://openclaw.example/agents/openclaw-prime",
            endpoint_url: "https://openclaw.example/webhook",
            webhook_events: ["trade:executed"],
          },
        },
      });
    }).as("saveWebhookConfig");

    cy.intercept("POST", `**/api/v1/agents/byo/onboarding/${sessionId}/wallet-download`, (req) => {
      walletDownloaded = true;
      req.reply({
        statusCode: 200,
        body: {
          address: "0x2222222222222222222222222222222222222222",
          privateKey: "0xdef",
          seedPhrase: "delta epsilon zeta eta",
        },
      });
    }).as("downloadByoWallet");

    cy.intercept("POST", "**/api/v1/agents/agent-byo-1/deploy", {
      statusCode: 200,
      body: {
        ok: true,
        status: "active",
        deployed_at: now + 35_000,
      },
    }).as("deployByoAgent");

    cy.visit("/agent-factory/byo");

    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");

    cy.contains("One-Time URL").should("be.visible");
    cy.contains(onboardingUrl).should("be.visible");
    cy.contains("Waiting for Claim").should("be.visible");

    cy.tick(3000);
    cy.wait("@getByoSession");

    cy.contains("Review & Activate").should("be.visible");
    cy.contains("Imported OpenClaw Agent").should("be.visible");
    cy.contains("OpenClaw Prime").should("be.visible");
    cy.contains("🦞").should("be.visible");
    cy.contains("qtk_live_1234").should("be.visible");
    cy.contains("0x2222222222222222222222222222222222222222").should("be.visible");
    cy.contains("Activate BYO Agent").should("be.disabled");

    cy.get('input[placeholder="https://openclaw.example/webhook"]').type("https://openclaw.example/webhook");
    cy.contains("Trade Executed").click();
    cy.contains("Save Webhook Settings").click();
    cy.wait("@saveWebhookConfig");

    cy.contains("Download OpenClaw Wallet Backup").click();
    cy.wait("@downloadByoWallet");
    cy.contains("Activate BYO Agent").click();
    cy.wait("@deployByoAgent");
    cy.wait("@getMyAgent");
    cy.url().should("include", "/manage-agent");
  });
});
