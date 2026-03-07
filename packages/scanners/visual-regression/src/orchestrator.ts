import { chromium, type Browser } from "playwright";
import type { L2ScanJobPayload, L2ScanJobResult, VisualRegressionFinding, ScenarioResult } from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { runScenario } from "./scenarios.js";

let sharedBrowser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (sharedBrowser?.isConnected()) return sharedBrowser;

  sharedBrowser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-translate",
      "--no-first-run",
    ],
  });

  return sharedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

export async function runScan(payload: L2ScanJobPayload): Promise<L2ScanJobResult> {
  const totalStart = performance.now();

  validateScanUrl(payload.url);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: payload.viewport.w, height: payload.viewport.h },
    userAgent: "SAA-Scanner/0.1 (WCAG 2.2 AA audit; +https://github.com/rwrw01/sovereign-accessibility-auditor)",
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
  });

  const page = await context.newPage();

  try {
    await page.goto(payload.url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    await page.waitForTimeout(1_000);

    const scenarioResults: ScenarioResult[] = [];
    const allFindings: VisualRegressionFinding[] = [];

    // Run scenarios sequentially (each modifies the page state)
    for (const scenario of payload.scenarios) {
      // Navigate fresh for each scenario to avoid CSS leaks between scenarios
      if (scenarioResults.length > 0) {
        await page.goto(payload.url, {
          waitUntil: "networkidle",
          timeout: 30_000,
        });
        await page.waitForTimeout(500);
      }

      const result = await runScenario(
        page,
        scenario,
        payload.viewport.w,
        payload.viewport.h,
      );

      scenarioResults.push(result);
      allFindings.push(...result.findings);
    }

    return {
      scanId: payload.scanId,
      findings: allFindings,
      scenarioResults,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
