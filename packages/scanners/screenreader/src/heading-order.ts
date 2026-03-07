import type { Page } from "playwright";
import type { ScreenreaderFinding, ScreenreaderCheckResult } from "@saa/shared";

// ── Heading Order (WCAG 1.3.1, 2.4.6, 2.4.10) ──
// Validate H1-H6 hierarchy: no skipped levels, logical order.

export async function checkHeadingOrder(page: Page): Promise<ScreenreaderCheckResult> {
  const start = performance.now();
  const findings: ScreenreaderFinding[] = [];

  try {
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']");
      const result: Array<{
        tagName: string;
        level: number;
        text: string;
        selector: string;
        isHidden: boolean;
      }> = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        const isHidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          (rect.width === 0 && rect.height === 0);

        const tag = htmlEl.tagName.toLowerCase();
        let level: number;

        if (tag.startsWith("h") && tag.length === 2) {
          level = parseInt(tag[1]!, 10);
        } else {
          const ariaLevel = htmlEl.getAttribute("aria-level");
          level = ariaLevel ? parseInt(ariaLevel, 10) : 2;
        }

        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        result.push({
          tagName: tag,
          level,
          text: htmlEl.textContent?.trim().slice(0, 80) ?? "",
          selector: id || (tag + cls),
          isHidden,
        });
      }

      return result;
    });

    const visibleHeadings = headings.filter((h) => !h.isHidden);

    // Check: at least one H1
    const h1Count = visibleHeadings.filter((h) => h.level === 1).length;
    if (h1Count === 0) {
      findings.push({
        check: "heading-order",
        type: "error",
        wcagCriteria: ["1.3.1", "2.4.6"],
        wcagLevel: "AA",
        selector: "body",
        context: `${visibleHeadings.length} headings found, 0 at level 1`,
        message: "No H1 heading found — every page should have exactly one H1",
        impact: "serious",
        confidence: 1.0,
      });
    } else if (h1Count > 1) {
      findings.push({
        check: "heading-order",
        type: "warning",
        wcagCriteria: ["1.3.1"],
        wcagLevel: "A",
        selector: "body",
        context: `${h1Count} H1 headings found`,
        message: `Multiple H1 headings found (${h1Count}) — typically a page should have one H1`,
        impact: "moderate",
        confidence: 0.8,
      });
    }

    // Check: no skipped levels
    let previousLevel = 0;
    for (const heading of visibleHeadings) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        findings.push({
          check: "heading-order",
          type: "error",
          wcagCriteria: ["1.3.1"],
          wcagLevel: "A",
          selector: heading.selector,
          context: `Level ${heading.level} after level ${previousLevel} (skipped ${heading.level - previousLevel - 1} level(s))`,
          message: `Heading level skipped: <${heading.tagName}> (level ${heading.level}) follows level ${previousLevel}. Text: "${heading.text}"`,
          impact: "moderate",
          confidence: 1.0,
        });
      }
      previousLevel = heading.level;
    }

    // Check: first heading should be H1
    if (visibleHeadings.length > 0 && visibleHeadings[0]!.level !== 1) {
      findings.push({
        check: "heading-order",
        type: "warning",
        wcagCriteria: ["1.3.1", "2.4.6"],
        wcagLevel: "AA",
        selector: visibleHeadings[0]!.selector,
        context: `First heading is level ${visibleHeadings[0]!.level}`,
        message: `First heading on page is <${visibleHeadings[0]!.tagName}> (level ${visibleHeadings[0]!.level}), expected H1`,
        impact: "moderate",
        confidence: 0.9,
      });
    }

    // Check: empty headings
    for (const heading of visibleHeadings) {
      if (heading.text.trim().length === 0) {
        findings.push({
          check: "heading-order",
          type: "error",
          wcagCriteria: ["1.3.1", "2.4.6"],
          wcagLevel: "AA",
          selector: heading.selector,
          context: `Empty <${heading.tagName}> at level ${heading.level}`,
          message: `Empty heading <${heading.tagName}> — headings must have text content`,
          impact: "serious",
          confidence: 1.0,
        });
      }
    }

    return {
      check: "heading-order",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "heading-order",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
