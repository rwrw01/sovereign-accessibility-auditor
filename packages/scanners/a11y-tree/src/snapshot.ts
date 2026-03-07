import type { Page } from "playwright";
import type { A11yTreeNode } from "@saa/shared";

// ── A11y Tree Snapshot ──
// Capture the accessibility tree using CDP (Chrome DevTools Protocol).
// page.accessibility.snapshot() was removed in Playwright 1.58+.
// We use the Accessibility.getFullAXTree CDP method instead.

interface CdpAXNode {
  nodeId: string;
  role: { type: string; value: string };
  name?: { type: string; value: string };
  children?: CdpAXNode[];
  properties?: Array<{ name: string; value: { type: string; value: unknown } }>;
  childIds?: string[];
  ignored?: boolean;
}

export async function captureA11yTree(page: Page): Promise<A11yTreeNode> {
  const tree = await getCdpAccessibilityTree(page, false);
  return tree;
}

export async function captureInterestingA11yTree(page: Page): Promise<A11yTreeNode> {
  const tree = await getCdpAccessibilityTree(page, true);
  return tree;
}

async function getCdpAccessibilityTree(page: Page, interestingOnly: boolean): Promise<A11yTreeNode> {
  const cdp = await page.context().newCDPSession(page);

  try {
    const result = await cdp.send("Accessibility.getFullAXTree") as { nodes: CdpAXNode[] };
    const nodes = result.nodes;

    if (!nodes || nodes.length === 0) {
      return { role: "WebArea", name: "", children: [] };
    }

    // Build a tree from the flat list of nodes
    const nodeMap = new Map<string, CdpAXNode>();
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }

    const rootNode = nodes[0]!;
    return buildTree(rootNode, nodeMap, interestingOnly);
  } finally {
    await cdp.detach();
  }
}

const IGNORED_ROLES = new Set([
  "none", "presentation", "generic", "InlineTextBox",
  "LineBreak", "StaticText",
]);

function buildTree(
  node: CdpAXNode,
  nodeMap: Map<string, CdpAXNode>,
  interestingOnly: boolean,
): A11yTreeNode {
  const role = node.role?.value ?? "unknown";
  const name = node.name?.value ?? "";

  const result: A11yTreeNode = { role, name };

  // Extract properties
  if (node.properties) {
    for (const prop of node.properties) {
      switch (prop.name) {
        case "level":
          result.level = prop.value.value as number;
          break;
        case "checked":
          result.checked = prop.value.value as boolean | "mixed";
          break;
        case "disabled":
          result.disabled = prop.value.value as boolean;
          break;
        case "expanded":
          result.expanded = prop.value.value as boolean;
          break;
        case "selected":
          result.selected = prop.value.value as boolean;
          break;
      }
    }
  }

  // Build children
  const childIds = node.childIds ?? [];
  const children: A11yTreeNode[] = [];

  for (const childId of childIds) {
    const childNode = nodeMap.get(childId);
    if (!childNode) continue;

    const childRole = childNode.role?.value ?? "unknown";

    // Ignored nodes and uninteresting roles: skip but include their descendants
    if (childNode.ignored || (interestingOnly && IGNORED_ROLES.has(childRole))) {
      const descendants = collectVisibleDescendants(childNode, nodeMap, interestingOnly);
      children.push(...descendants);
      continue;
    }

    children.push(buildTree(childNode, nodeMap, interestingOnly));
  }

  if (children.length > 0) {
    result.children = children;
  }

  return result;
}

function collectVisibleDescendants(
  node: CdpAXNode,
  nodeMap: Map<string, CdpAXNode>,
  interestingOnly: boolean,
): A11yTreeNode[] {
  const results: A11yTreeNode[] = [];
  const childIds = node.childIds ?? [];

  for (const childId of childIds) {
    const childNode = nodeMap.get(childId);
    if (!childNode) continue;

    const childRole = childNode.role?.value ?? "unknown";

    if (childNode.ignored || (interestingOnly && IGNORED_ROLES.has(childRole))) {
      results.push(...collectVisibleDescendants(childNode, nodeMap, interestingOnly));
    } else {
      results.push(buildTree(childNode, nodeMap, interestingOnly));
    }
  }

  return results;
}

export function countNodes(node: A11yTreeNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

export function findNodesByRole(node: A11yTreeNode, role: string): A11yTreeNode[] {
  const results: A11yTreeNode[] = [];

  if (node.role === role) {
    results.push(node);
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(...findNodesByRole(child, role));
    }
  }

  return results;
}
