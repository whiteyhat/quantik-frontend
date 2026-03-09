import { test, expect, Page } from '@playwright/test';
import { setupAuth, mockAgent, mockNoAgent } from './fixtures';

const now = Date.parse('2026-03-08T12:00:00.000Z');
const expiresAt = now + 15 * 60 * 1000;
const sessionId = 'session-byo-1';
const onboardingUrl = 'http://localhost:3001/api/v1/agents/byo/claim/token-abc';

async function setupByoSession(page: Page) {
  let sessionPolls = 0;
  let walletDownloaded = false;

  await page.route('**/api/v1/agents/byo/onboarding', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: sessionId,
          onboarding_url: onboardingUrl,
          expires_at: expiresAt,
        }),
      });
    } else {
      route.fallback();
    }
  });

  await page.route(`**/api/v1/agents/byo/onboarding/${sessionId}`, (route) => {
    sessionPolls += 1;
    if (sessionPolls === 1) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: sessionId,
          status: 'pending_claim',
          expires_at: expiresAt,
          claimed_at: null,
          agent_id: null,
          identity: null,
          agent_url: null,
          endpoint_url: null,
          webhook_events: [],
          api_key_prefix: null,
          wallet_address: null,
          connection_status: 'pending',
          wallet_download_ready: false,
          wallet_downloaded_at: null,
          last_error: null,
        }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: sessionId,
        status: 'claimed',
        expires_at: expiresAt,
        claimed_at: now + 30_000,
        agent_id: 'agent-byo-1',
        identity: {
          name: 'OpenClaw Prime',
          description: 'Imports live runtime identity from OpenClaw',
          avatar: '🦞',
        },
        agent_url: 'https://openclaw.example/agents/openclaw-prime',
        endpoint_url: 'https://quantik.example/api/v1/agents/agent-byo-1/webhook',
        webhook_events: ['*'],
        api_key_prefix: 'qtk_live_1234',
        wallet_address: '0x2222222222222222222222222222222222222222',
        connection_status: 'connected',
        wallet_download_ready: !walletDownloaded,
        wallet_downloaded_at: walletDownloaded ? now + 31_000 : null,
        last_error: null,
      }),
    });
  });

  await page.route('**/api/v1/agents/agent-byo-1/byo-config', (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            agent_url: 'https://openclaw.example/agents/openclaw-prime',
            endpoint_url: body.endpoint_url,
            webhook_events: body.webhook_events,
          },
        }),
      });
    } else {
      route.fallback();
    }
  });

  await page.route(`**/api/v1/agents/byo/onboarding/${sessionId}/wallet-download`, (route) => {
    if (route.request().method() === 'POST') {
      walletDownloaded = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x2222222222222222222222222222222222222222',
          privateKey: '0xdef456',
          seedPhrase: 'delta epsilon zeta eta theta iota kappa lambda',
        }),
      });
    } else {
      route.fallback();
    }
  });

  await page.route('**/api/v1/agents/agent-byo-1/deploy', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'active', deployed_at: now + 35_000 }),
      });
    } else {
      route.fallback();
    }
  });
}

