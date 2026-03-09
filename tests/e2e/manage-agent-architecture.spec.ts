import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockManageAgentApis } from './fixtures';

test.describe('Manage Agent — Architecture', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAgent(page);
    await mockManageAgentApis(page);
  });

  test('renders ReactFlow canvas when switching to Architecture tab', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await expect(page.getByText('MAIN', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('displays main agent node with emoji, name, and MAIN badge', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await expect(page.getByText('MAIN')).toBeVisible();
    await expect(page.getByText('🦊')).toBeVisible();
  });

  test('renders all 7 sub-agent nodes with names and roles', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();

    const agents = [
      { name: 'Aura', role: 'Sentiment Analysis' },
      { name: 'Flux', role: 'Liquidity Router' },
      { name: 'Clause', role: 'Smart Contracts' },
      { name: 'Oracle', role: 'Probability Engine' },
      { name: 'Edge', role: 'Data Ingestion' },
      { name: 'Lucifer', role: 'Risk Veto Protocol' },
      { name: 'Sigma', role: 'Final Decision' },
    ];

    for (const agent of agents) {
      await expect(page.getByText(agent.name)).toBeVisible();
      await expect(page.getByText(agent.role)).toBeVisible();
    }
  });

  test('displays sub-agent emojis', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();

    const emojis = ['🔮', '🌊', '📜', '🧿', '⚡', '😈', '🎯'];
    for (const emoji of emojis) {
      await expect(page.getByText(emoji)).toBeVisible();
    }
  });

  test('opens detail panel when clicking main agent node', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('MAIN').click({ force: true });
    await expect(page.getByText('PERSONALITY')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('TRADING PROFILE')).toBeVisible();
    await expect(page.getByText('RISK PROFILE')).toBeVisible();
    await expect(page.getByText('MARKET PREFERENCES')).toBeVisible();
    await expect(page.getByText('DEPLOYMENT')).toBeVisible();
    await expect(page.getByText('CONNECTED AGENTS')).toBeVisible();
  });

  test('detail panel shows wallet address with external links', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('MAIN').click({ force: true });
    await expect(page.getByText('DEPLOYMENT')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('0x1111')).toBeVisible();
  });

  test('opens detail panel when clicking sub-agent node', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('Sentiment Analysis').click({ force: true });
    await expect(page.getByText('DESCRIPTION')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('CONNECTED SERVICES')).toBeVisible();
  });

  test('sub-agent panel shows role and description', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('Liquidity Router').click({ force: true });
    await expect(page.getByText('DESCRIPTION')).toBeVisible({ timeout: 5000 });
  });

  test('closes detail panel via X button', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('MAIN').click({ force: true });
    await expect(page.getByText('PERSONALITY')).toBeVisible({ timeout: 5000 });
    await page.getByText('×').click();
    await expect(page.getByText('PERSONALITY')).not.toBeVisible();
  });

  test('navigates between main and sub-agent nodes', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await page.getByText('MAIN').click({ force: true });
    await expect(page.getByText('PERSONALITY')).toBeVisible({ timeout: 5000 });
    await page.getByText('×').click();
    await page.getByText('Final Decision').click({ force: true });
    await expect(page.getByText('DESCRIPTION')).toBeVisible({ timeout: 5000 });
  });

  test('shows enterprise architecture info badge', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await expect(page.getByText('Enterprise Architecture')).toBeVisible();
    await expect(page.getByText('7 sub-agents connected')).toBeVisible();
  });

  test('renders service nodes with labels', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Architecture').click();
    await expect(page.getByText('Sentiment Analyzer')).toBeVisible();
    await expect(page.getByText('Ensemble Engine')).toBeVisible();
  });
});
