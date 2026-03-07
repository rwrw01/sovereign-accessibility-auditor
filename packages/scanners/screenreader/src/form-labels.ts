import type { Page } from "playwright";
import type { ScreenreaderFinding, ScreenreaderCheckResult } from "@saa/shared";

// ── Form Labels (WCAG 1.3.1, 3.3.2, 4.1.2) ──
// Verify all form inputs have associated labels.

export async function checkFormLabels(page: Page): Promise<ScreenreaderCheckResult> {
  const start = performance.now();
  const findings: ScreenreaderFinding[] = [];

  try {
    const formFields = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']), select, textarea",
      );
      const result: Array<{
        selector: string;
        tagName: string;
        type: string;
        hasLabel: boolean;
        hasAriaLabel: boolean;
        hasAriaLabelledby: boolean;
        hasTitle: boolean;
        hasPlaceholder: boolean;
        placeholderText: string;
        labelText: string;
        isHidden: boolean;
      }> = [];

      for (const el of inputs) {
        const htmlEl = el as HTMLInputElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        const isHidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          htmlEl.getAttribute("aria-hidden") === "true" ||
          (rect.width === 0 && rect.height === 0);

        const tag = htmlEl.tagName.toLowerCase();
        const type = htmlEl.type ?? "";
        const id = htmlEl.id;

        // Check for associated label
        let hasLabel = false;
        let labelText = "";

        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            hasLabel = true;
            labelText = label.textContent?.trim().slice(0, 60) ?? "";
          }
        }

        // Check for wrapping label
        if (!hasLabel) {
          const parentLabel = htmlEl.closest("label");
          if (parentLabel) {
            hasLabel = true;
            labelText = parentLabel.textContent?.trim().slice(0, 60) ?? "";
          }
        }

        const idSelector = id ? `#${id}` : "";
        const cls = htmlEl.className && typeof htmlEl.className === "string"
          ? "." + htmlEl.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";

        result.push({
          selector: idSelector || (tag + cls),
          tagName: tag,
          type,
          hasLabel,
          hasAriaLabel: htmlEl.hasAttribute("aria-label"),
          hasAriaLabelledby: htmlEl.hasAttribute("aria-labelledby"),
          hasTitle: htmlEl.hasAttribute("title"),
          hasPlaceholder: htmlEl.hasAttribute("placeholder"),
          placeholderText: htmlEl.getAttribute("placeholder") ?? "",
          labelText,
          isHidden,
        });
      }

      return result;
    });

    for (const field of formFields) {
      if (field.isHidden) continue;

      const hasAccessibleName =
        field.hasLabel || field.hasAriaLabel || field.hasAriaLabelledby || field.hasTitle;

      if (!hasAccessibleName) {
        if (field.hasPlaceholder) {
          findings.push({
            check: "form-labels",
            type: "error",
            wcagCriteria: ["1.3.1", "3.3.2", "4.1.2"],
            wcagLevel: "A",
            selector: field.selector,
            context: `<${field.tagName} type="${field.type}"> with placeholder="${field.placeholderText}" but no label`,
            message: `Form field <${field.tagName}> uses placeholder as only label — placeholder text disappears on input. Add a <label> or aria-label`,
            impact: "serious",
            confidence: 1.0,
          });
        } else {
          findings.push({
            check: "form-labels",
            type: "error",
            wcagCriteria: ["1.3.1", "3.3.2", "4.1.2"],
            wcagLevel: "A",
            selector: field.selector,
            context: `<${field.tagName} type="${field.type}"> without any accessible name`,
            message: `Form field <${field.tagName}> has no label, aria-label, aria-labelledby, or title — screenreader users cannot identify this field`,
            impact: "critical",
            confidence: 1.0,
          });
        }
      }
    }

    return {
      check: "form-labels",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "form-labels",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
