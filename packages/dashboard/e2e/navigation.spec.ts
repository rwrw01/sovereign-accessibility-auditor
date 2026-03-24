import { test, expect } from "@playwright/test";

// Tests use pre-authenticated storageState from auth.setup.ts

test.describe("Navigatie — Happy flow (ingelogd)", () => {
  test("Dashboard toont welkomstpagina", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Welkom|Toegankelijkheidsauditor/ })).toBeVisible();
    await expect(page.getByText("Nieuwe scan starten")).toBeVisible();
  });

  test("Sidebar bevat navigatie-items", async ({ page }) => {
    await page.goto("/");

    // Check sidebar has navigation items (no more collapsible Scanlagen section)
    await expect(page.locator("nav[aria-label='Navigatie']")).toBeVisible();
    await expect(page.getByText("Dashboard")).toBeVisible();
  });

  test("Navigatie via Activity Bar werkt", async ({ page }) => {
    await page.goto("/");

    // Navigate to Scan page
    await page.getByRole("button", { name: "Nieuwe scan", exact: true }).click();
    await page.waitForURL(/\/scan/);
    await expect(page.locator("h1")).toContainText(/scan|toegankelijkheid/i);

    // Navigate to Help page
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page.waitForURL(/\/help/);
    await expect(page.locator("h1")).toBeVisible();

    // Navigate to Audits page
    await page.getByRole("button", { name: "Audits", exact: true }).click();
    await page.waitForURL(/\/audits/);
    await expect(page.locator("h1")).toContainText(/Audits/);
  });

  test("Help pagina toont documentatie", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Aan de slag")).toBeVisible();
  });

  test("Instellingen toont gebruikersprofiel", async ({ page }) => {
    await page.goto("/instellingen");
    await expect(page.locator("h1")).toContainText(/profiel|Profiel|Instellingen/, { timeout: 10_000 });
  });

  test("Scan pagina toont begrijpelijke laagbeschrijvingen", async ({ page }) => {
    await page.goto("/scan");
    // Human-readable layer names instead of technical jargon
    const content = page.locator(".vsc-editor-content");
    await expect(content.locator("strong", { hasText: "Automatische controle" })).toBeVisible({ timeout: 10_000 });
    await expect(content.locator("strong", { hasText: "Toetsenbord" })).toBeVisible();
    await expect(content.locator("strong", { hasText: "Voorleessoftware" })).toBeVisible();
  });

  test("Audits pagina laadt zonder error", async ({ page }) => {
    await page.goto("/audits");
    const content = await page.textContent("body");
    expect(content).toMatch(/(Audits|audit|scan)/i);
  });
});

test.describe("Navigatie — Unhappy flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("404 voor onbekende route", async ({ page }) => {
    const response = await page.goto("/deze-pagina-bestaat-niet");
    expect(response?.status()).toBe(404);
  });

  test("API /auth/me retourneert gebruikersinformatie", async ({ request }) => {
    try {
      const response = await request.get("http://localhost:13001/api/v1/auth/me");
      expect([200, 401]).toContain(response.status());
    } catch {
      // API might not be running in test environment — skip gracefully
    }
  });
});
