import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Skip Link Detection (WCAG 2.4.1) ──
// The first focusable element on the page should be a skip navigation link
// that allows users to bypass repeated blocks of content.

export async function runSkipLinkTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // Reset focus
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    });

    // Tab to first focusable element
    await page.keyboard.press("Tab");

    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      const htmlEl = el as HTMLElement;
      const tag = htmlEl.tagName.toLowerCase();
      const id = htmlEl.id ? `#${htmlEl.id}` : "";
      const cls = htmlEl.className && typeof htmlEl.className === "string"
        ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
      const href = htmlEl.getAttribute("href");
      const text = htmlEl.textContent?.trim().toLowerCase() ?? "";

      const rect = htmlEl.getBoundingClientRect();

      return {
        selector: id || (tag + cls),
        tagName: tag,
        href,
        text,
        isLink: tag === "a" && !!href,
        isInternalLink: tag === "a" && !!href && href.startsWith("#"),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      };
    });

    if (!firstFocused) {
      findings.push({
        test: "skip-link",
        type: "error",
        wcagCriteria: ["2.4.1"],
        wcagLevel: "A",
        selector: "body",
        context: "No element received focus on first Tab press",
        message: "No skip navigation link found — first Tab press did not focus any element",
        impact: "serious",
      });

      return {
        test: "skip-link",
        findings,
        durationMs: Math.round(performance.now() - start),
        error: null,
      };
    }

    // Check if it's a skip link (internal anchor link with skip-related text)
    const skipLinkPatterns = [
      "skip", "overslaan", "ga naar", "direct naar",
      "spring naar", "naar inhoud", "naar content",
      "main content", "hoofdinhoud", "skip to",
      "jump to", "naar hoofdnavigatie",
    ];

    const isSkipLink =
      firstFocused.isInternalLink &&
      skipLinkPatterns.some((pattern) => firstFocused.text.includes(pattern));

    if (!isSkipLink) {
      // Check if it's at least an internal link (could be a skip link with unusual text)
      if (firstFocused.isInternalLink) {
        findings.push({
          test: "skip-link",
          type: "warning",
          wcagCriteria: ["2.4.1"],
          wcagLevel: "A",
          selector: firstFocused.selector,
          context: `href="${firstFocused.href}", text="${firstFocused.text}"`,
          message: `First focusable element is an internal link but may not be a skip link — text does not match common skip-link patterns`,
          impact: "moderate",
        });
      } else {
        findings.push({
          test: "skip-link",
          type: "error",
          wcagCriteria: ["2.4.1"],
          wcagLevel: "A",
          selector: firstFocused.selector,
          context: `tagName=${firstFocused.tagName}, href="${firstFocused.href ?? "none"}", text="${firstFocused.text}"`,
          message: `No skip navigation link found — first focusable element is <${firstFocused.tagName}> (expected an anchor link to #main or similar)`,
          impact: "serious",
        });
      }
    }

    // If skip link exists, verify it targets a valid element
    if (isSkipLink && firstFocused.href) {
      const targetId = firstFocused.href.replace("#", "");

      const targetExists = await page.evaluate((id) => {
        const target = document.getElementById(id);
        if (!target) return false;

        const rect = target.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, targetId);

      if (!targetExists) {
        findings.push({
          test: "skip-link",
          type: "error",
          wcagCriteria: ["2.4.1"],
          wcagLevel: "A",
          selector: firstFocused.selector,
          context: `href="${firstFocused.href}", target element #${targetId} not found or hidden`,
          message: `Skip link points to #${targetId} but the target element does not exist or is hidden`,
          impact: "serious",
        });
      }

      // Test that activating the skip link moves focus to the target
      if (targetExists) {
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);

        const focusMovedToTarget = await page.evaluate((id) => {
          const target = document.getElementById(id);
          return document.activeElement === target ||
            target?.contains(document.activeElement ?? null) === true;
        }, targetId);

        if (!focusMovedToTarget) {
          findings.push({
            test: "skip-link",
            type: "warning",
            wcagCriteria: ["2.4.1"],
            wcagLevel: "A",
            selector: firstFocused.selector,
            context: `Skip link activated but focus did not move to #${targetId}`,
            message: `Skip link does not move focus to target #${targetId} — users may lose their place after activation`,
            impact: "moderate",
          });
        }
      }
    }

    return {
      test: "skip-link",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "skip-link",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
