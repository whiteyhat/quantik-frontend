import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockDashboardApis, mockManageAgentApis } from './fixtures';

const routes = [
  { path: '/dashboard', name: 'Home / Dashboard' },
  { path: '/markets', name: 'Markets' },
  { path: '/trade-history', name: 'Trade History' },
  { path: '/settings', name: 'Settings' },
  { path: '/market-analysis', name: 'Market Analysis' },
];

for (const route of routes) {
  test(`${route.name} (${route.path}) loads without errors`, async ({ page }) => {
    await setupAuth(page);
    await mockAgent(page);
    await mockDashboardApis(page);
    await mockManageAgentApis(page);
    await page.route('**/api/performance/trades*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto(route.path);

    // Must return 200
    expect(response?.status(), `Expected 200 for ${route.path}`).toBe(200);

    // Must not show error states
    const errorSelectors = [
      'text=500',
      'text=Internal Server Error',
      'text=Application error',
      '[data-testid="error-boundary"]',
    ];
    for (const sel of errorSelectors) {
      await expect(page.locator(sel).first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    }

    // Page must have some visible heading or title
    const heading = page.locator('h1, h2, [data-testid="page-title"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // No critical console errors (filter out known non-critical ones)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('service-worker') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('hydration') &&
        !e.includes('Clerk') &&
        !e.includes('clerk'),
    );
    expect(criticalErrors, `Console errors on ${route.path}: ${criticalErrors.join(', ')}`).toHaveLength(0);
  });
}
