import type { Page } from "playwright";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import type { EngineResult, Finding, IssueType, WcagLevel } from "@saa/shared";

let aceEngineScript: string | null = null;

function getEngineScript(): string {
  if (aceEngineScript) return aceEngineScript;

  const require = createRequire(import.meta.url);
  const enginePath = require.resolve("accessibility-checker-engine/ace.js");
  aceEngineScript = fs.readFileSync(enginePath, "utf-8");
  return aceEngineScript;
}

interface AceViolation {
  ruleId: string;
  path: { dom: string };
  snippet: string;
  message: string;
  value: [string, string];
  reasonId: string;
}

interface AceResult {
  results: AceViolation[];
}

const ACE_LEVEL_MAP: Record<string, IssueType> = {
  VIOLATION: "error",
  POTENTIAL_VIOLATION: "warning",
  RECOMMENDATION: "notice",
  MANUAL: "notice",
};

const ACE_WCAG_MAP: Record<string, { criteria: string[]; level: WcagLevel }> = {
  "WCAG20_Html_HasLang": { criteria: ["3.1.1"], level: "A" },
  "WCAG20_Img_HasAlt": { criteria: ["1.1.1"], level: "A" },
  "WCAG20_A_HasText": { criteria: ["2.4.4", "4.1.2"], level: "A" },
  "WCAG20_Input_ExplicitLabel": { criteria: ["1.3.1", "4.1.2"], level: "A" },
  "WCAG20_Table_Structure": { criteria: ["1.3.1"], level: "A" },
  "Rpt_Aria_ValidIdRef": { criteria: ["4.1.2"], level: "A" },
  "Rpt_Aria_RequiredProperties": { criteria: ["4.1.2"], level: "A" },
  "IBMA_Color_Contrast_WCAG2AA": { criteria: ["1.4.3"], level: "AA" },
  "IBMA_Color_Contrast_WCAG2AA_PV": { criteria: ["1.4.3"], level: "AA" },
  "WCAG20_Label_RefValid": { criteria: ["1.3.1"], level: "A" },
  "Rpt_Aria_ValidRole": { criteria: ["4.1.2"], level: "A" },
  "WCAG20_Frame_HasTitle": { criteria: ["2.4.1"], level: "A" },
  "WCAG20_Doc_HasTitle": { criteria: ["2.4.2"], level: "A" },
  "WCAG20_Body_FirstASkips_Native_Host_Sematics": { criteria: ["2.4.1"], level: "A" },
  "Rpt_Aria_OrphanedContent_Native_Host_Sematics": { criteria: ["1.3.1"], level: "A" },
  "aria_semantics_role": { criteria: ["4.1.2"], level: "A" },
  "aria_hidden_focus_misuse": { criteria: ["4.1.2", "1.3.1"], level: "A" },
  "element_lang_valid": { criteria: ["3.1.1"], level: "A" },
  "input_label_exists": { criteria: ["1.3.1", "4.1.2"], level: "A" },
  "img_alt_valid": { criteria: ["1.1.1"], level: "A" },
};

function mapIbmFinding(violation: AceViolation): Finding {
  const [category] = violation.value;
  const mapped = ACE_WCAG_MAP[violation.ruleId];

  return {
    ruleId: violation.ruleId,
    actRuleId: null,
    type: ACE_LEVEL_MAP[category] ?? "notice",
    wcagCriteria: mapped?.criteria ?? [],
    wcagLevel: mapped?.level ?? null,
    selector: violation.path.dom,
    context: violation.snippet.slice(0, 512),
    message: violation.message,
    engine: "ibm-aat",
    impact: category === "VIOLATION" ? "serious" : "moderate",
  };
}

export async function runIbm(page: Page): Promise<EngineResult> {
  const start = performance.now();

  try {
    const script = getEngineScript();
    await page.evaluate(script);

    const rawResults = await page.evaluate((): Promise<AceResult> => {
      return new Promise((resolve, reject) => {
        const g = globalThis as Record<string, any>;
        const checker = new g["ace"].Checker();
        const doc = g["document"] as unknown;
        checker.check(doc, ["WCAG_2_2"]).then(
          (report: AceResult) => resolve(report),
          (err: Error) => reject(err),
        );
      });
    });

    const findings: Finding[] = rawResults.results
      .filter((r) => r.value[1] !== "PASS")
      .map(mapIbmFinding);

    return {
      engine: "ibm-aat",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      engine: "ibm-aat",
      findings: [],
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
