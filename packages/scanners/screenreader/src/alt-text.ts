import type { Page } from "playwright";
import type { ScreenreaderFinding, ScreenreaderCheckResult } from "@saa/shared";

// ── Alt Text Quality (WCAG 1.1.1) ──
// Check images for alt text presence and quality indicators.

const POOR_ALT_PATTERNS = [
  /^image$/i,
  /^img$/i,
  /^foto$/i,
  /^photo$/i,
  /^picture$/i,
  /^plaatje$/i,
  /^afbeelding$/i,
  /^banner$/i,
  /^icon$/i,
  /^logo$/i,
  /^untitled$/i,
  /^screenshot$/i,
  /^\d+$/,
  /^dsc[_-]?\d+/i,
  /^img[_-]?\d+/i,
  /\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i,
];

export async function checkAltText(page: Page): Promise<ScreenreaderCheckResult> {
  const start = performance.now();
  const findings: ScreenreaderFinding[] = [];

  try {
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll("img, [role='img'], svg[role='img']");
      const result: Array<{
        selector: string;
        tagName: string;
        alt: string | null;
        hasAlt: boolean;
        ariaLabel: string | null;
        ariaLabelledby: string | null;
        isDecorative: boolean;
        src: string;
        width: number;
        height: number;
        isHidden: boolean;
      }> = [];

      for (const el of imgs) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        const isHidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          htmlEl.getAttribute("aria-hidden") === "true";

        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const alt = htmlEl.getAttribute("alt");
        const role = htmlEl.getAttribute("role");

        const isDecorative =
          alt === "" ||
          role === "presentation" ||
          role === "none";

        result.push({
          selector: id || tag,
          tagName: tag,
          alt,
          hasAlt: htmlEl.hasAttribute("alt"),
          ariaLabel: htmlEl.getAttribute("aria-label"),
          ariaLabelledby: htmlEl.getAttribute("aria-labelledby"),
          isDecorative,
          src: (htmlEl as HTMLImageElement).src?.slice(-60) ?? "",
          width: rect.width,
          height: rect.height,
          isHidden,
        });
      }

      return result;
    });

    for (const img of images) {
      if (img.isHidden) continue;
      if (img.width <= 1 || img.height <= 1) continue;

      // Missing alt attribute entirely
      if (!img.hasAlt && !img.ariaLabel && !img.ariaLabelledby && !img.isDecorative) {
        findings.push({
          check: "alt-text",
          type: "error",
          wcagCriteria: ["1.1.1"],
          wcagLevel: "A",
          selector: img.selector,
          context: `src="${img.src}", ${img.width}x${img.height}px`,
          message: `Image <${img.tagName}> has no alt attribute — screenreader users cannot understand this image`,
          impact: "critical",
          confidence: 1.0,
        });
        continue;
      }

      // Check alt text quality
      const altText = img.alt ?? img.ariaLabel ?? "";
      if (altText && !img.isDecorative) {
        for (const pattern of POOR_ALT_PATTERNS) {
          if (pattern.test(altText.trim())) {
            findings.push({
              check: "alt-text",
              type: "warning",
              wcagCriteria: ["1.1.1"],
              wcagLevel: "A",
              selector: img.selector,
              context: `alt="${altText}"`,
              message: `Image alt text "${altText}" appears to be a filename or generic description — provide meaningful alternative text`,
              impact: "moderate",
              confidence: 0.8,
            });
            break;
          }
        }

        // Very long alt text
        if (altText.length > 150) {
          findings.push({
            check: "alt-text",
            type: "notice",
            wcagCriteria: ["1.1.1"],
            wcagLevel: "A",
            selector: img.selector,
            context: `alt="${altText.slice(0, 60)}..." (${altText.length} chars)`,
            message: `Image alt text is very long (${altText.length} chars) — consider using aria-describedby for detailed descriptions`,
            impact: "minor",
            confidence: 0.7,
          });
        }
      }
    }

    return {
      check: "alt-text",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "alt-text",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
