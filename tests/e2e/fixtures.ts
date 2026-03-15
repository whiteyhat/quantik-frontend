import { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright';

// ─── Constants ──────────────────────────────────────────────────────────────

export const STANDARD_AGENT = {
  id: 'agent-std-1',
  agent_code: 'Q-AGENT-X101',
  status: 'active',
  name: 'Signal Scout',
  avatar_emoji: '🦊',
  animal_type: 'fox',
  agent_type: 'created',
  avatar_image: null,
  personality: 'balanced',
  decision_style: 'analyst',
  trading_instinct: 'value_hunter',
  time_patience: 'swing',
  profit_dream: 'wealth_builder',
  money_approach: 'smart_scaling',
  protection_mindset: 'flexible',
  leverage_vibe: 'none',
  market_sense: 'fixed_rules',
  asset_love: 'crypto',
  wallet_address: '0x1111111111111111111111111111111111111111',
  created_at: Date.now(),
  updated_at: Date.now(),
  deployed_at: Date.now(),
  autopilot_enabled: false,
  autopilot_updated_at: Date.now(),
  connection_status: 'connected',
  last_heartbeat: Date.now(),
  endpoint_url: null,
  agent_url: null,
  webhook_events: ['*'],
  api_key_prefix: null,
  description: null,
  polymarket_ready: true,
  polymarket_status: 'ready',
};

export const DEFAULT_AUTOPILOT_POLICY = {
  derived: {
    cadenceMinutes: 15,
    cooldownMinutes: 45,
    maxTradesPerDay: 5,
    maxBetUsdc: 10,
    minSigma: 0.72,
    minKelly: 0.4,
    kellyMultiplier: 0.25,
    maxPositionFraction: 0.1,
    dailyLossLimitPct: 0.15,
    useAuraSentiment: true,
  },
  overrides: {
    cadenceMinutes: null,
    cooldownMinutes: null,
    maxTradesPerDay: null,
    maxBetUsdc: null,
    updatedAt: null,
  },
  effective: {
    cadenceMinutes: 15,
    cooldownMinutes: 45,
    maxTradesPerDay: 5,
    maxBetUsdc: 10,
    minSigma: 0.72,
    minKelly: 0.4,
    kellyMultiplier: 0.25,
    maxPositionFraction: 0.1,
    dailyLossLimitPct: 0.15,
    useAuraSentiment: true,
  },
};

export const DEFAULT_WALLET = {
  address: '0x1111111111111111111111111111111111111111',
  privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  seedPhrase: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu',
};

// ─── Fixture loader ─────────────────────────────────────────────────────────

const fixturesDir = join(__dirname, '..', 'fixtures');

export function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

// ─── Page error suppression ─────────────────────────────────────────────────

export function suppressKnownErrors(page: Page) {
  page.on('pageerror', (err) => {
    const msg = err.message || '';
    if (
      msg.includes('Minified React error #31') ||
      msg.includes('setPointerCapture') ||
      msg.includes('Minified React error') ||
      msg.includes('ResizeObserver loop')
    ) {
      return; // suppress known errors
    }
    // Re-throw unknown errors so tests still fail on real issues
    // (Playwright doesn't fail on pageerror by default, so this is informational)
  });
}

// ─── Mock helpers ───────────────────────────────────────────────────────────

export async function mockAgent(page: Page, overrides: Record<string, unknown> = {}) {
  const agent = {
    ...STANDARD_AGENT,
    autopilot_policy: DEFAULT_AUTOPILOT_POLICY,
    ...overrides,
  };
  await page.route('**/api/v1/agent/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agent) })
  );
}

export async function mockNoAgent(page: Page) {
  await page.route('**/api/v1/agent/me', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'No agent configured' }),
    })
  );
}

export async function mockWallet(page: Page, overrides: Record<string, unknown> = {}) {
  const wallet = { ...DEFAULT_WALLET, ...overrides };
  await page.route('**/api/wallet/generate', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wallet) })
  );
  return wallet;
}

export async function mockDashboardApis(page: Page) {
  await page.route('**/api/performance/summary*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('portfolio.json')) })
  );
  await page.route('**/api/performance/arena*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('arena-leaderboard.json')) })
  );
  await page.route('**/api/risk/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        circuitBreaker: 'ARMED',
        dailyPnl: 200,
        dailyPnlPct: 2,
        exposurePct: 24.3,
        availableCapital: 5400,
      }),
    })
  );
  await page.route('**/api/v1/risk-config*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('risk-config.json')) })
  );
  await page.route('**/api/health*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        checkedAt: Date.now(),
        message: 'All mission systems nominal',
        services: {
          backend: { status: 'healthy', detail: 'API online and serving dashboard telemetry' },
          relay: { status: 'healthy', detail: '2 active sessions' },
          scanner: { status: 'healthy', detail: 'Last scan 2m ago' },
          orchestrator: { status: 'healthy', detail: '2 candidates, last scan 1m ago' },
          pipeline_agents: { status: 'degraded', detail: '6 live · 1 degraded · 0 down' },
        },
      }),
    })
  );
  await page.route('**/api/agents/health*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('system-agent-health.json')) })
  );
  await page.route('**/api/wallet/positions*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/signals*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/orchestrator/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        lastScanAt: Date.now() - 60_000,
        nextScanAt: Date.now() + 240_000,
        marketsScanned: 5000,
        candidatesFound: 2,
        scanIntervalMs: 300000,
        status: 'idle',
      }),
    })
  );
  await page.route('**/api/orchestrator/candidates*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('orchestrator-candidates.json')) })
  );
  await page.route('**/api/markets/trending*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('trending-markets.json')) })
  );
  await page.route('**/api/stream/prices*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );
}

// ─── Auth helpers ──────────────────────────────────────────────────────────

export async function setupAuth(page: Page) {
  await setupClerkTestingToken({ page });
  // Navigate to root (public) so Clerk can load, then sign in via backend token
  await page.goto('/');
  await clerk.signIn({
    page,
    emailAddress: 'carlosroldan26396@gmail.com',
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForURL((url) => !url.pathname.includes('sign-in') && !url.pathname.includes('sign-up'), { timeout: 10000 }).catch(() => {});
}

export async function mockManageAgentApis(page: Page) {
  await page.route('**/api/v1/agents/*/autopilot-policy*', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_AUTOPILOT_POLICY) })
  );
  await page.route('**/api/v1/settings/telegram*', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ chatId: '', botToken: '', hasToken: false }),
    })
  );
  await page.route('**/api/wallet/balance*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('balance.json')) })
  );
  await page.route('**/api/wallet/positions*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('positions.json')) })
  );
  await page.route('**/api/signals*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('signals.json')) })
  );
  await page.route('**/api/performance/summary*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('performance-summary.json')) })
  );
  await page.route('**/api/v1/risk-config*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('risk-config.json')) })
  );
  await page.route('**/api/performance/trades*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loadFixture('trades.json')) })
  );
  await page.route('**/api/execution/log*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/scanner/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'idle', lastScanAt: Date.now() }),
    })
  );
  await page.route('**/api/scanner/results*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/pipeline/history*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/stream/prices*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );
}
