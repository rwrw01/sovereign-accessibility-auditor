import type { DeduplicatedFinding, Finding } from "@saa/shared";
import { normalizeSelector } from "./selector-normalizer.js";

function findingKey(f: Finding): string {
  const selector = normalizeSelector(f.selector);
  const wcag = f.wcagCriteria.sort().join(",") || f.ruleId;
  return `${selector}::${wcag}`;
}

export function deduplicateFindings(allFindings: Finding[]): DeduplicatedFinding[] {
  const groups = new Map<string, Finding[]>();

  for (const finding of allFindings) {
    const key = findingKey(finding);
    const existing = groups.get(key);
    if (existing) {
      existing.push(finding);
    } else {
      groups.set(key, [finding]);
    }
  }

  const deduplicated: DeduplicatedFinding[] = [];

  for (const findings of groups.values()) {
    const primary = findings[0]!;
    const engines = [...new Set(findings.map((f) => f.engine))];
    const confidence = engines.length / 2; // max 1.0 when both engines agree

    deduplicated.push({
      ...primary,
      confirmedBy: engines,
      confidence: Math.min(confidence, 1.0),
    });
  }

  deduplicated.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const impactOrder: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    const aImpact = a.impact ? (impactOrder[a.impact] ?? 0) : 0;
    const bImpact = b.impact ? (impactOrder[b.impact] ?? 0) : 0;
    return bImpact - aImpact;
  });

  return deduplicated;
}
