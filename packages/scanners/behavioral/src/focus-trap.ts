import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Focus Trap Detection (WCAG 2.1.2) ──
// Detect inescapable focus traps: elements where Tab+Shift+Tab cycles
// within a subset of elements without allowing escape.

export async function runFocusTrapTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // Focus the body to start clean
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    });

    const maxTabs = 200;
    const focusSequence: string[] = [];

    // Tab through the page and record focus sequence
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");

      const focusedSelector = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;

        const htmlEl = el as HTMLElement;
        const tag = htmlEl.tagName.toLowerCase();
        const id = htmlEl.id ? `#${htmlEl.id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        return id || (tag + cls);
      });

      if (!focusedSelector) break;

      focusSequence.push(focusedSelector);

      // Detect a cycle: if the last N elements repeat, we have a trap
      if (focusSequence.length >= 6) {
        const trapDetected = detectCycle(focusSequence);
        if (trapDetected) {
          const cycleElements = trapDetected.cycle;

          findings.push({
            test: "focus-trap",
            type: "error",
            wcagCriteria: ["2.1.2"],
            wcagLevel: "A",
            selector: cycleElements[0] ?? "unknown",
            context: `Cycle: ${cycleElements.join(" → ")} (repeated ${trapDetected.repetitions} times)`,
            message: `Focus trap detected: Tab key cycles through ${cycleElements.length} element(s) without reaching the rest of the page`,
            impact: "critical",
          });

          break;
        }
      }
    }

    // Also test Shift+Tab escape from various points
    // Navigate halfway into the page, then try Shift+Tab to escape
    const halfwayIndex = Math.min(Math.floor(focusSequence.length / 2), 20);

    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      document.body.focus();
    });

    // Tab to halfway point
    for (let i = 0; i < halfwayIndex; i++) {
      await page.keyboard.press("Tab");
    }

    // Record current position
    const midpointSelector = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const htmlEl = el as HTMLElement;
      const tag = htmlEl.tagName.toLowerCase();
      const id = htmlEl.id ? `#${htmlEl.id}` : "";
      return id || tag;
    });

    if (midpointSelector) {
      // Try Shift+Tab multiple times
      const shiftTabSequence: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Shift+Tab");

        const selector = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const htmlEl = el as HTMLElement;
          const tag = htmlEl.tagName.toLowerCase();
          const id = htmlEl.id ? `#${htmlEl.id}` : "";
          return id || tag;
        });

        if (!selector) break;
        shiftTabSequence.push(selector);
      }

      if (shiftTabSequence.length >= 6) {
        const trapDetected = detectCycle(shiftTabSequence);
        if (trapDetected) {
          findings.push({
            test: "focus-trap",
            type: "error",
            wcagCriteria: ["2.1.2"],
            wcagLevel: "A",
            selector: trapDetected.cycle[0] ?? "unknown",
            context: `Shift+Tab cycle: ${trapDetected.cycle.join(" → ")}`,
            message: `Focus trap detected on Shift+Tab: cannot escape backwards from ${midpointSelector}`,
            impact: "critical",
          });
        }
      }
    }

    return {
      test: "focus-trap",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      test: "focus-trap",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface CycleResult {
  cycle: string[];
  repetitions: number;
}

function detectCycle(sequence: string[]): CycleResult | null {
  // Check for cycles of length 1 to maxCycleLen
  const maxCycleLen = Math.floor(sequence.length / 3);

  for (let cycleLen = 1; cycleLen <= maxCycleLen; cycleLen++) {
    const tail = sequence.slice(-cycleLen * 3);
    if (tail.length < cycleLen * 3) continue;

    const cycle1 = tail.slice(0, cycleLen).join(",");
    const cycle2 = tail.slice(cycleLen, cycleLen * 2).join(",");
    const cycle3 = tail.slice(cycleLen * 2, cycleLen * 3).join(",");

    if (cycle1 === cycle2 && cycle2 === cycle3) {
      return {
        cycle: tail.slice(0, cycleLen),
        repetitions: 3,
      };
    }
  }

  return null;
}
