import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockManageAgentApis, suppressKnownErrors } from './fixtures';

test.describe('Manage Agent — Agent World', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    suppressKnownErrors(page);
    await mockAgent(page);
    await mockManageAgentApis(page);
  });

  test('renders the Agent World shell when switching tabs', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('agent-world-stage')).toBeVisible();
  });

  test('shows loading state while initializing', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-stage')).toBeAttached({ timeout: 15000 });
  });

  test('Agent World tab renders without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('WORLD LOAD FAILED')).not.toBeVisible();
  });

  test('can trigger NPC detail panel by dispatching the legacy NPC event', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      const event = new CustomEvent('phaser:npc-clicked', { detail: { agentId: 'aura' } });
      window.dispatchEvent(event);
    });
    await expect(page.getByTestId('agent-world-detail-panel')).toBeVisible();
    await expect(page.getByTestId('agent-world-detail-panel').getByText('AURA', { exact: true })).toBeVisible();
  });

  test('detail panel shows agent info when opened', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('phaser:npc-clicked', { detail: { agentId: 'sigma' } }));
    });
    await expect(page.getByTestId('agent-world-detail-panel')).toBeVisible();
    await expect(page.getByTestId('agent-world-detail-panel').getByText('SIGMA', { exact: true })).toBeVisible();
  });

  test('detail panel can be closed by clicking X', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('phaser:npc-clicked', { detail: { agentId: 'oracle' } }));
    });
    await expect(page.getByTestId('agent-world-detail-panel')).toBeVisible();
    await page.getByText('x').click();
    await expect(page.getByTestId('agent-world-detail-panel')).not.toBeVisible();
  });

  test('world stage stays mounted after initialization', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-stage')).toBeVisible({ timeout: 15000 });
    const box = await page.getByTestId('agent-world-stage').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('can switch from Agent World back to Dashboard without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await page.locator('#tour-view-tabs').getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByText('Autopilot Control')).toBeVisible();
  });

  test('can switch from Agent World to Architecture without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.getByTestId('agent-world-shell')).toBeVisible({ timeout: 15000 });
    await page.getByText('Architecture').click();
    await expect(page.getByText('MAIN', { exact: false })).toBeVisible({ timeout: 10000 });
  });
});
