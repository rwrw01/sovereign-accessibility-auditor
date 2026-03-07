import type { Page } from "playwright";
import type { ScreenreaderFinding, ScreenreaderCheckResult } from "@saa/shared";

// ── Aria Live Regions (WCAG 4.1.3) ──
// Detect dynamic content areas that should have aria-live attributes.
// Also validate existing aria-live usage.

export async function checkAriaLive(page: Page): Promise<ScreenreaderCheckResult> {
  const start = performance.now();
  const findings: ScreenreaderFinding[] = [];

  try {
    const liveRegionInfo = await page.evaluate(() => {
      const liveRegions: Array<{
        selector: string;
        tagName: string;
        ariaLive: string;
        role: string;
        text: string;
        hasAtomicAttr: boolean;
      }> = [];

      // Find existing live regions
      const liveElements = document.querySelectorAll(
        "[aria-live], [role='alert'], [role='status'], [role='log'], [role='marquee'], [role='timer'], [role='progressbar']",
      );

      for (const el of liveElements) {
        const htmlEl = el as HTMLElement;
        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";

        liveRegions.push({
          selector: id || tag,
          tagName: tag,
          ariaLive: htmlEl.getAttribute("aria-live") ?? "",
          role: htmlEl.getAttribute("role") ?? "",
          text: htmlEl.textContent?.trim().slice(0, 60) ?? "",
          hasAtomicAttr: htmlEl.hasAttribute("aria-atomic"),
        });
      }

      // Detect potential dynamic areas that might need aria-live
      const potentialDynamic: Array<{
        selector: string;
        tagName: string;
        reason: string;
      }> = [];

      // Common patterns: error messages, notifications, counters
      const dynamicSelectors = [
        ".error-message", ".alert", ".notification", ".toast",
        ".flash", ".message", ".status", ".badge",
        "[class*='error']", "[class*='alert']", "[class*='notification']",
        "[class*='toast']", "[class*='status']",
      ];

      for (const selector of dynamicSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const htmlEl = el as HTMLElement;
          const hasLiveAttr = htmlEl.hasAttribute("aria-live") ||
            htmlEl.getAttribute("role") === "alert" ||
            htmlEl.getAttribute("role") === "status";

          if (!hasLiveAttr) {
            const rect = htmlEl.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            const tag = htmlEl.tagName.toLowerCase();
            const id = htmlEl.id ? `#${htmlEl.id}` : "";
            const cls = htmlEl.className && typeof htmlEl.className === "string"
              ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
              : "";

            potentialDynamic.push({
              selector: id || (tag + cls),
              tagName: tag,
              reason: `Matches dynamic content pattern: "${selector}"`,
            });
          }
        }
      }

      return { liveRegions, potentialDynamic };
    });

    // Validate existing live regions
    for (const region of liveRegionInfo.liveRegions) {
      // aria-live="off" is valid but often a mistake
      if (region.ariaLive === "off" && !region.role) {
        findings.push({
          check: "aria-live",
          type: "warning",
          wcagCriteria: ["4.1.3"],
          wcagLevel: "AA",
          selector: region.selector,
          context: `aria-live="off" on <${region.tagName}>`,
          message: `Element has aria-live="off" — verify this is intentional and not a mistake`,
          impact: "minor",
          confidence: 0.6,
        });
      }

      // aria-live="assertive" should be used sparingly
      if (region.ariaLive === "assertive") {
        findings.push({
          check: "aria-live",
          type: "notice",
          wcagCriteria: ["4.1.3"],
          wcagLevel: "AA",
          selector: region.selector,
          context: `aria-live="assertive" on <${region.tagName}>`,
          message: `Element uses aria-live="assertive" — use sparingly, prefer "polite" for non-urgent updates`,
          impact: "minor",
          confidence: 0.7,
        });
      }
    }

    // Flag potential dynamic areas without live region
    for (const dynamic of liveRegionInfo.potentialDynamic.slice(0, 10)) {
      findings.push({
        check: "aria-live",
        type: "warning",
        wcagCriteria: ["4.1.3"],
        wcagLevel: "AA",
        selector: dynamic.selector,
        context: dynamic.reason,
        message: `Element <${dynamic.tagName}> may contain dynamic content but has no aria-live attribute — screenreader users won't be notified of changes`,
        impact: "moderate",
        confidence: 0.5,
      });
    }

    return {
      check: "aria-live",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "aria-live",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
