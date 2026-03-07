const DYNAMIC_ID_PATTERNS = [
  /\[id="[a-f0-9-]{8,}"\]/g,
  /\[id="(ember|react|vue|ng|radix-)[^"]*"\]/g,
  /#[a-f0-9-]{8,}/g,
  /\[\d+\]/g,
  /:nth-child\(\d+\)/g,
];

export function normalizeSelector(selector: string): string {
  let normalized = selector.trim();

  for (const pattern of DYNAMIC_ID_PATTERNS) {
    normalized = normalized.replace(pattern, "[id=*dynamic*]");
  }

  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}
