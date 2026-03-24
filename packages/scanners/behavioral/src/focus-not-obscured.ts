import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Focus Not Obscured Minimum (WCAG 2.4.11, AA) ──
// When a user interface component receives keyboard focus, the component is
// not entirely hidden due to author-created content. Partially obscured is
// allowed at AA; fully obscured is a failure. We also report partial as warning.

export async function runFocusNotObscuredTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [] as BehavioralFinding[];

  try {
    // Collect sticky/fixed elements once — these are the typical obscuring culprits
    const stickyFixedElements = await page.evaluate(() => {
      type StickyEl = {
        selector: string;
        position: string;
        top: number;
        bottom: number;
        left: number;
        right: number;
        zIndex: number;
        height: number;
      };

      const results: StickyEl[] = [];
      const all = document.querySelectorAll("*");

      for (const el of all) {
        const style = window.getComputedStyle(el as HTMLElement);
        if (style.position !== "fixed" && style.position !== "sticky") continue;

        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const htmlEl = el as HTMLElement;
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const tag = htmlEl.tagName.toLowerCase();
        const cls =
          htmlEl.className && typeof htmlEl.className === "string"
            ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";

        results.push({
          selector: id || tag + cls,
          position: style.position,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          zIndex: parseInt(style.zIndex, 10) || 0,
          height: rect.height,
        });
      }

      return results;
    });

    // Reset focus and start tabbing
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    });

    const maxTabs = 100;
    const testedSelectors = new Set<string>();

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");

      const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;

        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();

        // Skip zero-size elements
        if (rect.width === 0 || rect.height === 0) return null;

        const style = window.getComputedStyle(htmlEl);
        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls =
          htmlEl.className && typeof htmlEl.className === "string"
            ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";

        // Center point of the focused element
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Check whether center point is in the viewport
        const inViewport =
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0;

        // elementFromPoint at center — if not the element or its descendant, obscured
        const topEl = document.elementFromPoint(centerX, centerY);
        const topSelector = topEl
          ? (() => {
              const tEl = topEl as HTMLElement;
              const tId = tEl.id ? `#${tEl.id}` : "";
              const tTag = tEl.tagName.toLowerCase();
              const tCls =
                tEl.className && typeof tEl.className === "string"
                  ? "." + tEl.className.trim().split(/\s+/).slice(0, 2).join(".")
                  : "";
              return tId || tTag + tCls;
            })()
          : "";

        const isCoveredAtCenter =
          topEl !== null &&
          topEl !== htmlEl &&
          !htmlEl.contains(topEl);

        return {
          selector: id || tag + cls,
          tagName: tag,
          text: (htmlEl.textContent ?? "").trim().slice(0, 60),
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
          inViewport,
          isCoveredAtCenter,
          topElementSelector: topSelector,
          zIndex: parseInt(style.zIndex, 10) || 0,
        };
      });

      if (!focusInfo) break;

      // Cycle detection
      if (testedSelectors.has(focusInfo.selector)) continue;
      testedSelectors.add(focusInfo.selector);

      // Check 1: element entirely outside viewport (fully hidden by scroll)
      if (!focusInfo.inViewport) {
        findings.push({
          test: "focus-not-obscured",
          type: "error",
          wcagCriteria: ["2.4.11"],
          wcagLevel: "AA",
          selector: focusInfo.selector,
          context: `rect: top=${Math.round(focusInfo.rect.top)} bottom=${Math.round(focusInfo.rect.bottom)}, viewport: ${await page.evaluate(() => window.innerWidth)}x${await page.evaluate(() => window.innerHeight)}`,
          message:
            `Focused element <${focusInfo.tagName}> is completely outside the visible viewport when it receives focus. ` +
            `Text: "${focusInfo.text}"`,
          impact: "serious",
        });
        continue;
      }

      // Check 2: sticky/fixed element overlaps the focused element's rect
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      for (const sticky of stickyFixedElements) {
        // Only consider sticky/fixed elements that are above focused element in z-order
        if (sticky.zIndex <= focusInfo.zIndex && sticky.zIndex !== 0) continue;

        // Compute overlap rectangle
        const overlapTop = Math.max(sticky.top, focusInfo.rect.top);
        const overlapBottom = Math.min(sticky.bottom, focusInfo.rect.bottom);
        const overlapLeft = Math.max(sticky.left, focusInfo.rect.left);
        const overlapRight = Math.min(sticky.right, focusInfo.rect.right);

        const overlapWidth = overlapRight - overlapLeft;
        const overlapHeight = overlapBottom - overlapTop;

        if (overlapWidth <= 0 || overlapHeight <= 0) continue;

        const focusedArea = focusInfo.rect.width * focusInfo.rect.height;
        const overlapArea = overlapWidth * overlapHeight;
        const coveragePercent = Math.round((overlapArea / focusedArea) * 100);

        if (coveragePercent >= 100) {
          findings.push({
            test: "focus-not-obscured",
            type: "error",
            wcagCriteria: ["2.4.11"],
            wcagLevel: "AA",
            selector: focusInfo.selector,
            context:
              `fully obscured by ${sticky.position} element "${sticky.selector}"; ` +
              `coverage: ${coveragePercent}%; viewport: ${viewportWidth}x${viewportHeight}`,
            message:
              `Focused element <${focusInfo.tagName}> is entirely hidden by a ${sticky.position} element ` +
              `("${sticky.selector}") when it receives keyboard focus. Text: "${focusInfo.text}"`,
            impact: "serious",
          });
        } else if (coveragePercent >= 50) {
          findings.push({
            test: "focus-not-obscured",
            type: "warning",
            wcagCriteria: ["2.4.11"],
            wcagLevel: "AA",
            selector: focusInfo.selector,
            context:
              `partially obscured by ${sticky.position} element "${sticky.selector}"; ` +
              `coverage: ${coveragePercent}%`,
            message:
              `Focused element <${focusInfo.tagName}> is partially (${coveragePercent}%) hidden by a ` +
              `${sticky.position} element when focused. Text: "${focusInfo.text}"`,
            impact: "moderate",
          });
        }
      }

      // Check 3: elementFromPoint at center is not the focused element
      // (catches modal overlays, z-index issues not covered by sticky/fixed check)
      if (focusInfo.isCoveredAtCenter) {
        // Avoid duplicate with sticky check above
        const alreadyReported = findings.some(
          (f) => f.selector === focusInfo.selector && f.type === "error",
        );
        if (!alreadyReported) {
          findings.push({
            test: "focus-not-obscured",
            type: "warning",
            wcagCriteria: ["2.4.11"],
            wcagLevel: "AA",
            selector: focusInfo.selector,
            context: `element at center point is "${focusInfo.topElementSelector}", not the focused element`,
            message:
              `Focused element <${focusInfo.tagName}> appears visually obscured: another element is rendered on top ` +
              `at its center point. Text: "${focusInfo.text}"`,
            impact: "moderate",
          });
        }
      }
    }

    return {
      test: "focus-not-obscured",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "focus-not-obscured",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
