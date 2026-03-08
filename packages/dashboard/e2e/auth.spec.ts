import { test, expect } from "@playwright/test";

// Auth tests need fresh context (no pre-authenticated cookies)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authenticatie — Happy flow", () => {
  test("Login pagina laadt correct", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Inloggen/);
    await expect(page.getByRole("heading", { name: "Sovereign Accessibility Auditor" })).toBeVisible();
    await expect(page.getByLabel("E-mailadres")).toBeVisible();
    await expect(page.getByLabel("Wachtwoord")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inloggen" })).toBeVisible();
  });

  test("Login formulier heeft correcte HTML-attributen", async ({ page }) => {
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
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    await expect(page.getByLabel("E-mailadres")).toBeVisible();
  });

  test("Succesvolle login leidt naar dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("admin@saa.local");
    await page.getByLabel("Wachtwoord").fill("Admin2026!Secure");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await page.waitForURL("/", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sovereign Accessibility Auditor" })).toBeVisible();
  });
});

test.describe("Authenticatie — Unhappy flow", () => {
  test("Leeg formulier indienen wordt geblokkeerd", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("Onjuiste credentials tonen foutmelding", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("nietbestaand@test.nl");
    await page.getByLabel("Wachtwoord").fill("foutwachtwoord123");
    await page.getByRole("button", { name: "Inloggen" }).click();

    const error = page.getByRole("alert");
    await expect(error).toBeVisible({ timeout: 10_000 });
  });

  test("SQL injection in login wordt afgewezen", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("E-mailadres").fill("admin@test.nl");
    await page.getByLabel("Wachtwoord").fill("' OR '1'='1");
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
