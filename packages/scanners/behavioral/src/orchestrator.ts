import { chromium, type Browser } from "playwright";
import type { L3ScanJobPayload, L3ScanJobResult, BehavioralFinding, BehavioralTestResult, BehavioralTest } from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { runKeyboardNavTest } from "./keyboard.js";
import { runFocusTrapTest } from "./focus-trap.js";
import { runFocusVisibleTest } from "./focus-visible.js";
import { runHoverFocusTest } from "./hover-focus.js";
import { runSkipLinkTest } from "./skip-link.js";

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

type TestRunner = (page: import("playwright").Page) => Promise<BehavioralTestResult>;

const TEST_RUNNERS: Record<BehavioralTest, TestRunner> = {
  "keyboard-nav": runKeyboardNavTest,
  "focus-trap": runFocusTrapTest,
  "focus-visible": runFocusVisibleTest,
  "hover-focus": runHoverFocusTest,
  "skip-link": runSkipLinkTest,
};

export async function runScan(payload: L3ScanJobPayload): Promise<L3ScanJobResult> {
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
    const testResults: BehavioralTestResult[] = [];
    const allFindings: BehavioralFinding[] = [];

    // Run tests sequentially (each modifies focus/page state)
    for (const test of payload.tests) {
      // Navigate fresh for each test to avoid state leaks
      await page.goto(payload.url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);

      const runner = TEST_RUNNERS[test];
      const result = await runner(page);

      testResults.push(result);
      allFindings.push(...result.findings);
    }

    return {
      scanId: payload.scanId,
      findings: allFindings,
      testResults,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
