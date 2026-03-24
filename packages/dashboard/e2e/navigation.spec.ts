import { test, expect } from "@playwright/test";

// Tests use pre-authenticated storageState from auth.setup.ts

test.describe("Navigatie — Happy flow (ingelogd)", () => {
  test("Dashboard toont welkomstpagina", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sovereign Accessibility Auditor" })).toBeVisible();
    await expect(page.getByText("Beginnen")).toBeVisible();
    await expect(page.getByText("Snelle scan")).toBeVisible();
  });

  test("Sidebar secties klappen in en uit", async ({ page }) => {
    await page.goto("/");

    const scanlagenButton = page.getByRole("button", { name: /Scanlagen/ });
    await expect(scanlagenButton).toBeVisible();

    // Collapse
    await scanlagenButton.click();
    await expect(page.getByText("L1 — Multi-engine")).not.toBeVisible();

    // Expand
    await scanlagenButton.click();
    await expect(page.getByText("L1 — Multi-engine")).toBeVisible();
  });

  test("Navigatie via Activity Bar werkt", async ({ page }) => {
    await page.goto("/");

    // Navigate to Scan page (exact match to avoid "Nieuwe scan starten")
    await page.getByRole("button", { name: "Nieuwe scan", exact: true }).click();
    await page.waitForURL(/\/scan/);
    await expect(page.locator("h1")).toContainText("Nieuwe scan");

    // Navigate to Help page
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page.waitForURL(/\/help/);
    await expect(page.getByRole("heading", { name: "Help & Documentatie" })).toBeVisible();

    // Navigate to Audits page
    await page.getByRole("button", { name: "Audits", exact: true }).click();
    await page.waitForURL(/\/audits/);
    await expect(page.locator("h1")).toContainText("Audits");
  });

  test("Help pagina toont documentatie", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "Aan de slag" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "De 7 scanlagen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Veelgestelde vragen" })).toBeVisible();
  });

  test("Instellingen toont gebruikersprofiel", async ({ page }) => {
    await page.goto("/instellingen");
    await expect(page.getByText("Gebruikersprofiel")).toBeVisible();
    // With DISABLE_AUTH, /auth/me returns dummy user (local@dev)
    await expect(page.getByLabel("E-mailadres")).toHaveValue("local@dev", { timeout: 10_000 });
  });

  test("Scan pagina toont checkbox-selectie voor lagen", async ({ page }) => {
    await page.goto("/scan");
    await expect(page.locator("legend")).toContainText("Scanlagen");
    await expect(page.getByText("Selecteer alle")).toBeVisible();

    await expect(page.getByText("Multi-engine (axe + IBM)")).toBeVisible();
    await expect(page.getByText("Screenreader simulatie")).toBeVisible();
  });

  test("Audits pagina laadt zonder error", async ({ page }) => {
    await page.goto("/audits");
    const content = await page.textContent("body");
    expect(content).toMatch(/(Audits|Nog geen audits)/);
  });
});

test.describe("Navigatie — Unhappy flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("404 voor onbekende route", async ({ page }) => {
    const response = await page.goto("/deze-pagina-bestaat-niet");
    expect(response?.status()).toBe(404);
  });

  test("API /auth/me retourneert gebruikersinformatie", async ({ request }) => {
    // With DISABLE_AUTH=true, /auth/me returns dummy user (200)
    // With auth enabled, without cookies it returns 401
    const response = await request.get("http://localhost:13001/api/v1/auth/me");
    if (response.status() !== 0) {
      expect([200, 401]).toContain(response.status());
    }
  });
});
