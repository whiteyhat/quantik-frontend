describe("Agent Factory — BYO Agent", () => {
  const now = Date.parse("2026-03-08T12:00:00.000Z");
  const expiresAt = now + 15 * 60 * 1000;
  const sessionId = "session-byo-1";
  const onboardingUrl = "http://localhost:3001/api/v1/agents/byo/claim/token-abc";

  beforeEach(() => {
    cy.mockNoAgent();
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function setupByoSession() {
    let sessionPolls = 0;
    let walletDownloaded = false;

    cy.clock(now, ["Date", "setTimeout", "setInterval", "clearTimeout", "clearInterval"]);

    cy.intercept("POST", "**/api/v1/agents/byo/onboarding", {
      statusCode: 200,
      body: { session_id: sessionId, onboarding_url: onboardingUrl, expires_at: expiresAt },
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
          endpoint_url: "https://quantik.example/api/v1/agents/agent-byo-1/webhook",
          webhook_events: ["*"],
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
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            agent_url: "https://openclaw.example/agents/openclaw-prime",
            endpoint_url: req.body.endpoint_url,
            webhook_events: req.body.webhook_events,
          },
        },
      });
    }).as("saveWebhookConfig");

    cy.intercept(
      "POST",
      `**/api/v1/agents/byo/onboarding/${sessionId}/wallet-download`,
      (req) => {
        walletDownloaded = true;
        req.reply({
          statusCode: 200,
          body: {
            address: "0x2222222222222222222222222222222222222222",
            privateKey: "0xdef456",
            seedPhrase: "delta epsilon zeta eta theta iota kappa lambda",
          },
        });
      }
    ).as("downloadByoWallet");

    cy.intercept("POST", "**/api/v1/agents/agent-byo-1/deploy", {
      statusCode: 200,
      body: { ok: true, status: "active", deployed_at: now + 35_000 },
    }).as("deployByoAgent");
  }

  // ─── Full flow ─────────────────────────────────────────────────────────────

  it("completes the full BYO onboarding: generate link, claim, configure webhooks, download wallet, activate", () => {
    setupByoSession();

    // Override agent check to return agent after deploy
    const agentChecks = { count: 0 };
    cy.intercept("GET", "**/api/v1/agent/me", (req) => {
      agentChecks.count += 1;
      if (agentChecks.count <= 2) {
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
          agent_type: "byo",
          wallet_address: "0x2222222222222222222222222222222222222222",
          created_at: now,
          deployed_at: now + 35_000,
        },
      });
    }).as("getMyAgent");

    cy.visit("/agent-factory/byo");

    // Step 1 — Generate link
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.contains("One-Time URL").should("be.visible");
    cy.contains(onboardingUrl).should("be.visible");
    cy.contains("Waiting for Claim").should("be.visible");

    // Step 2 — Polling transitions to claimed
    cy.tick(3000);
    cy.wait("@getByoSession");

    // Step 3 — Review & Activate
    cy.contains("Review & Activate").should("be.visible");
    cy.contains("Imported OpenClaw Agent").should("be.visible");
    cy.contains("OpenClaw Prime").should("be.visible");
    cy.contains("🦞").should("be.visible");
    cy.contains("qtk_live_1234").should("be.visible");
    cy.contains("0x2222222222222222222222222222222222222222").should("be.visible");

    // Activate should be disabled before wallet download
    cy.contains("Activate BYO Agent").should("be.disabled");

    // Configure webhook
    cy.get('input[placeholder="https://openclaw.example/webhook"]').type(
      "https://openclaw.example/webhook"
    );
    cy.contains("Customize").click();
    cy.contains("Trade Executed").click();
    cy.contains("Save Webhook Settings").click();
    cy.wait("@saveWebhookConfig");

    // Download wallet
    cy.contains("Download OpenClaw Wallet Backup").click();
    cy.wait("@downloadByoWallet");

    // Activate
    cy.contains("Activate BYO Agent").click();
    cy.wait("@deployByoAgent");
    cy.url().should("include", "/manage-agent");
  });

  // ─── Step 1: Generate Link ─────────────────────────────────────────────────

  it("displays onboarding URL and countdown after generating link", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Link").should("be.visible");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");

    cy.contains("One-Time URL").should("be.visible");
    cy.contains(onboardingUrl).should("be.visible");
    // Countdown timer should be visible (15:00 or similar)
    cy.contains(/\d{1,2}:\d{2}/).should("be.visible");
  });

  // ─── Step 2: Waiting for Claim ─────────────────────────────────────────────

  it("shows 'Waiting for Claim' status pill during polling", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");

    cy.contains("Waiting for Claim").should("be.visible");
  });

  it("transitions to claimed state and shows identity preview", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");

    // Advance clock to trigger second poll
    cy.tick(3000);
    cy.wait("@getByoSession");

    cy.contains("OpenClaw Prime").should("be.visible");
    cy.contains("🦞").should("be.visible");
  });

  // ─── Step 3: Webhook Configuration ─────────────────────────────────────────

  it("validates webhook URL — rejects non-HTTPS", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    // Type http URL (should fail validation)
    cy.get('input[placeholder="https://openclaw.example/webhook"]')
      .clear()
      .type("http://insecure.example/webhook");
    cy.contains(/must use HTTPS/i).should("be.visible");
  });

  it("validates webhook URL — rejects localhost", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    cy.get('input[placeholder="https://openclaw.example/webhook"]')
      .clear()
      .type("https://localhost:3000/webhook");
    cy.contains(/private|internal/i).should("be.visible");
  });

  it("validates webhook URL — rejects private IP (192.168.x.x)", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    cy.get('input[placeholder="https://openclaw.example/webhook"]')
      .clear()
      .type("https://192.168.1.100/webhook");
    cy.contains(/private|internal/i).should("be.visible");
  });

  it("sends correct payload when saving webhook config", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    // Set valid webhook URL
    cy.get('input[placeholder="https://openclaw.example/webhook"]').type(
      "https://myapp.example/webhook"
    );

    // Click "Customize" to deselect all, then select specific events
    cy.contains("Customize").click();
    cy.contains("Trade Executed").click();
    cy.contains("Pipeline Complete").click();

    // Intercept to verify payload
    cy.intercept("PATCH", "**/api/v1/agents/agent-byo-1/byo-config", (req) => {
      expect(req.body.endpoint_url).to.eq("https://myapp.example/webhook");
      expect(req.body.webhook_events).to.include("trade:executed");
      expect(req.body.webhook_events).to.include("pipeline:complete");
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            agent_url: "https://openclaw.example/agents/openclaw-prime",
            endpoint_url: "https://myapp.example/webhook",
            webhook_events: ["trade:executed", "pipeline:complete"],
          },
        },
      });
    }).as("saveWebhookConfig2");

    cy.contains("Save Webhook Settings").click();
    cy.wait("@saveWebhookConfig2");
  });

  // ─── Webhook event checkboxes ──────────────────────────────────────────────

  it("displays all webhook event labels", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    cy.contains("Trade Executed").should("be.visible");
    cy.contains("Trade Closed").should("be.visible");
    cy.contains("Agent Alert").should("be.visible");
    cy.contains("Pipeline Complete").should("be.visible");
    cy.contains("Scanner Signal").should("be.visible");
    cy.contains("Circuit Breaker").should("be.visible");
  });

  // ─── Wallet download ──────────────────────────────────────────────────────

  it("downloads wallet and enables activate button", () => {
    setupByoSession();

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");
    cy.tick(3000);
    cy.wait("@getByoSession");

    // Activate disabled before wallet download
    cy.contains("Activate BYO Agent").should("be.disabled");

    cy.contains("Download OpenClaw Wallet Backup").click();
    cy.wait("@downloadByoWallet");

    // After wallet download, the button text changes
    cy.contains("Wallet Backup Secured").should("be.visible");
  });

  // ─── Session expiry ────────────────────────────────────────────────────────

  it("shows expired status when countdown reaches zero", () => {
    let pollCount = 0;
    cy.clock(now, ["Date", "setTimeout", "setInterval", "clearTimeout", "clearInterval"]);

    cy.intercept("POST", "**/api/v1/agents/byo/onboarding", {
      statusCode: 200,
      body: { session_id: sessionId, onboarding_url: onboardingUrl, expires_at: expiresAt },
    }).as("createByoSession");

    cy.intercept("GET", `**/api/v1/agents/byo/onboarding/${sessionId}`, (req) => {
      pollCount += 1;
      req.reply({
        statusCode: 200,
        body: {
          session_id: sessionId,
          status: pollCount > 2 ? "expired" : "pending_claim",
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
    }).as("getByoSession");

    cy.visit("/agent-factory/byo");
    cy.contains("Generate Onboarding Link").click();
    cy.wait("@createByoSession");
    cy.wait("@getByoSession");

    // Advance past expiry
    cy.tick(16 * 60 * 1000);

    cy.contains(/expired/i).should("be.visible");
  });

  // ─── Existing agent lock ───────────────────────────────────────────────────

  it("redirects or shows lock when user already has an agent", () => {
    cy.mockAgent({ name: "Existing BYO", agent_type: "byo" });
    cy.visit("/agent-factory");
    cy.contains("Max agent limit reached").should("be.visible");
  });
});
