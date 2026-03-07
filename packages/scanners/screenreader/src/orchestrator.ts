import { chromium, type Browser } from "playwright";
import type {
  L6ScanJobPayload,
  L6ScanJobResult,
  ScreenreaderCheck,
  ScreenreaderFinding,
  ScreenreaderCheckResult,
} from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { checkHeadingOrder } from "./heading-order.js";
import { checkLandmarkCoverage } from "./landmark-coverage.js";
import { checkAriaLive } from "./aria-live.js";
import { checkAltText } from "./alt-text.js";
import { checkFormLabels } from "./form-labels.js";

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

type CheckRunner = (page: import("playwright").Page) => Promise<ScreenreaderCheckResult>;

const CHECK_RUNNERS: Record<ScreenreaderCheck, CheckRunner> = {
  "heading-order": checkHeadingOrder,
  "landmark-coverage": checkLandmarkCoverage,
  "aria-live": checkAriaLive,
  "alt-text": checkAltText,
  "form-labels": checkFormLabels,
};

export async function runScan(payload: L6ScanJobPayload): Promise<L6ScanJobResult> {
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

    const checkResults: ScreenreaderCheckResult[] = [];
    const allFindings: ScreenreaderFinding[] = [];

    // Run all checks on the same loaded page (read-only DOM analysis)
    for (const check of payload.checks) {
      const runner = CHECK_RUNNERS[check];
      const result = await runner(page);

      checkResults.push(result);
      allFindings.push(...result.findings);
    }

    return {
      scanId: payload.scanId,
      findings: allFindings,
      checkResults,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
