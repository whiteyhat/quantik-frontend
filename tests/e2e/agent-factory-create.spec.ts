import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockNoAgent, loadFixture } from './fixtures';

test.describe('Agent Factory — Create Agent', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockNoAgent(page);
  });

  test('renders the path selection landing with Create and BYO options', async ({ page }) => {
    await page.goto('/agent-factory');
    await expect(page.getByText('Choose Your Path')).toBeVisible();
    await expect(page.getByText('Create from Scratch')).toBeVisible();
    await expect(page.getByText('5-STEP WIZARD')).toBeVisible();
    await expect(page.getByText('Bring Your Own OpenClaw Agent')).toBeVisible();
    await expect(page.getByText('OPENCLAW COMPATIBLE')).toBeVisible();
  });

  test('navigates to step 1 when clicking Create from Scratch', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await expect(page.getByText('Initialize New Agent')).toBeVisible();
    await expect(page.getByText('Designation / Name')).toBeVisible();
  });

  test('walks through all 5 steps with valid config and step indicators update', async ({ page }) => {
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();

    // Step 1
    await expect(page.getByText('Initialize New Agent')).toBeVisible();
    await expect(page.getByText('Creation Progress')).toBeVisible();
    await expect(page.getByText('Basic Identity')).toBeVisible();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Alpha Wolf');
    await page.getByText('Continue to Strategy').click();

    // Step 2
    await expect(page.getByText('Trading Style')).toBeVisible();
    await expect(page.getByText('Trading Instinct')).toBeVisible();
    await expect(page.getByText('Trend Chaser')).toBeVisible();
    await page.getByText('Continue to Risk & Money').click();

    // Step 3
    await expect(page.getByText('Risk & Money')).toBeVisible();
    await expect(page.getByText('Money Approach')).toBeVisible();
    await page.getByText('Continue to Preferences').click();

    // Step 4
    await expect(page.getByText('Market Preferences')).toBeVisible();
    await expect(page.getByText('Market Sense')).toBeVisible();
    await page.getByText('Launch your agent').click();

    // Step 5
    await expect(page.getByText('Agent Deployment Reveal')).toBeVisible();
    await expect(page.getByText('Assigned Agent Wallet')).toBeVisible();
  });

  test('validates name is required before allowing next step', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await expect(page.getByText('Continue to Strategy')).toBeVisible();
    await expect(page.getByText('Name required')).toBeVisible();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Test Agent');
    await expect(page.getByText('Name required')).not.toBeVisible();
  });

  test('selects an avatar from the inline picker', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await expect(page.getByText('Avatar Symbol')).toBeVisible();
    await page.getByText('🐱').click();
    await expect(page.getByText('🐱').locator('..')).toBeVisible();
  });

  test('selects personality and decision style radio cards', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await expect(page.getByText('Balanced Trader')).toBeVisible();
    await page.getByText('Careful Guardian').click();
    await expect(page.getByText('Deep Analyst')).toBeVisible();
    await page.getByText('Patient Observer').click();
  });

  test('selects trading instinct, time patience, and profit dream', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Style Test');
    await page.getByText('Continue to Strategy').click();
    await expect(page.getByText('Trend Chaser')).toBeVisible();
    await page.getByText('Speed Demon').click();
    await page.getByText('Lightning Day Trader').click();
    await page.getByText('Big Moves').click();
    await page.getByText('Continue to Risk & Money').click();
    await expect(page.getByText('Money Approach')).toBeVisible();
  });

  test('selects money approach and protection mindset', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Risk Test');
    await page.getByText('Continue to Strategy').click();
    await page.getByText('Continue to Risk & Money').click();
    await expect(page.getByText('Fixed & Safe')).toBeVisible();
    await page.getByText('Aggressive Sizer').click();
    await expect(page.getByText('Tight Guardian')).toBeVisible();
    await page.getByText('Hands-off').click();
    await page.getByText('Continue to Preferences').click();
    await expect(page.getByText('Market Sense')).toBeVisible();
  });

  test('selects market sense and asset love', async ({ page }) => {
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Pref Test');
    await page.getByText('Continue to Strategy').click();
    await page.getByText('Continue to Risk & Money').click();
    await page.getByText('Continue to Preferences').click();
    await expect(page.getByText('Fixed Rules')).toBeVisible();
    await page.getByText('Mood Reader').click();
    await expect(page.getByText('Crypto Rebel')).toBeVisible();
    await page.getByText('All-Rounder').click();
    await page.getByText('Launch your agent').click();
    await expect(page.getByText('Agent Deployment Reveal')).toBeVisible();
  });

  test('generates wallet on step 5 entry and displays address', async ({ page }) => {
    const wallet = {
      address: '0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234',
      privateKey: '0xprivkey123',
      seedPhrase: 'word1 word2 word3 word4',
    };
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wallet) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Wallet Test');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Assigned Agent Wallet')).toBeVisible();
    await expect(page.getByText(wallet.address.slice(0, 10))).toBeVisible();
  });

  test('shows the wallet foundry experience while the agent wallet is still generating', async ({ page }) => {
    const wallet = {
      address: '0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333',
      privateKey: '0xslowwallet',
      seedPhrase: 'alpha beta gamma delta epsilon',
    };

    await page.route('**/api/wallet/generate', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wallet) });
    });

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Slow Forge');
    await page.getByText('Skip (Randomize)').click();

    await expect(page.getByText('Forging your agent vault')).toBeVisible();
    await expect(page.getByText('While you wait')).toBeVisible();
    await expect(page.getByText(wallet.address.slice(0, 10))).toBeVisible();
  });

  test('downloads private key file and shows secured state', async ({ page }) => {
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Key Test');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Download Private Key')).toBeVisible();
    await page.getByText('Download Private Key').click();
    await expect(page.getByText('Private Key Secured')).toBeVisible();
  });

  test('deploys agent with correct payload and navigates to manage-agent', async ({ page }) => {
    const wallet = {
      address: '0x1111111111111111111111111111111111111111',
      privateKey: '0xabcdef',
      seedPhrase: 'alpha beta gamma delta',
    };
    const createdAgentFixture = await loadFixture('created-agent.json');

    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wallet) })
    );
    await page.route('**/api/v1/agents', (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        expect(body.wallet_address).toBe(wallet.address);
        expect(body.name).toBeTruthy();
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(createdAgentFixture) });
      } else {
        route.fallback();
      }
    });
    await page.route('**/api/v1/agent/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createdAgentFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Download Private Key')).toBeVisible();
    await page.getByText('Download Private Key').click();
    await page.getByText('Deploy Agent').click();
    await expect(page).toHaveURL(/\/manage-agent/);
  });

  test('skip randomize fills all fields and jumps to step 5', async ({ page }) => {
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Skip Test');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Agent Deployment Reveal')).toBeVisible();
    await expect(page.getByText('Assigned Agent Wallet')).toBeVisible();
  });

  test('back button navigates to previous step', async ({ page }) => {
    await page.goto('/agent-factory');
    await page.getByText('Create from Scratch').click();
    await page.getByPlaceholder('e.g. Tiger the Fast').fill('Back Test');
    await page.getByText('Continue to Strategy').click();
    await expect(page.getByText('Trading Instinct')).toBeVisible();
    await page.getByText('← Back').click();
    await expect(page.getByText('Identity Configuration')).toBeVisible();
  });

  test('shows wallet error when generation fails', async ({ page }) => {
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Wallet service unavailable' }) })
    );

    await page.goto('/agent-factory');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText(/failed|error|unavailable/i)).toBeVisible();
  });

  test('shows deploy error when agent creation fails', async ({ page }) => {
    const walletFixture = await loadFixture('wallet.json');
    await page.route('**/api/wallet/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(walletFixture) })
    );
    await page.route('**/api/v1/agents', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal server error' }) });
      } else {
        route.fallback();
      }
    });

    await page.goto('/agent-factory');
    await page.getByText('Skip (Randomize)').click();
    await expect(page.getByText('Download Private Key')).toBeVisible();
    await page.getByText('Download Private Key').click();
    await page.getByText('Deploy Agent').click();
    await expect(page.getByText(/failed|error/i)).toBeVisible();
  });

  test('shows locked state when user already has an agent', async ({ page }) => {
    await mockAgent(page, { name: 'Existing Agent', avatar_emoji: '🐺' });
    await page.goto('/agent-factory');
    await expect(page.getByText('Max agent limit reached')).toBeVisible();
    await expect(page.getByText('Existing Agent')).toBeVisible();
    await expect(page.getByText('🐺')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Agent' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Import OpenClaw' })).toBeDisabled();
    await expect(page.getByText('Delete Agent')).toBeVisible();
  });

  test('locked state manage button navigates to manage-agent', async ({ page }) => {
    await mockAgent(page, { name: 'Existing Agent' });
    await page.goto('/agent-factory');
    await page.getByText('Manage Existing Agent →').click();
    await expect(page).toHaveURL(/\/manage-agent/);
  });

  test('shows delete confirmation modal and deletes agent', async ({ page }) => {
    await mockAgent(page, { name: 'Doomed Agent', id: 'agent-doom-1' });
    await page.route('**/api/v1/agents/agent-doom-1', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      } else {
        route.fallback();
      }
    });

    await page.goto('/agent-factory');
    await page.getByText('Delete Agent').click();
    await expect(page.getByText('Delete Doomed Agent?')).toBeVisible();
    await expect(page.getByText('This will permanently remove')).toBeVisible();
    await page.getByText('Confirm Delete').click();
  });
});
