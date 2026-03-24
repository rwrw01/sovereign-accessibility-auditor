import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Pointer Gestures (WCAG 2.5.1, A) ──
// All functionality that uses multipoint or path-based gestures for operation
// can be operated with a single pointer without a path-based gesture, unless
// the gesture is essential.

export async function runPointerGesturesTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    const gestureElements = await page.evaluate(() => {
      type GestureInfo = {
        selector: string;
        tagName: string;
        text: string;
        category: string;
        gestureCues: string[];
        hasButtonAlternative: boolean;
      };

      const results: GestureInfo[] = [];
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

      // Check if the element or its parent container has button controls
      const hasButtonAlternative = (el: HTMLElement): boolean => {
        // Walk up to find a meaningful container (max 3 levels)
        let container: HTMLElement = el;
        for (let depth = 0; depth < 3; depth++) {
          const parent = container.parentElement;
          if (!parent) break;
          container = parent;
        }

        // Look for button controls within the container and siblings
        const searchRoot = container.parentElement ?? container;
        const buttons = searchRoot.querySelectorAll(
          "button, [role='button'], input[type='button'], input[type='submit']",
        );

        for (const btn of buttons) {
          const label = (
            (btn.getAttribute("aria-label") ?? "") +
            " " +
            (btn.textContent ?? "")
          ).toLowerCase();

          // Common control labels for maps, carousels, sliders
          if (
            label.includes("zoom") ||
            label.includes("prev") ||
            label.includes("next") ||
            label.includes("vorige") ||
            label.includes("volgende") ||
            label.includes("+") ||
            label.includes("-") ||
            label.includes("left") ||
            label.includes("right") ||
            label.includes("forward") ||
            label.includes("back") ||
            label.includes("play") ||
            label.includes("pause")
          ) {
            return true;
          }
        }

        // Check for keyboard event handlers that indicate keyboard alternative
        if (
          el.hasAttribute("onkeydown") ||
          el.hasAttribute("onkeyup") ||
          el.hasAttribute("onkeypress") ||
          el.getAttribute("tabindex") !== null
        ) {
          return true;
        }

        return false;
      };

      const addElement = (el: HTMLElement, category: string, cues: string[]) => {
        if (seen.has(el) || !isVisible(el)) return;
        seen.add(el);
        results.push({
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 60),
          category,
          gestureCues: cues,
          hasButtonAlternative: hasButtonAlternative(el),
        });
      };

      // 1. Canvas elements — frequently used for gesture-driven interfaces
      for (const el of document.querySelectorAll("canvas")) {
        const cues: string[] = ["canvas element"];
        if (el.hasAttribute("ontouchstart")) cues.push("ontouchstart");
        if (el.hasAttribute("ontouchmove")) cues.push("ontouchmove");
        addElement(el as HTMLElement, "canvas", cues);
      }

      // 2. Touch event handler attributes
      const touchAttrs = ["ontouchstart", "ontouchmove", "ontouchend", "ongesturestart", "ongesturechange", "ongestureend"];
      const touchSel = touchAttrs.map((a) => `[${a}]`).join(", ");
      for (const el of document.querySelectorAll(touchSel)) {
        const cues = touchAttrs.filter((a) => el.hasAttribute(a));
        addElement(el as HTMLElement, "touch-events", cues);
      }

      // 3. Path-based pointer: onpointerdown + onpointermove together
      for (const el of document.querySelectorAll("[onpointerdown][onpointermove]")) {
        addElement(el as HTMLElement, "path-based-pointer", ["onpointerdown", "onpointermove"]);
      }

      // 4. Map widgets — inherently gesture-heavy
      const mapSelectors = [
        "[class*='map']",
        "[id*='map']",
        ".leaflet-container",
        ".mapboxgl-map",
        "#google-map",
        "[data-map]",
        "[aria-label*='map']",
        "[aria-label*='kaart']",
      ];
      for (const sel of mapSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          addElement(el as HTMLElement, "map-widget", [`matches: ${sel}`]);
        }
      }

      // 5. Carousel / slider components
      const carouselSelectors = [
        "[class*='carousel']",
        "[class*='slider']",
        "[class*='swiper']",
        ".swiper",
        "[class*='splide']",
        "[class*='glide']",
        "[data-carousel]",
        "[data-slider]",
        "[role='marquee']",
      ];
      for (const sel of carouselSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          addElement(el as HTMLElement, "carousel-slider", [`matches: ${sel}`]);
        }
      }

      // 6. Draw / signature widgets (often gesture-only)
      const drawSelectors = [
        "[class*='signature']",
        "[class*='draw']",
        "[class*='canvas-container']",
        "[data-draw]",
        "[data-signature]",
      ];
      for (const sel of drawSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          addElement(el as HTMLElement, "draw-signature", [`matches: ${sel}`]);
        }
      }

      return results;
    });

    // Per-category diagnostic data: [type, impact, message template]
    type CategoryRule = {
      type: "error" | "warning" | "notice";
      impact: "critical" | "serious" | "moderate" | "minor";
      message: (el: { tagName: string; text: string; category: string }, cues: string) => string;
    };
    const categoryRules: Record<string, CategoryRule> = {
      canvas: {
        type: "warning", impact: "serious",
        message: (el) =>
          `Canvas element may rely on multi-point or path-based gestures. ` +
          `No button alternatives detected. Verify all interactions are operable without gestures. Text: "${el.text}"`,
      },
      "touch-events": {
        type: "error", impact: "critical",
        message: (el, cues) =>
          `Element <${el.tagName}> has touch/gesture handlers (${cues}) with no single-pointer button alternative. ` +
          `Users who cannot perform path-based gestures will be excluded. Text: "${el.text}"`,
      },
      "path-based-pointer": {
        type: "error", impact: "critical",
        message: (el, cues) =>
          `Element <${el.tagName}> uses path-based pointer events (${cues}) without a button alternative. ` +
          `Text: "${el.text}"`,
      },
      "map-widget": {
        type: "error", impact: "serious",
        message: (el) =>
          `Map widget detected without zoom/pan button controls. Add +/- zoom and pan buttons so the map is ` +
          `operable without pinch/drag gestures. Text: "${el.text}"`,
      },
      "carousel-slider": {
        type: "error", impact: "serious",
        message: (el) =>
          `Carousel/slider detected without prev/next button controls. ` +
          `Swiping gestures must have a single-pointer button alternative. Text: "${el.text}"`,
      },
      "draw-signature": {
        type: "warning", impact: "moderate",
        message: (el) =>
          `Draw/signature widget detected. If the drawing path is not essential, ` +
          `provide a typed-input alternative. Text: "${el.text}"`,
      },
    };

    // Report findings
    for (const el of gestureElements) {
      const cueText = el.gestureCues.join(", ");

      if (el.hasButtonAlternative) {
        findings.push({
          test: "pointer-gestures",
          type: "notice", wcagCriteria: ["2.5.1"], wcagLevel: "A",
          selector: el.selector,
          context: `category: ${el.category}; cues: ${cueText}`,
          message:
            `Gesture-capable element <${el.tagName}> (${el.category}) appears to have button alternatives. ` +
            `Verify they cover all gesture operations. Text: "${el.text}"`,
          impact: "minor",
        });
        continue;
      }

      const rule = categoryRules[el.category];
      if (rule) {
        findings.push({
          test: "pointer-gestures",
          type: rule.type, wcagCriteria: ["2.5.1"], wcagLevel: "A",
          selector: el.selector,
          context: `category: ${el.category}; cues: ${cueText}`,
          message: rule.message(el, cueText),
          impact: rule.impact,
        });
      }
    }

    if (gestureElements.length === 0) {
      findings.push({
        test: "pointer-gestures",
        type: "notice",
        wcagCriteria: ["2.5.1"],
        wcagLevel: "A",
        selector: "body",
        context: "no gesture-based elements detected",
        message: "No gesture-based elements found. WCAG 2.5.1 appears not applicable to this page.",
        impact: "minor",
      });
    }

    return {
      test: "pointer-gestures",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "pointer-gestures",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
