import type { A11yTreeNode, A11yTreeDiffFinding } from "@saa/shared";
import { findNodesByRole, countNodes } from "./snapshot.js";

// ── A11y Tree Diff ──
// Compare two accessibility trees (e.g., desktop vs mobile).
// Detect missing roles, landmarks, and structural changes.

const LANDMARK_ROLES = [
  "banner", "navigation", "main", "complementary",
  "contentinfo", "search", "form", "region",
];

const IMPORTANT_ROLES = [
  "heading", "link", "button", "textbox", "checkbox",
  "radio", "combobox", "listbox", "table", "img",
  ...LANDMARK_ROLES,
];

export function diffA11yTrees(
  baseTree: A11yTreeNode,
  comparisonTree: A11yTreeNode,
  baseViewportName: string,
  comparisonViewportName: string,
): A11yTreeDiffFinding[] {
  const findings: A11yTreeDiffFinding[] = [];

  // Check for missing landmarks in comparison viewport
  for (const role of LANDMARK_ROLES) {
    const baseNodes = findNodesByRole(baseTree, role);
    const compNodes = findNodesByRole(comparisonTree, role);

    if (baseNodes.length > 0 && compNodes.length === 0) {
      findings.push({
        type: "error",
        wcagCriteria: ["1.3.1", "4.1.2"],
        wcagLevel: "A",
        diffType: "missing-landmark",
        role,
        name: baseNodes[0]?.name ?? "",
        context: `Present in ${baseViewportName} (${baseNodes.length}x), absent in ${comparisonViewportName}`,
        message: `Landmark role="${role}" is present in ${baseViewportName} but missing in ${comparisonViewportName} viewport`,
        impact: "serious",
        viewport: comparisonViewportName,
      });
    }

    // Fewer landmarks might also be an issue
    if (baseNodes.length > compNodes.length && compNodes.length > 0) {
      findings.push({
        type: "warning",
        wcagCriteria: ["1.3.1"],
        wcagLevel: "A",
        diffType: "structural-change",
        role,
        name: "",
        context: `${baseViewportName}: ${baseNodes.length}x, ${comparisonViewportName}: ${compNodes.length}x`,
        message: `Fewer "${role}" landmarks in ${comparisonViewportName} (${compNodes.length}) than ${baseViewportName} (${baseNodes.length})`,
        impact: "moderate",
        viewport: comparisonViewportName,
      });
    }
  }

  // Check for missing important roles
  for (const role of IMPORTANT_ROLES) {
    if (LANDMARK_ROLES.includes(role)) continue; // Already checked above

    const baseNodes = findNodesByRole(baseTree, role);
    const compNodes = findNodesByRole(comparisonTree, role);

    // Only flag if significant content is missing (not just count differences)
    if (baseNodes.length > 0 && compNodes.length === 0) {
      findings.push({
        type: "warning",
        wcagCriteria: ["1.3.1"],
        wcagLevel: "A",
        diffType: "missing-role",
        role,
        name: baseNodes[0]?.name ?? "",
        context: `Present in ${baseViewportName} (${baseNodes.length}x), absent in ${comparisonViewportName}`,
        message: `Elements with role="${role}" are present in ${baseViewportName} but missing in ${comparisonViewportName}`,
        impact: "moderate",
        viewport: comparisonViewportName,
      });
    }
  }

  // Check for named elements that lose their accessible name
  const baseNamedNodes = collectNamedNodes(baseTree);
  const compNamedNodes = collectNamedNodes(comparisonTree);

  for (const [key, baseName] of baseNamedNodes) {
    const compName = compNamedNodes.get(key);
    if (compName !== undefined && compName === "" && baseName !== "") {
      findings.push({
        type: "error",
        wcagCriteria: ["4.1.2"],
        wcagLevel: "A",
        diffType: "missing-name",
        role: key.split(":")[0] ?? "unknown",
        name: baseName,
        context: `Named "${baseName}" in ${baseViewportName}, unnamed in ${comparisonViewportName}`,
        message: `Element (${key}) loses its accessible name in ${comparisonViewportName} viewport`,
        impact: "serious",
        viewport: comparisonViewportName,
      });
    }
  }

  // Significant node count difference
  const baseCount = countNodes(baseTree);
  const compCount = countNodes(comparisonTree);
  const ratio = compCount / Math.max(baseCount, 1);

  if (ratio < 0.5 && baseCount > 10) {
    findings.push({
      type: "warning",
      wcagCriteria: ["1.3.1"],
      wcagLevel: "A",
      diffType: "structural-change",
      role: "WebArea",
      name: "",
      context: `${baseViewportName}: ${baseCount} nodes, ${comparisonViewportName}: ${compCount} nodes (${Math.round(ratio * 100)}%)`,
      message: `Accessibility tree in ${comparisonViewportName} has significantly fewer nodes (${Math.round(ratio * 100)}% of ${baseViewportName}), content may be hidden`,
      impact: "moderate",
      viewport: comparisonViewportName,
    });
  }

  return findings;
}

function collectNamedNodes(node: A11yTreeNode, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  const key = `${node.role}:${prefix}`;

  if (node.name) {
    result.set(key, node.name);
  }

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]!;
      const childPrefix = `${prefix}/${node.role}[${i}]`;
      const childNodes = collectNamedNodes(child, childPrefix);
      for (const [k, v] of childNodes) {
        result.set(k, v);
      }
    }
  }

  return result;
}
