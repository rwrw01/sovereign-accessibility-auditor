/**
 * Screenshot script — captures all dashboard pages with Playwright.
 * Usage: npx playwright test docs/take-screenshots.ts --config packages/dashboard/playwright.config.ts
 */
import { test } from "@playwright/test";

const SCREENSHOTS_DIR = "../../docs/screenshots";

test("Screenshot: Login pagina", async ({ page }) => {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login.png`, fullPage: true });
});

test("Screenshot: Dashboard (welkom)", async ({ page }) => {
  // Dashboard redirects to login when not authenticated — capture that state
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-dashboard.png`, fullPage: true });
});

test("Screenshot: Nieuwe scan", async ({ page }) => {
  await page.goto("/scan");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-scan.png`, fullPage: true });
});

test("Screenshot: Rapportage", async ({ page }) => {
  await page.goto("/rapportage");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-rapportage.png`, fullPage: true });
});

test("Screenshot: Instellingen", async ({ page }) => {
  await page.goto("/instellingen");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-instellingen.png`, fullPage: true });
});

test("Screenshot: Help", async ({ page }) => {
  await page.goto("/help");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-help.png`, fullPage: true });
});
