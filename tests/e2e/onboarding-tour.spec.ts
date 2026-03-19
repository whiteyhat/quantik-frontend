import { expect, test } from "@playwright/test";

import {
  loadFixture,
  mockDashboardApis,
  mockManageAgentApis,
  setupAuth,
} from "./fixtures";

test.describe("Onboarding tour", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test("starts on agent factory after first sign-up and continues through the product tour", async ({ page }) => {
    const wallet = await loadFixture("wallet.json");
    const createdAgent = await loadFixture("created-agent.json");
    let activeAgent: Record<string, unknown> | null = null;

    await page.route("**/api/v1/agent/me", (route) =>
      route.fulfill({
        status: activeAgent ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(activeAgent ?? { error: "No agent configured" }),
      })
    );
    await page.route("**/api/wallet/generate", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wallet) })
    );
    await page.route("**/api/v1/agents", (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      activeAgent = createdAgent;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(createdAgent) });
    });
    await mockManageAgentApis(page);
    await mockDashboardApis(page);

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Get Started/i }).click();

    await expect(page).toHaveURL(/\/agent-factory$/);
    await expect(page.locator('[data-product-tour-card="true"]')).toBeVisible();
    await expect(page.getByText("Choose your path")).toBeVisible();

    await page.locator("#tour-factory-create").click();
    await expect(page.getByText("Initialize New Agent")).toBeVisible();

    // Dismiss the create-wizard tour that auto-starts on step 1
    const wizardTourCard = page.locator('[data-product-tour-card="true"]');
    if (await wizardTourCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.getByRole("button", { name: /Skip tour/i }).click();
    }

    await page.getByPlaceholder("e.g. Tiger the Fast").fill("Tour Agent");
    await page.getByText("Skip (Randomize)").click();
    await expect(page.getByText("Download Private Key")).toBeVisible();
    await page.getByText("Download Private Key").click();
    await page.getByText("Deploy Agent").click();

    await expect(page).toHaveURL(/\/manage-agent$/);
    await expect(page.locator('[data-product-tour-card="true"]')).toBeVisible();
    await expect(page.getByText("Identity Card")).toBeVisible();

    await page.getByRole("button", { name: /^Next$/ }).click();
    await expect(page.getByText("Autopilot Mode")).toBeVisible();
    await page.getByRole("button", { name: /^Next$/ }).click();
    await expect(page.getByText("Explore Views")).toBeVisible();

    await page.getByRole("button", { name: /Continue to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Mission Control")).toBeVisible();

    await page.getByRole("button", { name: /^Next$/ }).click();
    await expect(page.getByText("Mission Rail")).toBeVisible();
    await page.getByRole("button", { name: /^Next$/ }).click();
    await expect(page.getByText("The Orchestrator")).toBeVisible();

    await page.getByRole("button", { name: /Continue to Arena/i }).click();
    await expect(page).toHaveURL(/\/arena$/);
    await expect(page.getByText("The Arena")).toBeVisible();
  });

  test("shows a real factory tour card on mobile instead of only a floating rail", async ({ page }) => {
    const activeAgent: Record<string, unknown> | null = null;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/v1/agent/me", (route) =>
      route.fulfill({
        status: activeAgent ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(activeAgent ?? { error: "No agent configured" }),
      })
    );

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Get Started/i }).click();

    await expect(page).toHaveURL(/\/agent-factory$/);
    await expect(page.locator('[data-product-tour-card="true"]')).toBeVisible();
    await expect(page.getByText("Choose your path")).toBeVisible();
    await expect(page.locator("#tour-factory-create")).toBeVisible();
  });
});
