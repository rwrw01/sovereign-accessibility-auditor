import type { Page } from "playwright";
import type { VisualScenario, VisualRegressionFinding, ScenarioResult } from "@saa/shared";
import { captureScreenshot, captureWithViewport } from "./capture.js";
import { compareScreenshots } from "./compare.js";

// ── Reflow (WCAG 1.4.10) ──
// At 320px width, no horizontal scrolling required.
// Also check for clipped/overlapping content.

async function runReflowScenario(page: Page, baselineWidth: number): Promise<ScenarioResult> {
  const start = performance.now();
  const findings: VisualRegressionFinding[] = [];

  try {
    const baselineScreenshot = await captureScreenshot(page);

    const comparisonScreenshot = await captureWithViewport(page, 320, 480);

    const { diffPercentage } = compareScreenshots(baselineScreenshot, comparisonScreenshot);

    const overflowIssues = await page.evaluate(() => {
      const issues: Array<{
        selector: string;
        scrollWidth: number;
        clientWidth: number;
        tagName: string;
        text: string;
      }> = [];

      const body = document.body;
      if (body.scrollWidth > body.clientWidth) {
        issues.push({
          selector: "body",
          scrollWidth: body.scrollWidth,
          clientWidth: body.clientWidth,
          tagName: "BODY",
          text: "",
        });
      }

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        // Skip visually-hidden screenreader patterns (not real overflow issues)
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2) continue;
        if (style.clip === "rect(0px, 0px, 0px, 0px)") continue;
        if (style.position === "absolute" && (
          style.width === "1px" || style.height === "1px"
        )) continue;

        if (
          style.overflowX === "hidden" &&
          htmlEl.scrollWidth > htmlEl.clientWidth &&
          htmlEl.clientWidth > 0
        ) {
          const tag = htmlEl.tagName.toLowerCase();
          const elId = htmlEl.id ? `#${htmlEl.id}` : "";
          const cls = htmlEl.className && typeof htmlEl.className === "string"
            ? "." + htmlEl.className.trim().split(/\s+/).join(".")
            : "";
          issues.push({
            selector: elId || (tag + cls),
            scrollWidth: htmlEl.scrollWidth,
            clientWidth: htmlEl.clientWidth,
            tagName: htmlEl.tagName,
            text: htmlEl.textContent?.slice(0, 80) ?? "",
          });
        }
      }

      return issues;
    });

    if (overflowIssues.length > 0) {
      for (const issue of overflowIssues) {
        findings.push({
          scenario: "reflow",
          type: "error",
          wcagCriteria: ["1.4.10"],
          wcagLevel: "AA",
          selector: issue.selector,
          context: `scrollWidth=${issue.scrollWidth}, clientWidth=${issue.clientWidth}`,
          message: issue.selector === "body"
            ? `Page requires horizontal scrolling at 320px width (scrollWidth: ${issue.scrollWidth}px > clientWidth: ${issue.clientWidth}px)`
            : `Element <${issue.tagName.toLowerCase()}> clips content with overflow:hidden at 320px width (scrollWidth: ${issue.scrollWidth}px > clientWidth: ${issue.clientWidth}px)`,
          impact: issue.selector === "body" ? "serious" : "moderate",
          diffPercentage,
        });
      }
    }

    const overlappingElements = await detectOverlappingElements(page);
    for (const overlap of overlappingElements) {
      findings.push({
        scenario: "reflow",
        type: "warning",
        wcagCriteria: ["1.4.10"],
        wcagLevel: "AA",
        selector: overlap.selector,
        context: overlap.context,
        message: `Elements overlap at 320px viewport: ${overlap.description}`,
        impact: "moderate",
        diffPercentage,
      });
    }

    // Restore original viewport
    await page.setViewportSize({ width: baselineWidth, height: 1024 });
    await page.waitForTimeout(300);

    return {
      scenario: "reflow",
      findings,
      diffPercentage,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      scenario: "reflow",
      findings,
      diffPercentage: null,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Zoom 200% (WCAG 1.4.4) ──
// Simulated by halving viewport width + deviceScaleFactor: 2.
// Content must remain usable without horizontal scrolling.

async function runZoomScenario(page: Page, originalWidth: number, originalHeight: number): Promise<ScenarioResult> {
  const start = performance.now();
  const findings: VisualRegressionFinding[] = [];

  try {
    const baselineScreenshot = await captureScreenshot(page);

    // Simulate 200% zoom: halve the viewport dimensions
    const zoomedWidth = Math.round(originalWidth / 2);
    const zoomedHeight = Math.round(originalHeight / 2);

    const comparisonScreenshot = await captureWithViewport(page, zoomedWidth, zoomedHeight);

    const { diffPercentage } = compareScreenshots(baselineScreenshot, comparisonScreenshot);

    // Check for horizontal overflow at zoomed viewport
    const overflowIssues = await page.evaluate(() => {
      const issues: Array<{ selector: string; detail: string }> = [];

      if (document.body.scrollWidth > document.body.clientWidth) {
        issues.push({
          selector: "body",
          detail: `scrollWidth=${document.body.scrollWidth}, clientWidth=${document.body.clientWidth}`,
        });
      }

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        // Skip visually-hidden screenreader patterns
        if (rect.width <= 2 || rect.height <= 2) continue;
        if (style.clip === "rect(0px, 0px, 0px, 0px)") continue;
        if (style.position === "absolute" && (
          style.width === "1px" || style.height === "1px"
        )) continue;

        // Check for content clipped by overflow:hidden
        if (
          style.overflowX === "hidden" &&
          htmlEl.scrollWidth > htmlEl.clientWidth + 2 &&
          rect.width > 0
        ) {
          const tag = htmlEl.tagName.toLowerCase();
          const id = htmlEl.id ? `#${htmlEl.id}` : "";
          issues.push({
            selector: tag + id,
            detail: `overflow:hidden clips content (scrollWidth=${htmlEl.scrollWidth}, clientWidth=${htmlEl.clientWidth})`,
          });
        }
      }

      return issues;
    });

    for (const issue of overflowIssues) {
      findings.push({
        scenario: "zoom-200",
        type: "error",
        wcagCriteria: ["1.4.4"],
        wcagLevel: "AA",
        selector: issue.selector,
        context: issue.detail,
        message: issue.selector === "body"
          ? `Page requires horizontal scrolling at 200% zoom (${issue.detail})`
          : `Element clips content at 200% zoom: ${issue.detail}`,
        impact: "serious",
        diffPercentage,
      });
    }

    // Restore original viewport
    await page.setViewportSize({ width: originalWidth, height: originalHeight });
    await page.waitForTimeout(300);

    return {
      scenario: "zoom-200",
      findings,
      diffPercentage,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      scenario: "zoom-200",
      findings,
      diffPercentage: null,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Text Spacing (WCAG 1.4.12) ──
// Inject CSS with WCAG-specified spacing values.
// No content should be clipped or lost.

const TEXT_SPACING_CSS = `
  * {
    line-height: 1.5em !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p, li, dd, dt, blockquote, th, td, caption, figcaption, label, legend {
    margin-bottom: 2em !important;
  }
`;

async function runTextSpacingScenario(page: Page): Promise<ScenarioResult> {
  const start = performance.now();
  const findings: VisualRegressionFinding[] = [];

  try {
    const baselineScreenshot = await captureScreenshot(page);

    // Capture element dimensions before CSS injection
    const beforeHeights = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, a, span, button, input, label, td, th",
      );
      const heights: Record<string, { height: number; scrollHeight: number; text: string }> = {};

      let idx = 0;
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
          const tag = htmlEl.tagName.toLowerCase();
          const id = htmlEl.id ? `#${htmlEl.id}` : "";
          const key = `${tag}${id}[${idx}]`;
          heights[key] = {
            height: rect.height,
            scrollHeight: htmlEl.scrollHeight,
            text: htmlEl.textContent?.slice(0, 60) ?? "",
          };
          idx++;
        }
      }
      return heights;
    });

    // Inject text-spacing CSS
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await page.waitForTimeout(500);

    const comparisonScreenshot = await captureScreenshot(page);
    const { diffPercentage } = compareScreenshots(baselineScreenshot, comparisonScreenshot);

    // Check for clipped content after text-spacing
    const clippedElements = await page.evaluate(() => {
      const issues: Array<{
        selector: string;
        tagName: string;
        overflow: string;
        scrollHeight: number;
        clientHeight: number;
        text: string;
      }> = [];

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        // Skip invisible and visually-hidden screenreader elements
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width <= 2 || rect.height <= 2) continue;
        if (style.clip === "rect(0px, 0px, 0px, 0px)") continue;
        if (style.position === "absolute" && (
          style.width === "1px" || style.height === "1px"
        )) continue;

        const overflowY = style.overflowY;
        const overflowX = style.overflowX;

        // Content clipped vertically
        if (
          (overflowY === "hidden" || overflowX === "hidden") &&
          (htmlEl.scrollHeight > htmlEl.clientHeight + 2 ||
            htmlEl.scrollWidth > htmlEl.clientWidth + 2)
        ) {
          const tag = htmlEl.tagName.toLowerCase();
          const id = htmlEl.id ? `#${htmlEl.id}` : "";
          issues.push({
            selector: tag + id,
            tagName: tag,
            overflow: `overflow-x:${overflowX}, overflow-y:${overflowY}`,
            scrollHeight: htmlEl.scrollHeight,
            clientHeight: htmlEl.clientHeight,
            text: htmlEl.textContent?.slice(0, 60) ?? "",
          });
        }
      }

      return issues;
    });

    for (const clipped of clippedElements) {
      // Only flag if this element wasn't already clipping before text-spacing
      const beforeKey = Object.keys(beforeHeights).find((k) =>
        k.startsWith(clipped.tagName),
      );
      const wasAlreadyClipping =
        beforeKey &&
        beforeHeights[beforeKey] &&
        beforeHeights[beforeKey].scrollHeight > beforeHeights[beforeKey].height + 2;

      if (!wasAlreadyClipping) {
        findings.push({
          scenario: "text-spacing",
          type: "error",
          wcagCriteria: ["1.4.12"],
          wcagLevel: "AA",
          selector: clipped.selector,
          context: `${clipped.overflow}; scrollHeight=${clipped.scrollHeight}, clientHeight=${clipped.clientHeight}; text="${clipped.text}"`,
          message: `Content clipped after applying WCAG text-spacing overrides on <${clipped.tagName}> (${clipped.overflow})`,
          impact: "serious",
          diffPercentage,
        });
      }
    }

    return {
      scenario: "text-spacing",
      findings,
      diffPercentage,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      scenario: "text-spacing",
      findings,
      diffPercentage: null,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Overlap Detection (shared helper) ──

interface OverlapResult {
  selector: string;
  context: string;
  description: string;
}

async function detectOverlappingElements(page: Page): Promise<OverlapResult[]> {
  return page.evaluate(() => {
    const results: Array<{
      selector: string;
      context: string;
      description: string;
    }> = [];

    const interactiveSelectors = "a, button, input, select, textarea, [role='button'], [role='link']";
    const interactive = document.querySelectorAll(interactiveSelectors);
    const rects: Array<{ el: Element; rect: DOMRect; selector: string }> = [];

    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent?.slice(0, 30) ?? "";
        rects.push({ el, rect, selector: `${tag}[text="${text}"]` });
      }
    }

    // Check pairwise overlaps (limited to first 100 elements for performance)
    const limit = Math.min(rects.length, 100);
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) {
        const a = rects[i]!;
        const b = rects[j]!;

        const overlapX = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const overlapY = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        const overlapArea = overlapX * overlapY;

        if (overlapArea > 0) {
          const smallerArea = Math.min(
            a.rect.width * a.rect.height,
            b.rect.width * b.rect.height,
          );
          const overlapPercentage = smallerArea > 0 ? (overlapArea / smallerArea) * 100 : 0;

          // Only report significant overlaps (>10% of smaller element)
          if (overlapPercentage > 10) {
            results.push({
              selector: a.selector,
              context: `Overlaps with ${b.selector} (${Math.round(overlapPercentage)}% overlap)`,
              description: `"${a.selector}" and "${b.selector}" overlap by ${Math.round(overlapPercentage)}%`,
            });
          }
        }
      }
    }

    return results;
  });
}

// ── Scenario Runner Map ──

type ScenarioRunner = (
  page: Page,
  originalWidth: number,
  originalHeight: number,
) => Promise<ScenarioResult>;

const SCENARIO_RUNNERS: Record<VisualScenario, ScenarioRunner> = {
  reflow: (page, w, _h) => runReflowScenario(page, w),
  "zoom-200": (page, w, h) => runZoomScenario(page, w, h),
  "text-spacing": (page, _w, _h) => runTextSpacingScenario(page),
};

export async function runScenario(
  page: Page,
  scenario: VisualScenario,
  originalWidth: number,
  originalHeight: number,
): Promise<ScenarioResult> {
  const runner = SCENARIO_RUNNERS[scenario];
  return runner(page, originalWidth, originalHeight);
}
