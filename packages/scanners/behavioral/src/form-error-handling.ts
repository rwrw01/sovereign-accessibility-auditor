import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Form Error Handling (WCAG 3.3.1, 3.3.3, 3.3.4) ──

interface FormInfo {
  selector: string;
  hasSubmit: boolean;
  submitSel: string | null;
  requiredCount: number;
  isSensitive: boolean;
  sensitiveKeyword: string;
  hasConfirmCheckbox: boolean;
}

interface ErrorState {
  hasAriaInvalid: boolean;
  hasRoleAlert: boolean;
  hasErrorClass: boolean;
  fieldsWithNoErrorLink: string[];
  patternFieldsWithoutSuggestion: Array<{ sel: string; inputType: string; errorText: string }>;
}

export async function runFormErrorHandlingTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    const forms = await collectForms(page);

    for (const form of forms) {
      // 3.3.4: Sensitive forms without confirmation pattern (static check)
      if (form.isSensitive && !form.hasConfirmCheckbox) {
        findings.push({
          test: "form-error-handling", type: "warning",
          wcagCriteria: ["3.3.4"], wcagLevel: "AA",
          selector: form.selector,
          context: `keyword="${form.sensitiveKeyword}", hasConfirmCheckbox=false`,
          message: `Form handles sensitive data ("${form.sensitiveKeyword}") but has no confirmation checkbox — add a review step or explicit confirmation before submit (WCAG 3.3.4)`,
          impact: "moderate",
        });
      }

      if (!form.hasSubmit || form.requiredCount === 0) continue;

      const urlBefore = page.url();
      let navigated = false;

      try {
        await page.evaluate((sel) => {
          const frm = document.querySelector(sel) as HTMLFormElement | null;
          if (!frm) return;
          // Clear text/email/url/tel/textarea fields to trigger validation
          for (const f of frm.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio']), textarea")) {
            const inp = f as HTMLInputElement | HTMLTextAreaElement;
            inp.value = "";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("blur", { bubbles: true }));
          }
          frm.addEventListener("submit", (e) => e.preventDefault(), { once: true });
          frm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }, form.selector);
        await page.waitForTimeout(500);
      } catch { /* navigation may have thrown */ }

      navigated = page.url() !== urlBefore;

      const errorState = await inspectErrors(page, form.selector);

      const anyErrorId = errorState.hasAriaInvalid || errorState.hasRoleAlert || errorState.hasErrorClass;

      // 3.3.1: No error identification after empty submit
      if (!anyErrorId && !navigated) {
        findings.push({
          test: "form-error-handling", type: "error",
          wcagCriteria: ["3.3.1"], wcagLevel: "A",
          selector: form.selector,
          context: `requiredFields=${form.requiredCount}, ariaInvalid=${errorState.hasAriaInvalid}, roleAlert=${errorState.hasRoleAlert}, errorClass=${errorState.hasErrorClass}`,
          message: `Form with ${form.requiredCount} required field(s) submitted empty but no error identification detected — errors must be identified in text (not only color) using aria-invalid, role="alert", or visible messages (WCAG 3.3.1)`,
          impact: "critical",
        });
      }

      // 3.3.1: Invalid fields not linked to error messages
      if (errorState.fieldsWithNoErrorLink.length > 0) {
        findings.push({
          test: "form-error-handling", type: "error",
          wcagCriteria: ["3.3.1"], wcagLevel: "A",
          selector: errorState.fieldsWithNoErrorLink[0] ?? form.selector,
          context: `fields missing aria-describedby error link: [${errorState.fieldsWithNoErrorLink.join(", ")}]`,
          message: `${errorState.fieldsWithNoErrorLink.length} field(s) marked aria-invalid="true" have no aria-describedby pointing to an error message — errors must indicate which field has the problem (WCAG 3.3.1)`,
          impact: "serious",
        });
      }

      // 3.3.3: Pattern/type fields with generic error messages
      for (const field of errorState.patternFieldsWithoutSuggestion) {
        findings.push({
          test: "form-error-handling", type: "warning",
          wcagCriteria: ["3.3.3"], wcagLevel: "AA",
          selector: field.sel,
          context: `inputType="${field.inputType}", errorText="${field.errorText}"`,
          message: `Input of type "${field.inputType}" shows an error without a format suggestion — describe the expected format (e.g., "naam@voorbeeld.nl") (WCAG 3.3.3)`,
          impact: "moderate",
        });
      }

      // 3.3.4: Sensitive form that navigated away without visible review step
      if (navigated && form.isSensitive) {
        findings.push({
          test: "form-error-handling", type: "warning",
          wcagCriteria: ["3.3.4"], wcagLevel: "AA",
          selector: form.selector,
          context: `sensitive form submitted and navigated, keyword="${form.sensitiveKeyword}"`,
          message: `Sensitive form ("${form.sensitiveKeyword}") completed without a visible review/confirmation step — users must be able to review, correct, or cancel before the action is finalized (WCAG 3.3.4)`,
          impact: "moderate",
        });
      }
    }

    // 3.3.1: Required fields with red-only border (no programmatic error text)
    const colorOnlyErrors = await page.evaluate(() => {
      const issues: Array<{ sel: string; tag: string }> = [];
      const isReddish = (c: string) => {
        const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(c);
        if (!m) return false;
        return parseInt(m[1] ?? "0", 10) > 150 && parseInt(m[2] ?? "0", 10) < 100 && parseInt(m[3] ?? "0", 10) < 100;
      };
      for (const el of document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea")) {
        const h = el as HTMLElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (!h.hasAttribute("required") && h.getAttribute("aria-required") !== "true") continue;
        const s = window.getComputedStyle(h);
        if (
          (isReddish(s.borderColor) || isReddish(s.outlineColor)) &&
          h.getAttribute("aria-invalid") !== "true" &&
          !h.getAttribute("aria-describedby")
        ) {
          const id = h.id ? `#${h.id}` : "";
          const cls = h.className && typeof h.className === "string"
            ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
          issues.push({ sel: id || h.tagName.toLowerCase() + cls, tag: h.tagName.toLowerCase() });
        }
      }
      return issues;
    });

    for (const field of colorOnlyErrors) {
      findings.push({
        test: "form-error-handling", type: "error",
        wcagCriteria: ["3.3.1"], wcagLevel: "A",
        selector: field.sel,
        context: "red border/outline without aria-invalid or aria-describedby",
        message: `Required <${field.tag}> uses only color (red border) to indicate error state — errors must not rely on color alone; add aria-invalid and a text-based error message (WCAG 3.3.1, 1.4.1)`,
        impact: "serious",
      });
    }

    return { test: "form-error-handling", findings, durationMs: Math.round(performance.now() - start), error: null };
  } catch (err) {
    return { test: "form-error-handling", findings, durationMs: Math.round(performance.now() - start), error: err instanceof Error ? err.message : String(err) };
  }
}