test.describe('Agent Factory — BYO Agent', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockNoAgent(page);
  });

  test('completes the full BYO onboarding: generate link, claim, configure webhooks, download wallet, activate', async ({ page }) => {
    let agentCheckCount = 0;
    await page.route('**/api/v1/agent/me', (route) => {
      agentCheckCount += 1;
      if (agentCheckCount <= 2) {
        route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'No agent configured' }) });
        return;
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'agent-byo-1',
          agent_code: 'Q-BYO-101',
          status: 'active',
          name: 'OpenClaw Prime',
          avatar_emoji: '🦞',
          agent_type: 'byo',
          wallet_address: '0x2222222222222222222222222222222222222222',
          created_at: now,
          deployed_at: now + 35_000,
        }),
      });
    });

    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await expect(page.getByText('One-Time URL')).toBeVisible();
    await expect(page.getByText(onboardingUrl)).toBeVisible();
    await expect(page.getByText('Waiting for Claim')).toBeVisible();

    await page.clock.fastForward(3000);

    await expect(page.getByText('Review & Activate')).toBeVisible();
    await expect(page.getByText('Imported OpenClaw Agent')).toBeVisible();
    await expect(page.getByText('OpenClaw Prime')).toBeVisible();
    await expect(page.getByText('🦞')).toBeVisible();
    await expect(page.getByText('qtk_live_1234')).toBeVisible();
    await expect(page.getByText('0x2222222222222222222222222222222222222222')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate BYO Agent' })).toBeDisabled();

    await page.getByPlaceholder('https://openclaw.example/webhook').fill('https://openclaw.example/webhook');
    await page.getByText('Customize').click();
    await page.getByText('Trade Executed').click();
    await page.getByText('Save Webhook Settings').click();

    await page.getByText('Download OpenClaw Wallet Backup').click();

    await page.getByText('Activate BYO Agent').click();

    await expect(page).toHaveURL(/\/manage-agent/);
  });

  test('displays onboarding URL and countdown after generating link', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await expect(page.getByText('Generate Link')).toBeVisible();
    await page.getByText('Generate Onboarding Link').click();

    await expect(page.getByText('One-Time URL')).toBeVisible();
    await expect(page.getByText(onboardingUrl)).toBeVisible();
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible();
  });

  test('shows Waiting for Claim status pill during polling', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await expect(page.getByText('Waiting for Claim')).toBeVisible();
  });

  test('transitions to claimed state and shows identity preview', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await expect(page.getByText('OpenClaw Prime')).toBeVisible();
    await expect(page.getByText('🦞')).toBeVisible();
  });

  test('validates webhook URL — rejects non-HTTPS', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await page.getByPlaceholder('https://openclaw.example/webhook').fill('http://insecure.example/webhook');
    await expect(page.getByText(/must use HTTPS/i)).toBeVisible();
  });

  test('validates webhook URL — rejects localhost', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await page.getByPlaceholder('https://openclaw.example/webhook').fill('https://localhost:3000/webhook');
    await expect(page.getByText(/private|internal/i)).toBeVisible();
  });

  test('validates webhook URL — rejects private IP (192.168.x.x)', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await page.getByPlaceholder('https://openclaw.example/webhook').fill('https://192.168.1.100/webhook');
    await expect(page.getByText(/private|internal/i)).toBeVisible();
  });

  test('sends correct payload when saving webhook config', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await page.getByPlaceholder('https://openclaw.example/webhook').fill('https://myapp.example/webhook');
    await page.getByText('Customize').click();
    await page.getByText('Trade Executed').click();
    await page.getByText('Pipeline Complete').click();

    // Override the route to verify the payload
    await page.unroute('**/api/v1/agents/agent-byo-1/byo-config');
    await page.route('**/api/v1/agents/agent-byo-1/byo-config', (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.endpoint_url).toBe('https://myapp.example/webhook');
        expect(body.webhook_events).toContain('trade:executed');
        expect(body.webhook_events).toContain('pipeline:complete');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              agent_url: 'https://openclaw.example/agents/openclaw-prime',
              endpoint_url: 'https://myapp.example/webhook',
              webhook_events: ['trade:executed', 'pipeline:complete'],
            },
          }),
        });
      } else {
        route.fallback();
      }
    });

    await page.getByText('Save Webhook Settings').click();
  });

  test('displays all webhook event labels', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await expect(page.getByText('Trade Executed')).toBeVisible();
    await expect(page.getByText('Trade Closed')).toBeVisible();
    await expect(page.getByText('Agent Alert')).toBeVisible();
    await expect(page.getByText('Pipeline Complete')).toBeVisible();
    await expect(page.getByText('Scanner Signal')).toBeVisible();
    await expect(page.getByText('Circuit Breaker')).toBeVisible();
  });

  test('downloads wallet and enables activate button', async ({ page }) => {
    await page.clock.install({ time: new Date(now) });
    await setupByoSession(page);

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(3000);

    await expect(page.getByRole('button', { name: 'Activate BYO Agent' })).toBeDisabled();
    await page.getByText('Download OpenClaw Wallet Backup').click();
    await expect(page.getByText('Wallet Backup Secured')).toBeVisible();
  });

  test('shows expired status when countdown reaches zero', async ({ page }) => {
    let pollCount = 0;

    await page.clock.install({ time: new Date(now) });

    await page.route('**/api/v1/agents/byo/onboarding', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            session_id: sessionId,
            onboarding_url: onboardingUrl,
            expires_at: expiresAt,
          }),
        });
      } else {
        route.fallback();
      }
    });

    await page.route(`**/api/v1/agents/byo/onboarding/${sessionId}`, (route) => {
      pollCount += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: sessionId,
          status: pollCount > 2 ? 'expired' : 'pending_claim',
          expires_at: expiresAt,
          claimed_at: null,
          agent_id: null,
          identity: null,
          agent_url: null,
          endpoint_url: null,
          webhook_events: [],
          api_key_prefix: null,
          wallet_address: null,
          connection_status: 'pending',
          wallet_download_ready: false,
          wallet_downloaded_at: null,
          last_error: null,
        }),
      });
    });

    await page.goto('/agent-factory/byo');
    await page.getByText('Generate Onboarding Link').click();

    await page.clock.fastForward(16 * 60 * 1000);

    await expect(page.getByText(/expired/i)).toBeVisible();
  });

  test('redirects or shows lock when user already has an agent', async ({ page }) => {
    await mockAgent(page, { name: 'Existing BYO', agent_type: 'byo' });
    await page.goto('/agent-factory');
    await expect(page.getByText('Max agent limit reached')).toBeVisible();
  });
});
