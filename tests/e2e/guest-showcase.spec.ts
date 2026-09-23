import { test, expect } from '@playwright/test';
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { loadFixture, mockAccess, mockAgent, mockManageAgentApis, mockNoAgent, setupAuth } from './fixtures';

// Guest showcase mode: signed-out visitors explore demo agent NOVA-7; signing
// in swaps in the member's real data without leaving the page.

const TEST_EMAIL = 'carlosroldan26396@gmail.com';

test.describe('Guest showcase', () => {
  test('a guest who signs in on My Agent sees their own agent, not the demo', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await mockAgent(page); // /me/access → hasAgent, /agent/me → Signal Scout
    await mockManageAgentApis(page);

    await page.goto('/manage-agent');
    const identity = page.locator('#tour-agent-identity');
    await expect(identity).toContainText('NOVA-7');
    await expect(page.locator('.demo-banner')).toBeVisible();

    await clerk.signIn({ page, emailAddress: TEST_EMAIL });

    await expect(identity).toContainText('Signal Scout');
    await expect(identity).not.toContainText('NOVA-7');
    await expect(page.locator('.demo-banner')).toHaveCount(0);
  });

  test('Agent Factory keeps a guest\'s answers across sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await mockNoAgent(page);
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Draft Keeper');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Agent Deployment Reveal')).toBeVisible();

    await page.getByRole('button', { name: "Sign in to mint your agent's wallet" }).click();
    await page.keyboard.press('Escape'); // the popup; sign in programmatically instead
    await clerk.signIn({ page, emailAddress: TEST_EMAIL });

    // Still on the launch step (not back at "Choose Your Path"), now minting the wallet
    await expect(page.getByText('Agent Deployment Reveal')).toBeVisible();
    await expect(page.getByText('Choose Your Path')).toHaveCount(0);
    await expect(page.getByText('Draft Keeper').first()).toBeVisible();
  });

  test('a failing access check never shows a member the demo or the quiz', async ({ page }) => {
    await setupAuth(page);
    await mockAgent(page);
    await mockAccess(page, { status: 500 }); // registered last, so it wins
    await mockManageAgentApis(page);

    await page.goto('/manage-agent');
    await expect(page.locator('#tour-agent-identity')).toContainText('Signal Scout');
    await expect(page.locator('.demo-banner')).toHaveCount(0);

    await page.goto('/agent-factory');
    await expect(page.getByText(/Max agent limit reached/)).toBeVisible();
    await expect(page.getByText('Choose Your Path')).toHaveCount(0);
  });
});
