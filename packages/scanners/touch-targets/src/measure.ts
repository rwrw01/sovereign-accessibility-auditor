import type { Page } from "playwright";
import type { TouchTargetFinding } from "@saa/shared";

// ── Touch Target Measurement (WCAG 2.5.8, 2.5.5) ──
// Measure all interactive elements and flag those below minimum size.
// WCAG 2.5.8 (AA): 24x24 CSS pixels minimum
// WCAG 2.5.5 (AAA): 44x44 CSS pixels minimum
// We use 24px as default (AA), configurable via minTargetSize.

const INTERACTIVE_SELECTORS = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='option']",
  "[role='switch']",
  "[role='slider']",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export async function measureTouchTargets(
  page: Page,
  minTargetSize: number,
): Promise<{ findings: TouchTargetFinding[]; totalElements: number; failingElements: number }> {
  const findings: TouchTargetFinding[] = [];

  const elements = await page.evaluate((selector) => {
    const els = document.querySelectorAll(selector);
    const result: Array<{
      selector: string;
      tagName: string;
      text: string;
      width: number;
      height: number;
      isDisabled: boolean;
      isHidden: boolean;
      display: string;
      role: string;
      type: string;
    }> = [];

    for (const el of els) {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const style = window.getComputedStyle(htmlEl);

      const isHidden =
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width === 0 ||
        rect.height === 0 ||
        htmlEl.getAttribute("aria-hidden") === "true";

      // Skip visually-hidden screenreader patterns
      if (rect.width <= 2 || rect.height <= 2) continue;
      if (style.clip === "rect(0px, 0px, 0px, 0px)") continue;
      if (style.position === "absolute" && (
        style.width === "1px" || style.height === "1px"
      )) continue;

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
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        isDisabled,
        isHidden,
        display: style.display,
        role: htmlEl.getAttribute("role") ?? "",
        type: htmlEl.getAttribute("type") ?? "",
      });
    }

    return result;
  }, INTERACTIVE_SELECTORS);

  const visibleElements = elements.filter((el) => !el.isHidden && !el.isDisabled);
  let failingCount = 0;

  for (const el of visibleElements) {
    const tooSmall = el.width < minTargetSize || el.height < minTargetSize;

    if (tooSmall) {
      failingCount++;

      // Determine if it's inline text link (exception in WCAG 2.5.8)
      const isInlineLink = el.tagName === "a" && el.display === "inline";

      const wcagCriteria = minTargetSize >= 44 ? ["2.5.5"] : ["2.5.8"];
      const wcagLevel = minTargetSize >= 44 ? "AAA" as const : "AA" as const;

      if (isInlineLink) {
        // Inline links are excepted from 2.5.8 but still worth noting
        findings.push({
          type: "notice",
          wcagCriteria,
          wcagLevel,
          selector: el.selector,
          tagName: el.tagName,
          text: el.text,
          width: el.width,
          height: el.height,
          minRequired: minTargetSize,
          context: `${el.width}x${el.height}px (inline link, excepted from 2.5.8)`,
          message: `Inline link <a> has small touch target (${el.width}x${el.height}px < ${minTargetSize}px) — excepted by WCAG 2.5.8 for inline text links`,
          impact: "minor",
        });
      } else {
        const impact = (el.width < minTargetSize / 2 || el.height < minTargetSize / 2)
          ? "serious" as const
          : "moderate" as const;

        findings.push({
          type: "error",
          wcagCriteria,
          wcagLevel,
          selector: el.selector,
          tagName: el.tagName,
          text: el.text,
          width: el.width,
          height: el.height,
          minRequired: minTargetSize,
          context: `${el.width}x${el.height}px (minimum: ${minTargetSize}x${minTargetSize}px)`,
          message: `Touch target <${el.tagName}> is too small (${el.width}x${el.height}px, minimum ${minTargetSize}x${minTargetSize}px). Text: "${el.text}"`,
          impact,
        });
      }
    }
  }

  // Also check spacing between touch targets (WCAG 2.5.8 allows smaller targets with sufficient spacing)
  const spacingFindings = await checkTargetSpacing(page, minTargetSize);
  findings.push(...spacingFindings);

  return {
    findings,
    totalElements: visibleElements.length,
    failingElements: failingCount,
  };
}

async function checkTargetSpacing(
  page: Page,
  minTargetSize: number,
): Promise<TouchTargetFinding[]> {
  const findings: TouchTargetFinding[] = [];

  const targets = await page.evaluate((selector) => {
    const els = document.querySelectorAll(selector);
    const result: Array<{
      selector: string;
      tagName: string;
      text: string;
      rect: { top: number; right: number; bottom: number; left: number; width: number; height: number };
    }> = [];

    for (const el of els) {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const style = window.getComputedStyle(htmlEl);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width === 0 ||
        rect.height === 0
      ) continue;

      // Skip very small (screenreader-only) elements
      if (rect.width <= 2 || rect.height <= 2) continue;

      const tag = htmlEl.tagName.toLowerCase();
      const id = htmlEl.id ? `#${htmlEl.id}` : "";

      result.push({
        selector: id || tag,
        tagName: tag,
        text: htmlEl.textContent?.trim().slice(0, 40) ?? "",
        rect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    return result;
  }, INTERACTIVE_SELECTORS);

  // Check pairwise spacing (limit to first 100 for performance)
  const limit = Math.min(targets.length, 100);
  for (let i = 0; i < limit; i++) {
    const a = targets[i]!;

    // Only check small targets
    if (a.rect.width >= minTargetSize && a.rect.height >= minTargetSize) continue;

    for (let j = i + 1; j < limit; j++) {
      const b = targets[j]!;

      // Calculate distance between elements
      const horizontalGap = Math.max(0, Math.max(b.rect.left - a.rect.right, a.rect.left - b.rect.right));
      const verticalGap = Math.max(0, Math.max(b.rect.top - a.rect.bottom, a.rect.top - b.rect.bottom));

      // If targets overlap or are very close (< 4px gap)
      if (horizontalGap < 4 && verticalGap < 4) {
        // Both targets are small AND close together = compound issue
        if (b.rect.width < minTargetSize || b.rect.height < minTargetSize) {
          findings.push({
            type: "warning",
            wcagCriteria: ["2.5.8"],
            wcagLevel: "AA",
            selector: a.selector,
            tagName: a.tagName,
            text: a.text,
            width: a.rect.width,
            height: a.rect.height,
            minRequired: minTargetSize,
            context: `Gap to "${b.selector}": ${Math.max(horizontalGap, verticalGap).toFixed(1)}px`,
            message: `Small touch target <${a.tagName}> (${a.rect.width}x${a.rect.height}px) is too close to <${b.tagName}> (gap: ${Math.max(horizontalGap, verticalGap).toFixed(1)}px)`,
            impact: "moderate",
          });
          break; // Only report once per element
        }
      }
    }
  }

  return findings;
}
