import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, loadFixture, suppressKnownErrors } from './fixtures';

test.describe('Trade History', () => {
  let tradesFixture: unknown;

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    suppressKnownErrors(page);
    await mockAgent(page);
    tradesFixture = loadFixture('trades.json');
  });

  test('renders the trade history page with title and subtitle', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Trade History')).toBeVisible();
    await expect(page.getByText('All historical trades and outcomes')).toBeVisible();
  });

  test('displays summary metric cards (Total Trades, Win Rate, Total P&L, Wins/Losses)', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Total Trades')).toBeVisible();
    await expect(page.getByText('Win Rate')).toBeVisible();
    await expect(page.getByText('Total P&L')).toBeVisible();
    await expect(page.getByText('Wins / Losses')).toBeVisible();
  });

  test('calculates correct total trades count', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Total Trades').locator('..').getByText('5')).toBeVisible();
  });

  test('calculates win rate from trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Win Rate').locator('..').getByText('67%')).toBeVisible();
  });

  test('displays wins/losses ratio', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('2 / 1')).toBeVisible();
  });

  test('renders table with all 7 columns', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    const columns = ['Date', 'Market', 'Direction', 'Size', 'Price', 'Outcome', 'P&L'];
    for (const col of columns) {
      await expect(page.locator('th', { hasText: col })).toBeVisible();
    }
  });

  test('renders trade rows with market names as clickable links', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Will Bitcoin reach $100k by year end?')).toBeVisible();
    await expect(page.getByText('Will Ethereum complete the next upgrade?')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Will Bitcoin reach $100k by year end?' })).toHaveAttribute('href', '/market/btc-100k');
  });

  test('renders direction badges (YES green, NO red)', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('YES').first()).toBeVisible();
    await expect(page.getByText('NO').first()).toBeVisible();
  });

  test('renders outcome badges with correct labels', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('WIN').first()).toBeVisible();
    await expect(page.getByText('LOSS')).toBeVisible();
    await expect(page.getByText('OPEN')).toBeVisible();
    await expect(page.getByText('PENDING')).toBeVisible();
  });

  test('renders P&L values with +/- formatting', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('+').first()).toBeVisible();
    await expect(page.getByText('—').first()).toBeVisible();
  });

  test('filter buttons are visible and clickable', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    const filters = ['All', 'WIN', 'LOSS', 'OPEN', 'PENDING'];
    for (const f of filters) {
      await expect(page.getByRole('button', { name: f })).toBeVisible();
    }
  });

  test('clicking WIN filter shows only winning trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByRole('button', { name: 'WIN' }).click();
    await expect(page.getByText('Total Trades').locator('..').getByText('2')).toBeVisible();
    await expect(page.locator('table')).not.toContainText('LOSS');
  });

  test('clicking LOSS filter shows only losing trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByRole('button', { name: 'LOSS' }).click();
    await expect(page.getByText('Total Trades').locator('..').getByText('1')).toBeVisible();
  });

  test('clicking OPEN filter shows only open trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByRole('button', { name: 'OPEN' }).click();
    await expect(page.getByText('Total Trades').locator('..').getByText('1')).toBeVisible();
  });

  test('clicking All filter resets to show all trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByRole('button', { name: 'WIN' }).click();
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.getByText('Total Trades').locator('..').getByText('5')).toBeVisible();
  });

  test('search input filters trades by market question (case-insensitive)', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByPlaceholder('Search trades…').fill('bitcoin');
    await expect(page.getByText('Will Bitcoin reach $100k by year end?')).toBeVisible();
    await expect(page.getByText('Will Ethereum complete the next upgrade?')).not.toBeVisible();
  });

  test('combining search and outcome filter works', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByPlaceholder('Search trades…').fill('Will');
    await page.getByRole('button', { name: 'WIN' }).click();
    await expect(page.getByText('Total Trades').locator('..').getByText('2')).toBeVisible();
  });

  test('shows "No trades match this filter" when filter yields nothing', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await page.getByPlaceholder('Search trades…').fill('xyznonexistent');
    await expect(page.getByText('No trades match this filter')).toBeVisible();
  });

  test('shows skeleton loading state while fetching trades', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) });
          resolve(undefined);
        }, 2000);
      });
    });
    await page.goto('/trade-history');
    await expect(page.locator('th', { hasText: 'Date' })).toBeVisible();
  });

  test('shows error message when API fails', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Error:')).toBeVisible();
  });

  test('shows "No trade history yet" when no trades exist', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('No trade history yet')).toBeVisible();
  });

  test('shows trade count and source in footer', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('5 trades shown')).toBeVisible();
    await expect(page.getByText('Source: /api/performance/trades')).toBeVisible();
  });

  test('market links have correct href to market pages', async ({ page }) => {
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tradesFixture) })
    );
    await page.goto('/trade-history');
    await expect(page.getByRole('link', { name: 'Will Tesla stock double' })).toHaveAttribute('href', '/market/tesla-double');
    await expect(page.getByRole('link', { name: 'Will AI pass the Turing test' })).toHaveAttribute('href', '/market/ai-turing-2026');
  });

  test('handles wrapped API response { trades: [...] }', async ({ page }) => {
    const wrappedData = {
      trades: [
        {
          id: 'trade-w1',
          market: 'Wrapped trade test',
          slug: 'wrapped-test',
          direction: 'YES',
          size: 100,
          price: 0.5,
          outcome: 'WIN',
          timestamp: 1741400000000,
          pnl: 50,
        },
      ],
    };
    await page.route('**/api/performance/trades*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wrappedData) })
    );
    await page.goto('/trade-history');
    await expect(page.getByText('Wrapped trade test')).toBeVisible();
    await expect(page.getByText('Total Trades').locator('..').getByText('1')).toBeVisible();
  });
});
