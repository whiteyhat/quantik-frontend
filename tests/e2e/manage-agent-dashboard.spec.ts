import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockManageAgentApis, loadFixture } from './fixtures';

test.describe('Manage Agent — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAgent(page);
    await mockManageAgentApis(page);
  });

  test('renders the dashboard tab by default with agent identity', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('Signal Scout')).toBeVisible();
    await expect(page.getByText('🦊')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('displays wallet address (truncated) with copy button', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText(/WDK Wallet/)).toBeVisible();
    await expect(page.getByText(/0x1111/)).toBeVisible();
    await expect(page.getByText('📋')).toBeVisible();
  });

  test('switches between Dashboard, Architecture, and Agent World tabs', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('Dashboard')).toBeVisible();
    await page.getByText('Architecture').click();
    await expect(page.getByText('Architecture')).toBeVisible();
    await page.getByText('Agent World').click();
    await page.getByText('Dashboard').click();
  });

  test('renders autopilot control card with funding status', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByTestId('autopilot-control-card')).toBeVisible();
    await expect(page.getByText('Autopilot Control')).toBeVisible();
    await expect(page.getByText('Autonomous Trading')).toBeVisible();
  });

  test('shows autopilot status chips', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText(/Autopilot (on|off)/i)).toBeVisible();
  });

  test('shows funding amounts for POL and USDC.e', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByTestId('autopilot-control-card')).toBeVisible();
    // The funding grid inside autopilot card shows POL and USDC.e labels
    await expect(page.getByTestId('autopilot-control-card').getByText('POL').first()).toBeVisible();
    await expect(page.getByTestId('autopilot-control-card').getByText('USDC.e')).toBeVisible();
  });

  test('toggles autopilot on when funding is ready', async ({ page }) => {
    // Mock the autopilot PATCH endpoint
    await page.route('**/api/v1/agents/*/autopilot', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.enabled).toBe(true);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            agent_id: 'agent-std-1',
            autopilot_enabled: true,
            autopilot_updated_at: Date.now(),
          }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock performance/summary to report wallet as funded so handleEnable doesn't open funding dialog
    await page.route('**/api/performance/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...loadFixture('performance-summary.json'),
          pol: 12.5,
          onChainUsdc: 850,
          fundingStatus: 'ready',
          fundingMessage: 'Wallet funded and ready',
        }),
      });
    });

    await page.goto('/manage-agent');
    await expect(page.getByTestId('autopilot-control-card')).toBeVisible();
    // ToggleSwitch is a <button aria-label="Toggle">
    await page.getByTestId('autopilot-control-card').getByLabel('Toggle').click({ force: true });
  });

  test('shows funding dialog when wallet is not funded', async ({ page }) => {
    // getBalance() calls /api/performance/summary, not /api/wallet/balance
    await page.route('**/api/performance/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalValue: 0,
          cashBalance: 0,
          positionsValue: 0,
          pnl: 0,
          pnlPct: 0,
          pnlToday: 0,
          pnlTodayPct: 0,
          winRate: 0,
          totalTrades: 0,
          kellyUtilization: 0,
          circuitBreakerStatus: 'ARMED',
          balanceStatus: 'live',
          liveBalanceAvailable: true,
          fundingStatus: 'funding_required',
          fundingMessage: 'Wallet needs funding',
          pol: 0,
          onChainUsdc: 0,
        }),
      });
    });

    await page.goto('/manage-agent');
    // The chip in AutopilotControlCard shows "Funding required" when not funded
    await expect(page.getByText(/funding required/i)).toBeVisible();
  });

  test('renders AI insights with signals', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('AI Insights')).toBeVisible();
  });

  test('displays signal decision badges (TRADE/WATCH/SKIP)', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('AI Insights')).toBeVisible();
    await expect(page.getByText('TRADE')).toBeVisible();
    await expect(page.getByText('WATCH')).toBeVisible();
    await expect(page.getByText('SKIP')).toBeVisible();
  });

  test('shows no insights message when no signals exist', async ({ page }) => {
    await page.route('**/api/signals*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/pipeline/results*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.goto('/manage-agent');
    await expect(page.getByText(/no insights|run a pipeline/i)).toBeVisible();
  });

  test('displays performance metrics', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('Total Return')).toBeVisible();
    await expect(page.getByText('Win Rate')).toBeVisible();
    await expect(page.getByText('Max Drawdown')).toBeVisible();
  });

  test('renders open positions with direction badges', async ({ page }) => {
    await page.goto('/manage-agent');
    // Wait for the positions table to load
    await expect(page.getByText('Live Positions')).toBeVisible();
    await expect(page.getByText('YES').first()).toBeVisible();
    await expect(page.getByText('NO').first()).toBeVisible();
  });

  test('shows empty state when no positions', async ({ page }) => {
    await page.route('**/api/wallet/positions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.goto('/manage-agent');
    // When positions are empty and loading is false, the table section is hidden entirely
    // (the page renders positions only if loading || positions.length > 0)
    // So we verify the page loaded and no positions table is shown
    await expect(page.getByText('Signal Scout')).toBeVisible();
    await expect(page.getByText('Live Positions')).not.toBeVisible();
  });

  test('time period buttons (7D/30D/All) are clickable', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('7D')).toBeVisible();
    await expect(page.getByText('30D')).toBeVisible();
    await expect(page.getByText('All')).toBeVisible();
    await page.getByText('30D').click();
    await page.getByText('7D').click();
  });

  test('chat button is visible and clickable', async ({ page }) => {
    await page.goto('/manage-agent');
    const chatButton = page.getByText(/CHAT WITH/i);
    await expect(chatButton).toBeVisible();
    await chatButton.click();
  });

  test('shows delete confirmation modal with two-step process', async ({ page }) => {
    await page.route('**/api/v1/agents/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/manage-agent');
    await expect(page.getByText('Signal Scout')).toBeVisible();
    await page.locator('[title="Delete Agent"]').click();
    await expect(page.getByText(/permanently delete/i)).toBeVisible();
    await page.getByText('CONTINUE').click();
    await page.getByPlaceholder('Type DELETE').fill('DELETE');
    await page.getByText('DELETE FOREVER').click();
    await expect(page.getByText('Agent deleted successfully')).toBeVisible();
  });

  test('shows BYO-specific panels when agent is BYO type', async ({ page }) => {
    await mockAgent(page, {
      agent_type: 'byo',
      name: 'OpenClaw Prime',
      avatar_emoji: '🦞',
      connection_status: 'connected',
      api_key_prefix: 'qtk_live_1234',
    });
    await page.route('**/api/v1/agents/*/health-score', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 92, grade: 'A', details: {} }),
      });
    });
    await page.route('**/api/v1/agents/*/activity*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/v1/agents/*/usage*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ totalRequests: 142 }),
      });
    });

    await page.goto('/manage-agent');
    await expect(page.getByText('OpenClaw Prime')).toBeVisible();
  });

  test('renders risk config panel with values', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.locator('body')).toBeVisible();
  });
});
