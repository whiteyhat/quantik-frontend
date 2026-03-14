import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockDashboardApis, loadFixture } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAgent(page);
    await mockDashboardApis(page);
  });

  test('loads the dashboard mission control grid', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Mission Control', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('dashboard-grid')).toBeVisible();
  });

  test('renders the mission rail with live telemetry tiles', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-command-strip')).toBeVisible();
    await expect(page.getByText('Refresh cadence')).toBeVisible();
    await expect(page.getByText('Capital posture')).toBeVisible();
    await expect(page.getByText('Runtime fabric')).toBeVisible();
    await expect(page.getByText('Agent traffic')).toBeVisible();
  });

  test('fires summary and risk requests exactly once per refresh cycle', async ({ page }) => {
    let summaryRequests = 0;
    let riskRequests = 0;

    await page.route('**/api/performance/summary*', async (route) => {
      summaryRequests += 1;
      const fixture = await loadFixture('portfolio.json');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    });

    await page.route('**/api/risk/status*', async (route) => {
      riskRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          circuitBreaker: 'ARMED',
          dailyPnl: 200,
          dailyPnlPct: 2,
          exposurePct: 24.3,
          availableCapital: 5400,
        }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-grid')).toBeVisible();

    expect(summaryRequests).toBe(1);
    expect(riskRequests).toBe(1);
  });

  test('renders the hero, portfolio, and risk surfaces', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Operate the whole trading stack')).toBeVisible();
    await expect(page.getByTestId('dashboard-portfolio-card')).toBeVisible();
    await expect(page.getByText('Portfolio')).toBeVisible();
    await expect(page.getByText('Available Cash')).toBeVisible();
    await expect(page.getByText('Capital in Play')).toBeVisible();
    await expect(page.getByText('Risk Posture')).toBeVisible();
    await expect(page.getByText('Exposure')).toBeVisible();
    await expect(page.getByText('Drawdown')).toBeVisible();
  });

  test('shows no open positions when the wallet is flat', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('No open positions')).toBeVisible();
  });

  test('renders open position rows when positions exist', async ({ page }) => {
    const fixture = await loadFixture('positions.json');
    await page.route('**/api/wallet/positions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    });
    await page.goto('/dashboard');
    await expect(page.getByText('Active Positions')).toBeVisible();
    await expect(page.getByText('YES')).toBeVisible();
  });

  test('renders orchestrator controls and scanner candidates', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-orchestrator-card')).toBeVisible();
    await expect(page.getByText('Orchestrator')).toBeVisible();
    await expect(page.getByText('Scan now')).toBeVisible();
    await expect(page.getByText('Will Bitcoin reach $100k')).toBeVisible();
  });

  test('scan now triggers an orchestrator scan', async ({ page }) => {
    await page.route('**/api/orchestrator/scan*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ triggered: true, marketsScanned: 25, candidatesFound: 4 }),
      });
    });

    await page.goto('/dashboard');
    const scanResponse = page.waitForResponse('**/api/orchestrator/scan*');
    await page.getByText('Scan now').click();
    await scanResponse;
  });

  test('renders the market scanner with explicit trending state', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Live Market Scanner')).toBeVisible();
    await expect(page.getByText('Trending stays explicit')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trending 🔥' })).toBeVisible();
    await expect(page.getByPlaceholder('Search active markets')).toBeVisible();
  });

  test('shows a CTA when the trending feed is empty', async ({ page }) => {
    await page.route('**/api/markets/trending*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ markets: [], total: 0, hasMore: false }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByText(/No trending markets|No trending matches/)).toBeVisible();
    await expect(page.getByText('Browse all markets')).toBeVisible();
  });

  test('renders structured service health and live agent telemetry', async ({ page }) => {
    await page.goto('/dashboard');
    const systemStatusCard = page.getByTestId('dashboard-system-status-card');
    await expect(systemStatusCard).toBeVisible();
    await expect(systemStatusCard.getByText('System Status', { exact: true })).toBeVisible();
    await expect(systemStatusCard.getByText('API Health', { exact: true })).toBeVisible();
    await expect(systemStatusCard.getByText('Service Map', { exact: true })).toBeVisible();
    await expect(systemStatusCard.getByText('Aura', { exact: true })).toBeVisible();
    await expect(systemStatusCard.getByText('Oracle', { exact: true })).toBeVisible();
  });

  test('shows a deliberate empty state when there is no agent traffic yet', async ({ page }) => {
    await page.route('**/api/agents/health*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overall: 'degraded',
          checkedAt: Date.now(),
          agents: [
            { name: 'aura', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'flux', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'oracle', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'edge', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'sigma', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'clause', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
            { name: 'lucifer', status: 'idle', lastActiveAt: 0, latencyMs: 0, errorRate: 0 },
          ],
        }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByText('Agents on standby')).toBeVisible();
  });

  test('renders the architecture mini-map and pilot deck', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Neural Web Mini-Map')).toBeVisible();
    await expect(page.getByTestId('dashboard-pilot-deck-card')).toBeVisible();
    await expect(page.getByText('Pilot Deck')).toBeVisible();
    await expect(page.getByText('Created-agent posture')).toBeVisible();
  });

  test('renders BYO pilot deck runtime health when a connected external agent is active', async ({ page }) => {
    await mockAgent(page, {
      agent_type: 'byo',
      name: 'Mercury',
      agent_code: 'BYO-009',
      connection_status: 'connected',
      autopilot_enabled: true,
      description: 'Connected via external runtime bridge',
    });
    await page.route('**/api/v1/agents/*/health-score', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            score: 91,
            status: 'healthy',
            message: 'Runtime is healthy and streaming events.',
          },
        }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-pilot-deck-card')).toBeVisible();
    await expect(page.getByText('Runtime health')).toBeVisible();
    await expect(page.getByText('connected')).toBeVisible();
    await expect(page.getByText('Runtime is healthy and streaming events.')).toBeVisible();
  });

  test('shows an empty recent-signals state when there are no fresh decisions', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('recent-signals')).toBeVisible();
    await expect(page.getByText('No recent signals')).toBeVisible();
  });

  test('renders signal rows when the feed returns entries', async ({ page }) => {
    const fixture = await loadFixture('signals.json');
    await page.route('**/api/signals*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
    });
    await page.goto('/dashboard');
    await expect(page.getByText('Recent Signals')).toBeVisible();
    await expect(page.getByTestId('signal-row')).not.toHaveCount(0);
  });

  test('shows health error messaging when /api/health fails', async ({ page }) => {
    await page.route('**/api/health*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.goto('/dashboard');
    await expect(page.getByText(/Health checks unavailable|unavailable/i)).toBeVisible();
  });

  test('shows dashboard card error states when core feeds fail', async ({ page }) => {
    await page.route('**/api/performance/summary*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/wallet/positions*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/risk/status*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/orchestrator/status*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/orchestrator/candidates*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/signals*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/dashboard');
    await expect(page.getByText(/Portfolio feed unavailable|unavailable/i)).toBeVisible();
    await expect(page.getByText(/Positions unavailable|unavailable/i)).toBeVisible();
    await expect(page.getByText(/Risk telemetry unavailable|unavailable/i)).toBeVisible();
    await expect(page.getByText(/Orchestrator offline|unavailable/i)).toBeVisible();
    await expect(page.getByText(/Signal feed unavailable|unavailable/i)).toBeVisible();
  });

  test('renders without hydration or page-level runtime errors', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-grid')).toBeVisible();
    await expect(page.getByText('Unhandled Runtime Error')).not.toBeVisible();
  });
});
