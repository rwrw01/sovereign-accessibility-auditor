import { test, expect } from "@playwright/test";

test.describe("Toegankelijkheid — Happy flow", () => {
  test("Login pagina heeft main landmark", async ({ page }) => {
    await page.goto("/auth/login");
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Login formulier labels zijn gekoppeld aan inputs", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByLabel("E-mailadres")).toHaveAttribute("id", "email");
    await expect(page.getByLabel("Wachtwoord")).toHaveAttribute("id", "password");
  });

  test("Dashboard heeft correcte landmark-structuur", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[role='banner']")).toBeVisible();
    await expect(page.locator("nav[aria-label='Hoofdnavigatie']")).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("footer[aria-label='Statusbalk']")).toBeVisible();
  });

  test("Sidebar navigatie heeft aria-label", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav[aria-label='Navigatie']")).toBeVisible();
  });

  test("Foutmeldingen hebben role=alert", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("test@test.nl");
    await page.getByLabel("Wachtwoord").fill("verkeerd12345");
    await page.getByRole("button", { name: "Inloggen" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10_000 });
  });

  test("Toetsenbordnavigatie: Tab door login formulier", async ({ page }) => {
    await page.goto("/auth/login");
    // First tab might hit skip link, second should hit an input
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["INPUT", "BUTTON", "A"]).toContain(focused);
  });
});

test.describe("Toegankelijkheid — Unhappy flow", () => {
  test("Pagina zonder JavaScript rendert HTML", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/auth/login");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await context.close();
  });
});
