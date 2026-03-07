import { chromium, type Browser, type Page } from "playwright";
import type { EngineName, EngineResult, ScanJobPayload, ScanJobResult } from "@saa/shared";
import { runAxe } from "./engines/axe.js";
import { runIbm } from "./engines/ibm.js";
import { deduplicateFindings } from "./dedup.js";
import { validateScanUrl } from "./url-validator.js";

const ENGINE_RUNNERS: Record<EngineName, (page: Page) => Promise<EngineResult>> = {
  "axe-core": runAxe,
  "ibm-aat": runIbm,
};

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

export async function runScan(payload: ScanJobPayload): Promise<ScanJobResult> {
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

    const engineResults: EngineResult[] = [];

    for (const engineName of payload.engines) {
      const runner = ENGINE_RUNNERS[engineName];
      if (!runner) throw new Error(`Unknown engine: ${engineName}`);
      const result = await runner(page);
      engineResults.push(result);
    }

    const allFindings = engineResults.flatMap((r) => r.findings);
    const deduplicated = deduplicateFindings(allFindings);

    return {
      scanId: payload.scanId,
      findings: deduplicated,
      engineResults,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
