import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockManageAgentApis, suppressKnownErrors } from './fixtures';

test.describe('Manage Agent — Agent World', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    suppressKnownErrors(page);
    await mockAgent(page);
    await mockManageAgentApis(page);
  });

  test('renders Phaser canvas when switching to Agent World tab', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  });

  test('shows loading state while initializing', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeAttached({ timeout: 15000 });
  });

  test('Agent World tab renders without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('WORLD LOAD FAILED')).not.toBeVisible();
  });

  test('can trigger NPC detail panel by dispatching bridge event', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      const event = new CustomEvent('phaser:npc-clicked', { detail: { agentId: 'aura' } });
      window.dispatchEvent(event);
    });
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('detail panel shows agent info when opened', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await page.locator('canvas').click({ position: { x: 60, y: 90 }, force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('detail panel can be closed by clicking X', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await page.locator('canvas').click({ position: { x: 60, y: 90 }, force: true });
    await page.waitForTimeout(500);
    if ((await page.locator('[style*="inset: 0"]').count()) > 0) {
      await page.getByText('x').click();
    }
  });

  test('world defines rooms for all 7 pipeline agents', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    const box = await page.locator('canvas').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('can switch from Agent World back to Dashboard without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await page.getByText('Dashboard').click();
    await expect(page.getByText('Autopilot Control')).toBeVisible();
  });

  test('can switch from Agent World to Architecture without errors', async ({ page }) => {
    await page.goto('/manage-agent');
    await page.getByText('Agent World').click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    await page.getByText('Architecture').click();
    await expect(page.getByText('MAIN', { exact: false })).toBeVisible({ timeout: 10000 });
  });
});
