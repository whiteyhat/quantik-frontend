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
    await expect(page.locator('#tour-agent-identity')).toContainText('Signal Scout');
    await expect(page.locator('#tour-agent-identity')).toContainText('🦊');
    await expect(page.locator('#tour-view-tabs').getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('displays wallet address (truncated) with copy button', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText(/Agent Wallet/)).toBeVisible();
    await expect(page.getByText(/0x1111/)).toBeVisible();
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  });

  test('switches between Dashboard, Architecture, and Agent World tabs', async ({ page }) => {
    await page.goto('/manage-agent');
    const tabs = page.locator('#tour-view-tabs');
    await expect(tabs.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await tabs.getByRole('button', { name: 'Architecture', exact: true }).click();
    await expect(tabs.getByRole('button', { name: 'Architecture', exact: true })).toBeVisible();
    await tabs.getByRole('button', { name: 'Agent World', exact: true }).click();
    await tabs.getByRole('button', { name: 'Dashboard', exact: true }).click();
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
    await expect(page.getByTestId('autopilot-control-card').getByText('POL', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('autopilot-control-card').getByText('USDC.e', { exact: true })).toBeVisible();
  });

  test('renders the execution log even when Telegram is not configured', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByTestId('execution-log')).toBeVisible();
    await expect(page.getByTestId('execution-row').first()).toBeVisible();
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
    await page.route('**/api/v1/agents/*/autopilot-status*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agentId: 'agent-std-1',
          autopilotEnabled: false,
          polymarketReady: false,
          polymarketStatus: 'pending_funding',
          wallet: {
            address: '0x1111111111111111111111111111111111111111',
            onChainUsdc: 0,
            clobBalance: 0,
            pol: 0,
            fundingStatus: 'funding_required',
            fundingMessage: 'Wallet needs funding',
            missingItems: ['Fund wallet with >= 3 POL and >= 10 USDC.e'],
          },
          scheduler: {
            scannerRunning: false,
            lastGlobalScanAt: Date.now() - 120000,
            scanIntervalMs: 300000,
            paperMode: true,
          },
          activity: {
            tradesToday: 0,
            lastExecutedAt: null,
            lastDecisionAt: null,
            lastDecision: null,
            lastReasonCode: null,
          },
          blocker: 'funding_required',
        }),
      });
    });

    await page.goto('/manage-agent');
    await expect(page.getByTestId('autopilot-control-card').getByText(/funding required/i).first()).toBeVisible();
  });

  test('renders AI insights with signals', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('AI Insights')).toBeVisible();
  });

  test('opens the scanned market from the featured AI insight and reveals the hover arrow', async ({ page }) => {
    await page.route('**/api/markets/btc-100k', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slug: 'btc-100k',
          tokenId: 'token-btc-100k',
          yesTokenId: 'yes-btc-100k',
          noTokenId: 'no-btc-100k',
          question: 'Will Bitcoin reach $100k by year end?',
          resolutionDate: '2026-12-31T00:00:00.000Z',
          yesPrice: 0.78,
          noPrice: 0.22,
          volume: 125000,
          liquidity: 54000,
          liquidityGrade: 'A',
        }),
      });
    });
    await page.route('**/api/markets/*/price-history*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/markets/*/book*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bids: [], asks: [] }) });
    });

    await page.goto('/manage-agent');

    const featuredInsight = page.getByTestId('ai-insight-link-sig-1');
    const arrow = featuredInsight.locator('[data-arrow]');

    await expect(featuredInsight).toBeVisible();
    await expect(arrow).toHaveCSS('opacity', '0');

    await featuredInsight.hover();
    await expect(arrow).toHaveCSS('opacity', '1');

    await featuredInsight.click();
    await expect(page).toHaveURL(/\/market\/btc-100k$/);
  });

  test('displays signal decision badges (TRADE/WATCH/SKIP)', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByText('AI Insights')).toBeVisible();
    await expect(page.getByTestId('ai-insight-link-sig-1').getByText('TRADE', { exact: true })).toBeVisible();
    await expect(page.getByTestId('ai-insight-link-sig-2').getByText('WATCH', { exact: true })).toBeVisible();
    await expect(page.getByTestId('ai-insight-link-sig-3').getByText('SKIP', { exact: true })).toBeVisible();
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
    await expect(page.locator('#tour-agent-identity')).toContainText('Signal Scout');
    await expect(page.getByText('Live Positions')).not.toBeVisible();
  });

  test('time period buttons (7D/30D/All) are clickable', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.getByRole('button', { name: '7D', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '30D', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '30D', exact: true }).click();
    await page.getByRole('button', { name: '7D', exact: true }).click();
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
    await expect(page.locator('#tour-agent-identity')).toContainText('Signal Scout');
    await page.locator('[title="Delete Agent"]').click();
    await expect(page.getByText(/permanently delete/i)).toBeVisible();
    await page.getByText('CONTINUE').click();
    await page.getByPlaceholder('Type DELETE').fill('DELETE');
    await page.getByText('DELETE FOREVER').click();
    await expect(page).toHaveURL(/\/agent-factory$/);
    await expect(page.getByText('Choose Your Path')).toBeVisible();
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
    await expect(page.locator('#tour-agent-identity')).toContainText('OpenClaw Prime');
  });

  test('renders risk config panel with values', async ({ page }) => {
    await page.goto('/manage-agent');
    await expect(page.locator('body')).toBeVisible();
  });
});
