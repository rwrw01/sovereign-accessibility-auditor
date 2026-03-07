import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Hover/Focus Content (WCAG 1.4.13) ──
// Content that appears on hover/focus must be:
// 1. Dismissable — can be dismissed (e.g., Escape key) without moving focus
// 2. Hoverable — user can move pointer over the new content
// 3. Persistent — content remains visible until user dismisses, removes hover/focus, or it's no longer valid

export async function runHoverFocusTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // Find elements with title attribute (native tooltips)
    const titleElements = await page.evaluate(() => {
      const elements = document.querySelectorAll("[title]");
      const result: Array<{
        selector: string;
        tagName: string;
        title: string;
      }> = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        result.push({
          selector: id || (tag + cls),
          tagName: tag,
          title: htmlEl.getAttribute("title") ?? "",
        });
      }

      return result;
    });

    // Native title tooltips are not hoverable — WCAG 1.4.13 issue
    for (const el of titleElements) {
      if (el.title.trim().length > 0) {
        findings.push({
          test: "hover-focus",
          type: "warning",
          wcagCriteria: ["1.4.13"],
          wcagLevel: "AA",
          selector: el.selector,
          context: `title="${el.title}"`,
          message: `Element <${el.tagName}> uses native title attribute for tooltip. Native tooltips are not hoverable and cannot be dismissed with Escape — consider using aria-describedby with a custom tooltip`,
          impact: "moderate",
        });
      }
    }

    // Find elements that show content on hover (CSS-based detection)
    const hoverTriggers = await page.evaluate(() => {
      const triggers: Array<{
        selector: string;
        tagName: string;
        ariaExpanded: string | null;
        hasAriaDescribedby: boolean;
        text: string;
      }> = [];

      // Elements with aria-expanded or aria-haspopup likely show content on interaction
      const interactiveSelectors = "[aria-haspopup], [aria-expanded], [data-tooltip], [data-tip]";
      const elements = document.querySelectorAll(interactiveSelectors);

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        triggers.push({
          selector: id || (tag + cls),
          tagName: tag,
          ariaExpanded: htmlEl.getAttribute("aria-expanded"),
          hasAriaDescribedby: htmlEl.hasAttribute("aria-describedby"),
          text: htmlEl.textContent?.trim().slice(0, 60) ?? "",
        });
      }

      return triggers;
    });

    // Test dismissability: hover over triggers and try Escape key
    for (const trigger of hoverTriggers.slice(0, 20)) {
      const el = await page.$(trigger.selector);
      if (!el) continue;

      try {
        // Hover over element
        await el.hover({ timeout: 2000 });
        await page.waitForTimeout(300);

        // Check if new content appeared
        const contentAppeared = await page.evaluate((sel) => {
          const triggerEl = document.querySelector(sel);
          if (!triggerEl) return false;
          return triggerEl.getAttribute("aria-expanded") === "true";
        }, trigger.selector);

        if (contentAppeared) {
          // Test dismissability: press Escape
          await page.keyboard.press("Escape");
          await page.waitForTimeout(200);

          const contentDismissed = await page.evaluate((sel) => {
            const triggerEl = document.querySelector(sel);
            if (!triggerEl) return true;
            return triggerEl.getAttribute("aria-expanded") !== "true";
          }, trigger.selector);

          if (!contentDismissed) {
            findings.push({
              test: "hover-focus",
              type: "error",
              wcagCriteria: ["1.4.13"],
              wcagLevel: "AA",
              selector: trigger.selector,
              context: `aria-expanded remains "true" after Escape key`,
              message: `Hover/focus content on <${trigger.tagName}> is not dismissable with Escape key`,
              impact: "serious",
            });
          }
        }
      } catch {
        // Element might not be interactable, skip
      }
    }

    return {
      test: "hover-focus",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "hover-focus",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
