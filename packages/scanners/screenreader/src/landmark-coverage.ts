import type { Page } from "playwright";
import type { ScreenreaderFinding, ScreenreaderCheckResult } from "@saa/shared";

// ── Landmark Coverage (WCAG 1.3.1, 2.4.1) ──
// Verify that all page sections are wrapped in appropriate landmarks.
// Required landmarks: banner, main, contentinfo.
// All visible content should be within a landmark.

const REQUIRED_LANDMARKS = [
  { role: "banner", htmlTag: "header", description: "banner (site header)" },
  { role: "main", htmlTag: "main", description: "main content area" },
  { role: "contentinfo", htmlTag: "footer", description: "contentinfo (site footer)" },
];

export async function checkLandmarkCoverage(page: Page): Promise<ScreenreaderCheckResult> {
  const start = performance.now();
  const findings: ScreenreaderFinding[] = [];

  try {
    const landmarkInfo = await page.evaluate(() => {
      const landmarks: Array<{
        role: string;
        tagName: string;
        label: string;
        selector: string;
      }> = [];

      // Check for ARIA landmarks and HTML5 sectioning elements
      const landmarkSelectors = [
        "header", "nav", "main", "aside", "footer", "section", "form",
        "[role='banner']", "[role='navigation']", "[role='main']",
        "[role='complementary']", "[role='contentinfo']", "[role='search']",
        "[role='form']", "[role='region']",
      ];

      const elements = document.querySelectorAll(landmarkSelectors.join(", "));

      // Implicit role mapping (inlined to avoid esbuild __name injection in browser context)
      const SECTIONING_PARENTS = ["article", "aside", "main", "nav", "section"];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const tag = htmlEl.tagName.toLowerCase();
        const parentTag = htmlEl.parentElement?.tagName.toLowerCase() ?? "";

        let implicitRole = "";
        if (tag === "header") implicitRole = SECTIONING_PARENTS.includes(parentTag) ? "" : "banner";
        else if (tag === "footer") implicitRole = SECTIONING_PARENTS.includes(parentTag) ? "" : "contentinfo";
        else if (tag === "nav") implicitRole = "navigation";
        else if (tag === "main") implicitRole = "main";
        else if (tag === "aside") implicitRole = "complementary";
        else if (tag === "section") implicitRole = (htmlEl.getAttribute("aria-label") || htmlEl.getAttribute("aria-labelledby")) ? "region" : "";
        else if (tag === "form") implicitRole = (htmlEl.getAttribute("aria-label") || htmlEl.getAttribute("aria-labelledby")) ? "form" : "";

        const role = htmlEl.getAttribute("role") ?? implicitRole;
        const label = htmlEl.getAttribute("aria-label") ??
          htmlEl.getAttribute("aria-labelledby") ?? "";
        const id = htmlEl.id ? `#${htmlEl.id}` : "";

        landmarks.push({
          role,
          tagName: tag,
          label,
          selector: id || tag,
        });
      }

      // Check how much content is outside landmarks
      const allText = document.body.innerText?.length ?? 0;
      let textInLandmarks = 0;

      const mainElements = document.querySelectorAll("main, [role='main']");
      for (const el of mainElements) {
        textInLandmarks += (el as HTMLElement).innerText?.length ?? 0;
      }

      return {
        landmarks,
        totalTextLength: allText,
        textInMainLandmarks: textInLandmarks,
      };
    });

    // Check required landmarks
    for (const required of REQUIRED_LANDMARKS) {
      const found = landmarkInfo.landmarks.some(
        (l) => l.role === required.role || l.tagName === required.htmlTag,
      );

      if (!found) {
        findings.push({
          check: "landmark-coverage",
          type: "error",
          wcagCriteria: ["1.3.1"],
          wcagLevel: "A",
          selector: "body",
          context: `Missing landmark: ${required.description}`,
          message: `Required landmark "${required.description}" is missing — add <${required.htmlTag}> or role="${required.role}"`,
          impact: "serious",
          confidence: 1.0,
        });
      }
    }

    // Check if navigation landmarks exist
    const navCount = landmarkInfo.landmarks.filter(
      (l) => l.role === "navigation" || l.tagName === "nav",
    ).length;

    if (navCount === 0) {
      findings.push({
        check: "landmark-coverage",
        type: "warning",
        wcagCriteria: ["1.3.1", "2.4.1"],
        wcagLevel: "A",
        selector: "body",
        context: "No navigation landmark found",
        message: "No <nav> or role=\"navigation\" landmark found — navigation areas should be marked",
        impact: "moderate",
        confidence: 0.9,
      });
    }

    // Check multiple nav/complementary without labels
    const navLandmarks = landmarkInfo.landmarks.filter(
      (l) => l.role === "navigation" || l.tagName === "nav",
    );
    if (navLandmarks.length > 1) {
      const unlabeled = navLandmarks.filter((l) => !l.label);
      if (unlabeled.length > 0) {
        findings.push({
          check: "landmark-coverage",
          type: "warning",
          wcagCriteria: ["1.3.1"],
          wcagLevel: "A",
          selector: unlabeled[0]!.selector,
          context: `${navLandmarks.length} navigation landmarks, ${unlabeled.length} without label`,
          message: `Multiple navigation landmarks found (${navLandmarks.length}) but ${unlabeled.length} lack aria-label — screenreader users cannot distinguish them`,
          impact: "moderate",
          confidence: 0.9,
        });
      }
    }

    // Check content coverage
    if (landmarkInfo.totalTextLength > 100 && landmarkInfo.textInMainLandmarks === 0) {
      findings.push({
        check: "landmark-coverage",
        type: "error",
        wcagCriteria: ["1.3.1"],
        wcagLevel: "A",
        selector: "body",
        context: `${landmarkInfo.totalTextLength} chars of text, 0 in main landmark`,
        message: "No content found within a <main> landmark — all primary content should be in main",
        impact: "serious",
        confidence: 0.9,
      });
    }

    return {
      check: "landmark-coverage",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "landmark-coverage",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
