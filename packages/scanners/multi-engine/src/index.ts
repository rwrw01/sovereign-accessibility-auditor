export { runAxe } from "./engines/axe.js";
export { runIbm } from "./engines/ibm.js";
export { runScan, getBrowser, closeBrowser } from "./orchestrator.js";
export { deduplicateFindings } from "./dedup.js";
export { validateScanUrl } from "./url-validator.js";
export { createWorker } from "./worker.js";

export const SCANNER_NAME = "multi-engine";
export const SCANNER_VERSION = "0.1.0";
