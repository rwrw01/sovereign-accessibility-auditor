import { chromium, type Browser } from "playwright";
import type {
  L7ScanJobPayload,
  L7ScanJobResult,
  CognitiveCheck,
  CognitiveFinding,
  CognitiveCheckResult,
  ReadabilityScore,
} from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { checkReadability } from "./readability.js";
import { checkJargon } from "./jargon.js";
import { checkLlmAnalysis } from "./llm-analysis.js";

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

type CheckRunner = (page: import("playwright").Page, ollamaUrl?: string) => Promise<CognitiveCheckResult>;

const CHECK_RUNNERS: Record<CognitiveCheck, CheckRunner> = {
  "readability": checkReadability,
  "jargon": checkJargon,
  "llm-analysis": checkLlmAnalysis,
};

export async function runScan(payload: L7ScanJobPayload): Promise<L7ScanJobResult> {
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

    const checkResults: CognitiveCheckResult[] = [];
    const allFindings: CognitiveFinding[] = [];
    let readabilityScore: ReadabilityScore | undefined;

    // Run all checks on the same loaded page
    for (const check of payload.checks) {
      const runner = CHECK_RUNNERS[check];
      const result = await runner(page, payload.ollamaUrl);

      checkResults.push(result);
      allFindings.push(...result.findings);

      if (result.readabilityScore) {
        readabilityScore = result.readabilityScore;
      }
    }

    return {
      scanId: payload.scanId,
      findings: allFindings,
      checkResults,
      readabilityScore,
      totalDurationMs: Math.round(performance.now() - totalStart),
    };
  } finally {
    await page.close();
    await context.close();
  }
}
