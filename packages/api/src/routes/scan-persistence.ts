import { db } from "../db/connection.js";
import { scans } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Insert a scan row into PostgreSQL when a scan job is created.
 * This ensures the report endpoint can find completed scans.
 */
export async function createScanRow(opts: {
  scanId: string;
  auditId: string;
  url: string;
  viewport: string;
  scannerLaag: string;
}): Promise<void> {
  await db.insert(scans).values({
    id: opts.scanId,
    auditId: opts.auditId,
    url: opts.url,
    viewport: opts.viewport,
    scannerLaag: opts.scannerLaag,
    status: "wachtend",
    gestartOp: new Date(),
  }).onConflictDoNothing();
}

/**
 * Update a scan row when BullMQ reports completion.
 * Writes the full result JSONB so the report endpoint can read it.
 */
export async function completeScanRow(scanId: string, result: unknown): Promise<void> {
  await db.update(scans)
    .set({
      status: "voltooid",
      resultaat: JSON.stringify(result),
      voltooidOp: new Date(),
    })
    .where(eq(scans.id, scanId));
}

/**
 * Mark a scan row as failed.
 */
export async function failScanRow(scanId: string, error: string): Promise<void> {
  await db.update(scans)
    .set({
      status: "mislukt",
      foutmelding: error,
      voltooidOp: new Date(),
    })
    .where(eq(scans.id, scanId));
}
