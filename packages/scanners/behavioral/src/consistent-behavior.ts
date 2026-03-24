import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Consistent Behavior (WCAG 3.2.1, 3.2.2, 3.2.3, 3.2.4) ──

export async function runConsistentBehaviorTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    const urlBefore = page.url();

    // Intercept window.open to detect focus-triggered popups
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>)["__saa_popupOpened"] = false;
      const orig = window.open.bind(window);
      window.open = (...args) => {
        (window as unknown as Record<string, unknown>)["__saa_popupOpened"] = true;
        return orig(...args);
      };
    });

    const focusable = await page.evaluate(() => {
      const sel = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
      const result: Array<{ sel: string; tag: string }> = [];
      for (const el of document.querySelectorAll(sel)) {
        const h = el as HTMLElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || h.getAttribute("aria-hidden") === "true") continue;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        result.push({ sel: id || h.tagName.toLowerCase() + cls, tag: h.tagName.toLowerCase() });
      }
      return result.slice(0, 30);
    });

    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); document.body.focus(); });

    for (let i = 0; i < Math.min(focusable.length, 30); i++) {
      await page.keyboard.press("Tab");
      const urlNow = page.url();
      if (urlNow !== urlBefore) {
        findings.push({
          test: "consistent-behavior", type: "error",
          wcagCriteria: ["3.2.1"], wcagLevel: "A",
          selector: focusable[i]?.sel ?? "unknown",
          context: `URL changed from "${urlBefore}" to "${urlNow}" on focus`,
          message: `Page URL changed when focusing <${focusable[i]?.tag ?? "unknown"}> — context change on focus not allowed (WCAG 3.2.1)`,
          impact: "critical",
        });
        break;
      }
      const popup = await page.evaluate(() => (window as unknown as Record<string, unknown>)["__saa_popupOpened"] as boolean);
      if (popup) {
        findings.push({
          test: "consistent-behavior", type: "error",
          wcagCriteria: ["3.2.1"], wcagLevel: "A",
          selector: focusable[i]?.sel ?? "unknown",
          context: "window.open() called on focus event",
          message: `New window opened on focus of <${focusable[i]?.tag ?? "unknown"}> — context change on focus not allowed (WCAG 3.2.1)`,
          impact: "critical",
        });
        await page.evaluate(() => { (window as unknown as Record<string, unknown>)["__saa_popupOpened"] = false; });
      }
    }

    // 3.2.2: onchange handlers on select/checkbox/radio that trigger nav/submit
    const onchangeIssues = await page.evaluate(() => {
      const navPattern = /location\s*[.=]|navigate\s*\(|submit\s*\(|\.submit\b|window\.location/i;
      const issues: Array<{ sel: string; tag: string; src: string }> = [];
      const allFields = [
        ...document.querySelectorAll("select"),
        ...document.querySelectorAll("input[type='checkbox'], input[type='radio']"),
      ] as HTMLElement[];
      for (const el of allFields) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const oc = el.getAttribute("onchange") ?? "";
        if (!navPattern.test(oc)) continue;
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string"
          ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        issues.push({ sel: id || el.tagName.toLowerCase() + cls, tag: el.tagName.toLowerCase(), src: oc.slice(0, 100) });
      }
      return issues;
    });

    for (const issue of onchangeIssues) {
      findings.push({
        test: "consistent-behavior", type: "error",
        wcagCriteria: ["3.2.2"], wcagLevel: "A",
        selector: issue.sel,
        context: `onchange="${issue.src}"`,
        message: `<${issue.tag}> has an onchange handler that triggers navigation or form submission — changing a value must not cause unexpected context change (WCAG 3.2.2)`,
        impact: "serious",
      });
    }

    // 3.2.2: Programmatically change selects and detect URL change
    const selects = await page.evaluate(() => {
      const result: Array<{ sel: string; count: number }> = [];
      for (const el of document.querySelectorAll("select")) {
        const h = el as HTMLSelectElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        result.push({ sel: id || "select" + cls, count: h.options.length });
      }
      return result.slice(0, 5);
    });

    for (const s of selects) {
      if (s.count < 2) continue;
      const snap = page.url();
      try {
        await page.evaluate((css) => {
          const el = document.querySelector(css) as HTMLSelectElement | null;
          if (!el || el.options.length < 2) return;
          el.selectedIndex = el.selectedIndex === 0 ? 1 : 0;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, s.sel);
        await page.waitForTimeout(300);
      } catch { /* navigation may have thrown */ }
      if (page.url() !== snap) {
        findings.push({
          test: "consistent-behavior", type: "error",
          wcagCriteria: ["3.2.2"], wcagLevel: "A",
          selector: s.sel,
          context: `URL changed after <select> value change`,
          message: `Changing <select> value causes navigation — provide a submit button instead (WCAG 3.2.2)`,
          impact: "serious",
        });
        break;
      }
    }

    // 3.2.3: Consistent navigation — compare link order across nav blocks
    const navBlocks = await page.evaluate(() => {
      const blocks: Array<{ sel: string; links: string[] }> = [];
      for (const nav of document.querySelectorAll("nav, [role='navigation']")) {
        const h = nav as HTMLElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        const links = [...h.querySelectorAll("a[href]")]
          .map((a) => (a as HTMLElement).textContent?.trim().toLowerCase() ?? "")
          .filter((t) => t.length > 0);
        if (links.length >= 2) blocks.push({ sel: id || "nav" + cls, links });
      }
      return blocks;
    });

    for (let a = 0; a < navBlocks.length - 1; a++) {
      for (let b = a + 1; b < navBlocks.length; b++) {
        const bA = navBlocks[a]; const bB = navBlocks[b];
        if (!bA || !bB) continue;
        const setB = new Set(bB.links);
        const shared = bA.links.filter((l) => setB.has(l));
        if (shared.length < 3) continue;
        const setA = new Set(bA.links);
        const ordA = bA.links.filter((l) => setB.has(l));
        const ordB = bB.links.filter((l) => setA.has(l));
        if (!ordA.every((l, i) => l === ordB[i])) {
          findings.push({
            test: "consistent-behavior", type: "warning",
            wcagCriteria: ["3.2.3"], wcagLevel: "AA",
            selector: bA.sel,
            context: `Nav A: [${ordA.join(", ")}] — Nav B (${bB.sel}): [${ordB.join(", ")}]`,
            message: `Two nav blocks share ${shared.length} links but in different order — navigation must be presented consistently (WCAG 3.2.3)`,
            impact: "moderate",
          });
        }
      }
    }

    // 3.2.4: Consistent identification — same-function elements must have consistent labels
    const idIssues = await page.evaluate(() => {
      const issues: Array<{ sel: string; role: string; labels: string[] }> = [];

      // Multiple search inputs with different labels
      const searchSel = "input[type='search'], [role='search'] input, input[name*='search' i], input[placeholder*='search' i], input[placeholder*='zoek' i]";
      const searchEls = [...document.querySelectorAll(searchSel)] as HTMLInputElement[];
      const visibleSearch = searchEls.filter((e) => {
        const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      });
      if (visibleSearch.length >= 2) {
        const labels = visibleSearch.map((e) =>
          (e.getAttribute("aria-label") ?? e.getAttribute("placeholder") ?? "").trim().toLowerCase()
        );
        if (new Set(labels.filter((l) => l.length > 0)).size > 1) {
          issues.push({ sel: "input[type='search']", role: "search input", labels });
        }
      }

      // Login links with inconsistent text
      const loginLinks = [...document.querySelectorAll("a[href]")]
        .filter((a) => /login|log in|inloggen|sign in|aanmelden/i.test((a as HTMLElement).textContent?.trim() ?? ""))
        .filter((a) => { const r = (a as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (loginLinks.length >= 2) {
        const texts = loginLinks.map((a) => (a as HTMLElement).textContent?.trim().toLowerCase() ?? "");
        if (new Set(texts).size > 1) {
          issues.push({ sel: "a[href]", role: "login link", labels: texts });
        }
      }

      return issues;
    });

    for (const issue of idIssues) {
      findings.push({
        test: "consistent-behavior", type: "warning",
        wcagCriteria: ["3.2.4"], wcagLevel: "AA",
        selector: issue.sel,
        context: `Labels: [${issue.labels.join(", ")}]`,
        message: `Multiple ${issue.role} elements have inconsistent labels — elements with the same function must be identified consistently (WCAG 3.2.4)`,
        impact: "moderate",
      });
    }

    return { test: "consistent-behavior", findings, durationMs: Math.round(performance.now() - start), error: null };
  } catch (err) {
    return { test: "consistent-behavior", findings, durationMs: Math.round(performance.now() - start), error: err instanceof Error ? err.message : String(err) };
  }
}
