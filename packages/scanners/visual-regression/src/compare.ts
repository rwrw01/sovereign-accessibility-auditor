import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface CompareResult {
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImage: Buffer | null;
}

export function compareScreenshots(
  baselinePng: Buffer,
  comparisonPng: Buffer,
): CompareResult {
  const baseline = PNG.sync.read(baselinePng);
  const comparison = PNG.sync.read(comparisonPng);

  const width = Math.max(baseline.width, comparison.width);
  const height = Math.max(baseline.height, comparison.height);

  const normalizedBaseline = normalizeToSize(baseline, width, height);
  const normalizedComparison = normalizeToSize(comparison, width, height);

  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    normalizedBaseline.data,
    normalizedComparison.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, includeAA: false },
  );

  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;

  return {
    diffPercentage: Math.round(diffPercentage * 100) / 100,
    diffPixels,
    totalPixels,
    diffImage: PNG.sync.write(diff),
  };
}

function normalizeToSize(png: PNG, targetWidth: number, targetHeight: number): PNG {
  if (png.width === targetWidth && png.height === targetHeight) {
    return png;
  }

  const normalized = new PNG({ width: targetWidth, height: targetHeight, fill: true });

  // Fill with white background (RGBA)
  for (let i = 0; i < normalized.data.length; i += 4) {
    normalized.data[i] = 255;
    normalized.data[i + 1] = 255;
    normalized.data[i + 2] = 255;
    normalized.data[i + 3] = 255;
  }

  // Copy original pixels
  for (let y = 0; y < Math.min(png.height, targetHeight); y++) {
    for (let x = 0; x < Math.min(png.width, targetWidth); x++) {
      const srcIdx = (y * png.width + x) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      normalized.data[dstIdx] = png.data[srcIdx]!;
      normalized.data[dstIdx + 1] = png.data[srcIdx + 1]!;
      normalized.data[dstIdx + 2] = png.data[srcIdx + 2]!;
      normalized.data[dstIdx + 3] = png.data[srcIdx + 3]!;
    }
  }

  return normalized;
}
