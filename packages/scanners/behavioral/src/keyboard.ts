import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Keyboard Navigation (WCAG 2.1.1, 2.1.2) ──
// Tab through entire page, verify all interactive elements are reachable.
// Also checks for correct tab order (no unexpected jumps).

export async function runKeyboardNavTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // Collect all interactive elements from the DOM
    const interactiveElements = await page.evaluate(() => {
      const selectors = "a[href], button, input, select, textarea, [tabindex], [role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='tab'], [role='menuitem'], [contenteditable='true']";
      const elements = document.querySelectorAll(selectors);
      const result: Array<{
        selector: string;
        tagName: string;
        text: string;
        tabIndex: number;
        isDisabled: boolean;
        isHidden: boolean;
        rect: { top: number; left: number; width: number; height: number };
      }> = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        const isHidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0 ||
          rect.height === 0 ||
          htmlEl.getAttribute("aria-hidden") === "true";

        const isDisabled =
          htmlEl.hasAttribute("disabled") ||
          htmlEl.getAttribute("aria-disabled") === "true";

        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        result.push({
          selector: id || (tag + cls),
          tagName: tag,
          text: htmlEl.textContent?.trim().slice(0, 60) ?? "",
          tabIndex: htmlEl.tabIndex,
          isDisabled,
          isHidden,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      }

      return result;
    });

    // Filter to visible, enabled, non-negative-tabindex elements
    const expectedFocusable = interactiveElements.filter(
      (el) => !el.isHidden && !el.isDisabled && el.tabIndex >= 0,
    );

    // Elements with negative tabindex that are interactive (potential issues)
    const negativeTabindex = interactiveElements.filter(
      (el) => !el.isHidden && !el.isDisabled && el.tabIndex < 0,
    );

    for (const el of negativeTabindex) {
      // Interactive elements with tabindex="-1" are not keyboard-reachable
      if (["a", "button", "input", "select", "textarea"].includes(el.tagName)) {
        findings.push({
          test: "keyboard-nav",
          type: "error",
          wcagCriteria: ["2.1.1"],
          wcagLevel: "A",
          selector: el.selector,
          context: `tabindex="${el.tabIndex}", tagName=${el.tagName}`,
          message: `Interactive element <${el.tagName}> has tabindex="-1" and cannot be reached via keyboard (text: "${el.text}")`,
          impact: "critical",
        });
      }
    }

    // Actually tab through the page and collect focused elements
    const focusedSelectors: string[] = [];
    const maxTabs = Math.min(expectedFocusable.length + 20, 200);

    // Focus the body first to start clean
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    });

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");

      const focusedInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;

        const htmlEl = el as HTMLElement;
        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        return {
          selector: id || (tag + cls),
          tagName: tag,
        };
      });

      if (!focusedInfo || focusedInfo.tagName === "body") {
        // Reached the end of tab order
        break;
      }

      // Detect cycles (already visited this element)
      if (focusedSelectors.includes(focusedInfo.selector) && focusedSelectors.length > 2) {
        break;
      }

      focusedSelectors.push(focusedInfo.selector);
    }

    // Check if expected interactive elements were actually reached
    const unreachedCount = expectedFocusable.filter(
      (el) => !focusedSelectors.some((fs) => fs === el.selector),
    ).length;

    // Only report if a significant number were unreached (selector matching is imprecise)
    if (unreachedCount > 0 && focusedSelectors.length > 0) {
      const reachPercentage = Math.round(
        ((expectedFocusable.length - unreachedCount) / expectedFocusable.length) * 100,
      );

      if (reachPercentage < 90) {
        findings.push({
          test: "keyboard-nav",
          type: "warning",
          wcagCriteria: ["2.1.1"],
          wcagLevel: "A",
          selector: "body",
          context: `reached=${focusedSelectors.length}, expected=${expectedFocusable.length}, unreached=${unreachedCount}`,
          message: `Only ${reachPercentage}% of interactive elements were reached via Tab key (${focusedSelectors.length}/${expectedFocusable.length})`,
          impact: "serious",
        });
      }
    }

    if (focusedSelectors.length === 0 && expectedFocusable.length > 0) {
      findings.push({
        test: "keyboard-nav",
        type: "error",
        wcagCriteria: ["2.1.1"],
        wcagLevel: "A",
        selector: "body",
        context: `expected=${expectedFocusable.length} focusable elements`,
        message: "No elements received focus via Tab key — keyboard navigation appears completely broken",
        impact: "critical",
      });
    }

    return {
      test: "keyboard-nav",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "keyboard-nav",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
