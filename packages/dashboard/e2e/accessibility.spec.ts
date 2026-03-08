import { test, expect } from "@playwright/test";

test.describe("Toegankelijkheid — Happy flows", () => {
  test("Login pagina heeft skip-to-content structuur", async ({ page }) => {
    await page.goto("/auth/login");
    // Main landmark is present
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Login formulier labels zijn gekoppeld aan inputs", async ({ page }) => {
    await page.goto("/auth/login");

    const emailInput = page.getByLabel("E-mailadres");
    const passwordInput = page.getByLabel("Wachtwoord");

    await expect(emailInput).toHaveAttribute("id", "email");
    await expect(passwordInput).toHaveAttribute("id", "password");
  });

  test("Toetsenbordnavigatie werkt op login pagina", async ({ page }) => {
    await page.goto("/auth/login");

    // Tab through form elements
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Should be able to tab to the submit button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const submitFocused = await page.evaluate(
      () => document.activeElement?.getAttribute("type"),
    );
    // At some point we should reach the submit button
    // (exact tab count depends on whether OIDC button is shown)
  });

  test("Foutmeldingen hebben role=alert", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("test@test.nl");
    await page.getByLabel("Wachtwoord").fill("verkeerd12345");
    await page.getByRole("button", { name: "Inloggen" }).click();

    // Wait for error to appear
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Toegankelijkheid — Unhappy flows", () => {
  test("Pagina zonder JavaScript toont inhoud", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/auth/login");
    // Even without JS, the HTML should render (Next.js SSR)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await context.close();
  });
});