async function collectForms(page: Page): Promise<FormInfo[]> {
  return page.evaluate(() => {
    const sensitivePattern = /betalen|payment|pay|delete|verwijderen|bestellen|order|confirm|bevestig|purchase|kopen/i;
    const results: FormInfo[] = [];

    document.querySelectorAll("form").forEach((form, index) => {
      const rect = form.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const id = form.id ? `#${form.id}` : `form:nth-of-type(${index + 1})`;
      const submitEl = form.querySelector("button[type='submit'], input[type='submit'], button:not([type])") as HTMLElement | null;
      const submitId = submitEl?.id ? `#${submitEl.id}` : null;
      const submitCls = submitEl?.className && typeof submitEl.className === "string"
        ? "." + submitEl.className.trim().split(/\s+/).slice(0, 2).join(".") : "";

      let requiredCount = 0;
      for (const f of form.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea")) {
        const fe = f as HTMLElement;
        const r = fe.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (fe.hasAttribute("required") || fe.getAttribute("aria-required") === "true") requiredCount++;
      }

      const formText = form.textContent ?? "";
      const formAction = form.getAttribute("action") ?? "";
      const isSensitive = sensitivePattern.test(formText) || sensitivePattern.test(formAction);
      const sensitiveMatch = sensitivePattern.exec(formText) ?? sensitivePattern.exec(formAction);

      results.push({
        selector: id,
        hasSubmit: submitEl !== null,
        submitSel: submitEl ? (submitId || submitEl.tagName.toLowerCase() + submitCls) : null,
        requiredCount,
        isSensitive,
        sensitiveKeyword: sensitiveMatch ? sensitiveMatch[0] : "",
        hasConfirmCheckbox: form.querySelector("input[type='checkbox']") !== null,
      });
    });

    return results;
  });
}

async function inspectErrors(page: Page, formSelector: string): Promise<ErrorState> {
  return page.evaluate((sel) => {
    const state: ErrorState = {
      hasAriaInvalid: false,
      hasRoleAlert: false,
      hasErrorClass: false,
      fieldsWithNoErrorLink: [],
      patternFieldsWithoutSuggestion: [],
    };

    const form = document.querySelector(sel) as HTMLFormElement | null;
    if (!form) return state;

    const invalidFields = form.querySelectorAll("[aria-invalid='true']");
    state.hasAriaInvalid = invalidFields.length > 0;

    for (const el of document.querySelectorAll("[role='alert']")) {
      if ((el as HTMLElement).textContent?.trim()) { state.hasRoleAlert = true; break; }
    }

    for (const el of form.querySelectorAll(".error, .form-error, .field-error, [class*='error'], [class*='invalid']")) {
      if ((el as HTMLElement).textContent?.trim()) { state.hasErrorClass = true; break; }
    }

    for (const field of invalidFields) {
      const h = field as HTMLElement;
      const describedby = h.getAttribute("aria-describedby");
      if (describedby) {
        const desc = document.getElementById(describedby);
        if (!desc || !(desc.textContent?.trim())) {
          state.fieldsWithNoErrorLink.push(h.id ? `#${h.id}` : h.tagName.toLowerCase());
        }
      } else {
        state.fieldsWithNoErrorLink.push(h.id ? `#${h.id}` : h.tagName.toLowerCase());
      }
    }

    for (const field of form.querySelectorAll(
      "input[type='email'][aria-invalid='true'], input[type='url'][aria-invalid='true'], input[type='tel'][aria-invalid='true'], input[pattern][aria-invalid='true']"
    )) {
      const h = field as HTMLInputElement;
      let errorText = "";
      const db = h.getAttribute("aria-describedby");
      if (db) errorText = document.getElementById(db)?.textContent?.trim() ?? "";
      if (!errorText) {
        const parent = h.parentElement;
        if (parent) {
          for (const sib of parent.children) {
            const s = sib as HTMLElement;
            if (s === h) continue;
            const t = s.textContent?.trim() ?? "";
            if (t && /error|ongeldig|invalid|vereist|required/i.test(s.className + t)) { errorText = t; break; }
          }
        }
      }
      const hasFormatHint = /bijv|voorbeeld|example|format|e\.g\.|zoals|@|http|tel:|0[0-9]/i.test(errorText);
      const isGeneric = /^(invalid|ongeldig|fout|error|verkeerd)\.?$/i.test(errorText.trim());
      if (errorText && (isGeneric || !hasFormatHint)) {
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        state.patternFieldsWithoutSuggestion.push({ sel: id || "input" + cls, inputType: h.type, errorText: errorText.slice(0, 80) });
      }
    }

    return state;
  }, formSelector);
}
