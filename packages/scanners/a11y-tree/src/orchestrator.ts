import { chromium, type Browser } from "playwright";
import type { L4ScanJobPayload, L4ScanJobResult, A11yTreeDiffFinding, A11yTreeDiffResult } from "@saa/shared";
import { validateScanUrl } from "./url-validator.js";
import { captureInterestingA11yTree, countNodes } from "./snapshot.js";
import { diffA11yTrees } from "./diff.js";

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

export async function runScan(payload: L4ScanJobPayload): Promise<L4ScanJobResult> {
  const totalStart = performance.now();

  validateScanUrl(payload.url);

  const browser = await getBrowser();
  const allFindings: A11yTreeDiffFinding[] = [];
  const comparisons: A11yTreeDiffResult[] = [];

  // 1. Desktop vs Mobile comparison
  const desktopMobileResult = await compareViewports(
    browser,
    payload.url,
    payload.desktopViewport,
    payload.mobileViewport,
    "desktop",
    "mobile",
  );
  comparisons.push(desktopMobileResult);
  allFindings.push(...desktopMobileResult.findings);

  // 2. Portrait vs Landscape comparison (mobile)
  const portraitViewport = { ...payload.mobileViewport, name: "portrait" };
  const landscapeViewport = {
    name: "landscape",
    w: payload.mobileViewport.h,
    h: payload.mobileViewport.w,
  };
  const orientationResult = await compareViewports(
    browser,
    payload.url,
    portraitViewport,
    landscapeViewport,
    "portrait",
    "landscape",
  );
  comparisons.push(orientationResult);

  // Mark orientation-specific findings
  for (const finding of orientationResult.findings) {
    finding.diffType = "orientation-issue";
    finding.wcagCriteria = [...new Set([...finding.wcagCriteria, "1.3.4"])];
  }
  allFindings.push(...orientationResult.findings);

  return {
    scanId: payload.scanId,
    findings: allFindings,
    comparisons,
    totalDurationMs: Math.round(performance.now() - totalStart),
  };
}

async function compareViewports(
  browser: Browser,
  url: string,
  viewportA: { name: string; w: number; h: number },
  viewportB: { name: string; w: number; h: number },
  nameA: string,
  nameB: string,
): Promise<A11yTreeDiffResult> {
  const start = performance.now();

  try {
    // Capture tree A
    const contextA = await browser.newContext({
      viewport: { width: viewportA.w, height: viewportA.h },
      userAgent: "SAA-Scanner/0.1 (WCAG 2.2 AA audit; +https://github.com/rwrw01/sovereign-accessibility-auditor)",
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
    });
    const pageA = await contextA.newPage();
    await pageA.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await pageA.waitForTimeout(1_000);
    const treeA = await captureInterestingA11yTree(pageA);
    await pageA.close();
    await contextA.close();

    // Capture tree B
    const contextB = await browser.newContext({
      viewport: { width: viewportB.w, height: viewportB.h },
      userAgent: "SAA-Scanner/0.1 (WCAG 2.2 AA audit; +https://github.com/rwrw01/sovereign-accessibility-auditor)",
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
    });
    const pageB = await contextB.newPage();
    await pageB.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await pageB.waitForTimeout(1_000);
    const treeB = await captureInterestingA11yTree(pageB);
    await pageB.close();
    await contextB.close();

    // Diff
    const findings = diffA11yTrees(treeA, treeB, nameA, nameB);

    return {
      comparison: `${nameA} vs ${nameB}`,
      findings,
      desktopNodeCount: countNodes(treeA),
      mobileNodeCount: countNodes(treeB),
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      comparison: `${nameA} vs ${nameB}`,
      findings: [],
      desktopNodeCount: 0,
      mobileNodeCount: 0,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
