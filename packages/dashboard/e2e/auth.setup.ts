import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // When DISABLE_AUTH is true, no login needed — just verify the app loads
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welkom|Toegankelijkheidsauditor/ }),
  ).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
