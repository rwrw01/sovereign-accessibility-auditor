import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Dragging Movements (WCAG 2.5.7, AA) ──
// All functionality that uses a dragging movement must be operable by a
// single pointer without dragging, unless dragging is essential.
// Checks for drag-and-drop elements that lack a keyboard/button alternative.

export async function runDraggingMovementsTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [] as BehavioralFinding[];

  try {
    // Collect all potentially draggable elements from the DOM
    const draggableElements = await page.evaluate(() => {
      type DraggableInfo = {
        selector: string;
        tagName: string;
        text: string;
        reason: string;
        isNativeRange: boolean;
        hasKeyboardAlternative: boolean;
        rect: { top: number; left: number; width: number; height: number };
      };

      const results: DraggableInfo[] = [];
      const seen = new Set<Element>();

      const buildSelector = (el: HTMLElement): string => {
        const id = el.id ? `#${el.id}` : "";
        const tag = el.tagName.toLowerCase();
        const cls =
          el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        return id || tag + cls;
      };

      const isVisible = (el: HTMLElement): boolean => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };

      // Check if an element has a keyboard/button alternative nearby
      const hasAlternative = (el: HTMLElement): boolean => {
        const parent = el.parentElement ?? el;
        const container = parent.parentElement ?? parent;
        // Look for move-up/move-down buttons, or aria-keyshortcuts
        if (el.hasAttribute("aria-keyshortcuts")) return true;
        const buttons = container.querySelectorAll("button, [role='button']");
        for (const btn of buttons) {
          const label = (btn.textContent ?? "").toLowerCase();
          if (
            label.includes("up") ||
            label.includes("down") ||
            label.includes("move") ||
            label.includes("omhoog") ||
            label.includes("omlaag") ||
            label.includes("verplaats")
          ) {
            return true;
          }
          const ariaLabel = (btn.getAttribute("aria-label") ?? "").toLowerCase();
          if (
            ariaLabel.includes("up") ||
            ariaLabel.includes("down") ||
            ariaLabel.includes("move") ||
            ariaLabel.includes("omhoog") ||
            ariaLabel.includes("omlaag")
          ) {
            return true;
          }
        }
        return false;
      };

      const addElement = (el: HTMLElement, reason: string) => {
        if (seen.has(el) || !isVisible(el)) return;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        const isNativeRange = el.tagName.toLowerCase() === "input" &&
          (el as HTMLInputElement).type === "range";
        results.push({
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 60),
          reason,
          isNativeRange,
          hasKeyboardAlternative: isNativeRange || hasAlternative(el),
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        });
      };

      // 1. Explicit draggable attribute
      for (const el of document.querySelectorAll("[draggable='true']")) {
        addElement(el as HTMLElement, "draggable='true' attribute");
      }

      // 2. Inline event handler attributes
      for (const el of document.querySelectorAll("[ondrag], [ondragstart], [ondrop]")) {
        addElement(el as HTMLElement, "ondrag/ondragstart/ondrop handler attribute");
      }

      // 3. Sortable list patterns
      const sortableSelectors = [
        "[data-sortable]",
        ".sortable",
        ".draggable",
        "[class*='sortable']",
        "[class*='draggable']",
        "[class*='drag-item']",
        "[class*='drag-handle']",
      ];
      for (const sel of sortableSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          addElement(el as HTMLElement, `sortable pattern: ${sel}`);
        }
      }

      // 4. ARIA grabbed (deprecated but still used)
      for (const el of document.querySelectorAll("[aria-grabbed]")) {
        addElement(el as HTMLElement, "aria-grabbed attribute");
      }

      // 5. CSS cursor: grab / cursor: move (inline styles only — computed is expensive)
      for (const el of document.querySelectorAll("[style*='cursor: grab'], [style*='cursor:grab'], [style*='cursor: move'], [style*='cursor:move']")) {
        addElement(el as HTMLElement, "CSS cursor: grab/move");
      }

      // 6. Native range inputs — collect separately so we know they're OK
      for (const el of document.querySelectorAll("input[type='range']")) {
        addElement(el as HTMLElement, "native range slider");
      }

      return results;
    });

    // Evaluate computed cursor style for elements not caught by inline styles
    // (limited to first 50 candidates to stay performant)
    const candidatesForCursorCheck = draggableElements
      .filter((el) => !el.isNativeRange && !el.hasKeyboardAlternative)
      .slice(0, 50);

    for (const candidate of candidatesForCursorCheck) {
      if (!candidate.selector) continue;
      try {
        const hasCursorGrab = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const cursor = window.getComputedStyle(el as HTMLElement).cursor;
          return cursor === "grab" || cursor === "move" || cursor === "-webkit-grab";
        }, candidate.selector);

        if (hasCursorGrab && !candidate.reason.includes("cursor")) {
          candidate.reason += ", computed cursor: grab/move";
        }
      } catch {
        // Selector may not be unique — skip
      }
    }

    // Report findings
    for (const el of draggableElements) {
      // Native range sliders always have a keyboard alternative — skip
      if (el.isNativeRange) continue;

      if (!el.hasKeyboardAlternative) {
        findings.push({
          test: "dragging-movements",
          type: "error",
          wcagCriteria: ["2.5.7"],
          wcagLevel: "AA",
          selector: el.selector,
          context: `reason: ${el.reason}; text: "${el.text}"`,
          message:
            `Draggable element <${el.tagName}> has no detectable keyboard or single-pointer alternative ` +
            `(WCAG 2.5.7). Add buttons or keyboard shortcuts for move operations.`,
          impact: "serious",
        });
      } else {
        // Has an alternative but still draggable — notice to verify it works
        findings.push({
          test: "dragging-movements",
          type: "notice",
          wcagCriteria: ["2.5.7"],
          wcagLevel: "AA",
          selector: el.selector,
          context: `reason: ${el.reason}; text: "${el.text}"`,
          message:
            `Draggable element <${el.tagName}> appears to have an alternative (button or aria-keyshortcuts). ` +
            `Verify the alternative fully covers all drag operations.`,
          impact: "minor",
        });
      }
    }

    if (draggableElements.length === 0) {
      findings.push({
        test: "dragging-movements",
        type: "notice",
        wcagCriteria: ["2.5.7"],
        wcagLevel: "AA",
        selector: "body",
        context: "no draggable elements detected",
        message: "No draggable elements found on this page. WCAG 2.5.7 is not applicable.",
        impact: "minor",
      });
    }

    return {
      test: "dragging-movements",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "dragging-movements",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
