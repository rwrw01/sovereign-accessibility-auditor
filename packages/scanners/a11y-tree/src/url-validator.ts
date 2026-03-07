import { z } from "zod";

const BLOCKED_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

const urlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((u) => {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  }, "Only http and https protocols are allowed");

export function validateScanUrl(raw: string): URL {
  const validated = urlSchema.parse(raw);
  const url = new URL(validated);

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`SSRF blocked: hostname "${hostname}" is not allowed`);
  }

  for (const range of BLOCKED_RANGES) {
    if (range.test(hostname)) {
      throw new Error(`SSRF blocked: hostname "${hostname}" resolves to a private range`);
    }
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error(`Non-standard port "${url.port}" is not allowed`);
  }

  return url;
}
