import type { Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import type { EngineResult, Finding, WcagLevel } from "@saa/shared";

const AXE_IMPACT_MAP = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
} as const;

function extractWcagCriteria(tags: string[]): string[] {
  return tags
    .filter((t) => /^wcag\d{3,4}$/.test(t))
    .map((t) => {
      const digits = t.replace("wcag", "");
      if (digits.length === 3) {
        return `${digits[0]}.${digits[1]}.${digits[2]}`;
      }
      return `${digits[0]}.${digits.slice(1, 3)}.${digits[3]}`;
    });
}

function extractWcagLevel(tags: string[]): WcagLevel | null {
  if (tags.includes("wcag2aaa")) return "AAA";
  if (tags.includes("wcag2aa") || tags.includes("wcag22aa")) return "AA";
  if (tags.includes("wcag2a") || tags.includes("wcag22a")) return "A";
  return null;
}

function extractActRuleId(tags: string[]): string | null {
  const actTag = tags.find((t) => /^act-/.test(t));
  return actTag ? actTag.replace("act-", "") : null;
}

export async function runAxe(page: Page): Promise<EngineResult> {
  const start = performance.now();

  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22a", "wcag22aa", "best-practice"])
      .analyze();

    const findings: Finding[] = [];

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        findings.push({
          ruleId: violation.id,
          actRuleId: extractActRuleId(violation.tags),
          type: "error",
          wcagCriteria: extractWcagCriteria(violation.tags),
          wcagLevel: extractWcagLevel(violation.tags),
          selector: node.target.join(" > "),
          context: node.html.slice(0, 512),
          message: `${violation.help} (${violation.helpUrl})`,
          engine: "axe-core",
          impact: node.impact
            ? AXE_IMPACT_MAP[node.impact as keyof typeof AXE_IMPACT_MAP] ?? null
            : null,
        });
      }
    }

    for (const incomplete of results.incomplete) {
      for (const node of incomplete.nodes) {
        findings.push({
          ruleId: incomplete.id,
          actRuleId: extractActRuleId(incomplete.tags),
          type: "warning",
          wcagCriteria: extractWcagCriteria(incomplete.tags),
          wcagLevel: extractWcagLevel(incomplete.tags),
          selector: node.target.join(" > "),
          context: node.html.slice(0, 512),
          message: `[Needs review] ${incomplete.help}`,
          engine: "axe-core",
          impact: node.impact
            ? AXE_IMPACT_MAP[node.impact as keyof typeof AXE_IMPACT_MAP] ?? null
            : null,
        });
      }
    }

    return {
      engine: "axe-core",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      engine: "axe-core",
      findings: [],
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
