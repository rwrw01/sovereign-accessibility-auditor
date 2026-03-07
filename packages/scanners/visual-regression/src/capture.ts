import type { Page } from "playwright";

export interface CaptureOptions {
  fullPage: boolean;
}

const DEFAULT_OPTIONS: CaptureOptions = {
  fullPage: true,
};

export async function captureScreenshot(
  page: Page,
  options: Partial<CaptureOptions> = {},
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const buffer = await page.screenshot({
    fullPage: opts.fullPage,
    type: "png",
  });
  return Buffer.from(buffer);
}

export async function captureWithViewport(
  page: Page,
  width: number,
  height: number,
): Promise<Buffer> {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  return captureScreenshot(page);
}
