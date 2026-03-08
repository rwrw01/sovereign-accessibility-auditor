import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("E-mailadres").fill("admin@saa.local");
  await page.getByLabel("Wachtwoord").fill("Admin2026!Secure");
  await page.getByRole("button", { name: "Inloggen" }).click();

  await page.waitForURL("/", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Sovereign Accessibility Auditor" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
