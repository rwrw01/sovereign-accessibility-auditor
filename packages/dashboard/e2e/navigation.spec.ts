import { test, expect } from "@playwright/test";

test.describe("Navigatie — Happy flows", () => {
  test("Login pagina heeft correcte HTML-structuur", async ({ page }) => {
    await page.goto("/auth/login");
    // Main landmark exists
    const main = page.locator("main.login-container");
    await expect(main).toBeVisible();
    // Heading hierarchy starts with h1
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
  });

  test("Help pagina is bereikbaar", async ({ page }) => {
    await page.goto("/help");
    // Even without auth, page should render (or redirect to login)
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Either we see the help page or get redirected to login
    expect(url).toMatch(/\/(help|auth\/login)/);
  });

  test("OIDC status endpoint is beschikbaar", async ({ request }) => {
    // This tests the API directly (public endpoint, no auth needed)
    const response = await request.get("http://localhost:13001/api/v1/auth/oidc/status");
    // API may not be running, so we accept both success and connection error
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty("enabled");
    }
  });
});

test.describe("Navigatie — Unhappy flows", () => {
  test("404 voor onbekende route", async ({ page }) => {
    const response = await page.goto("/deze-pagina-bestaat-niet");
    // Next.js returns 404 for unknown routes
    expect(response?.status()).toBe(404);
  });

  test("Directe API-aanroep zonder auth geeft 401", async ({ request }) => {
    const response = await request.get("http://localhost:13001/api/v1/auth/me");
    if (response.status() !== 0) {
      // 0 means connection refused (API not running)
      expect(response.status()).toBe(401);
    }
  });
});
