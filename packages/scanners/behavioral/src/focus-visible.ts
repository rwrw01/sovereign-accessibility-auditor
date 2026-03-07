import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Focus Visibility (WCAG 2.4.7, 2.4.11) ──
// Every focused element must have a visible focus indicator.
// We Tab through elements and check for visual changes on :focus.

export async function runFocusVisibleTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // Reset focus
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
        if (!el || el === document.body) return null;

        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        // Skip invisible elements
        if (rect.width === 0 || rect.height === 0) return null;

        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        return {
          selector: id || (tag + cls),
          tagName: tag,
          text: htmlEl.textContent?.trim().slice(0, 60) ?? "",
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
          borderWidth: style.borderWidth,
          backgroundColor: style.backgroundColor,
        };
      });

      if (!focusInfo) break;
      if (testedSelectors.has(focusInfo.selector)) continue;
      testedSelectors.add(focusInfo.selector);

      // Check if the element has a visible focus indicator
      const hasOutline =
        focusInfo.outlineStyle !== "none" &&
        focusInfo.outlineWidth !== "0px" &&
        focusInfo.outlineWidth !== "";

      const hasBoxShadow =
        focusInfo.boxShadow !== "none" && focusInfo.boxShadow !== "";

      // outline:none with no alternative focus style is the key indicator
      const hasNoFocusIndicator = !hasOutline && !hasBoxShadow;

      if (hasNoFocusIndicator) {
        // Check if the element explicitly removes the outline
        const hasExplicitOutlineNone = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;

          const style = window.getComputedStyle(el);
          return style.outlineStyle === "none";
        }, focusInfo.selector);

        if (hasExplicitOutlineNone) {
          findings.push({
            test: "focus-visible",
            type: "error",
            wcagCriteria: ["2.4.7"],
            wcagLevel: "AA",
            selector: focusInfo.selector,
            context: `outline: ${focusInfo.outlineStyle} ${focusInfo.outlineWidth}; box-shadow: ${focusInfo.boxShadow}`,
            message: `Element <${focusInfo.tagName}> has no visible focus indicator (outline:none, no box-shadow alternative). Text: "${focusInfo.text}"`,
            impact: "serious",
          });
        }
      }
    }

    return {
      test: "focus-visible",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "focus-visible",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
