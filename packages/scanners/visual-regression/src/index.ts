export { runScan, getBrowser, closeBrowser } from "./orchestrator.js";
export { captureScreenshot, captureWithViewport } from "./capture.js";
export { compareScreenshots } from "./compare.js";
export { runScenario } from "./scenarios.js";
export { validateScanUrl } from "./url-validator.js";
export { createWorker } from "./worker.js";

export const SCANNER_NAME = "visual-regression";
export const SCANNER_VERSION = "0.1.0";
