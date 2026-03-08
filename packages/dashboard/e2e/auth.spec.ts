import { test, expect } from "@playwright/test";

test.describe("Authenticatie — Happy flows", () => {
  test("Login pagina laadt correct", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Inloggen/);
    await expect(page.getByRole("heading", { name: "Sovereign Accessibility Auditor" })).toBeVisible();
    await expect(page.getByLabel("E-mailadres")).toBeVisible();
    await expect(page.getByLabel("Wachtwoord")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inloggen" })).toBeVisible();
  });

  test("Login formulier heeft correcte validatie-attributen", async ({ page }) => {
    await page.goto("/auth/login");
    const email = page.getByLabel("E-mailadres");
    const password = page.getByLabel("Wachtwoord");

    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("required", "");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
  });

  test("Onbeveiligde pagina redirect naar login", async ({ page }) => {
    await page.goto("/");
    // The VSCodeLayout checks auth and redirects to login
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    await expect(page.getByLabel("E-mailadres")).toBeVisible();
  });
});

test.describe("Authenticatie — Unhappy flows", () => {
  test("Leeg formulier indienen toont browser-validatie", async ({ page }) => {
    await page.goto("/auth/login");
    const button = page.getByRole("button", { name: "Inloggen" });
    await button.click();
    // HTML5 validation prevents submission — still on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("Onjuiste credentials tonen foutmelding", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("nietbestaand@test.nl");
    await page.getByLabel("Wachtwoord").fill("foutwachtwoord123");
    await page.getByRole("button", { name: "Inloggen" }).click();

    // Should show error (either from API or network error)
    const error = page.getByRole("alert");
    await expect(error).toBeVisible({ timeout: 10_000 });
  });

  test("SQL injection in login wordt afgewezen", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("admin@test.nl");
    await page.getByLabel("Wachtwoord").fill("' OR '1'='1");
    await page.getByRole("button", { name: "Inloggen" }).click();

    // Must stay on login page with error or validation
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
