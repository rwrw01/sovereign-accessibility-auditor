import { chromium, type Browser } from "playwright";
import type { L5ScanJobPayload, L5ScanJobResult } from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { measureTouchTargets } from "./measure.js";

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

export async function runScan(payload: L5ScanJobPayload): Promise<L5ScanJobResult> {
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

    const { findings, totalElements, failingElements } = await measureTouchTargets(
      page,
      payload.minTargetSize,
    );

    return {
      scanId: payload.scanId,
      findings,
      totalElements,
      failingElements,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
