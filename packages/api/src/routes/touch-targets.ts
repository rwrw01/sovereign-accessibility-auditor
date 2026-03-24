import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { L5ScanJobPayload } from "@saa/shared";
import { createScanRow, completeScanRow, failScanRow } from "./scan-persistence.js";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const l5Queue = new Queue<L5ScanJobPayload>("l5-touch-targets", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const l5ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "mobile", w: 375, h: 667 }),
  minTargetSize: z.number().int().min(20).max(100).optional().default(24),
});

const uuidSchema = z.string().uuid();

export async function touchTargetsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof l5ScanRequestSchema>;
  }>("/api/v1/audits/:auditId/touch-targets", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = l5ScanRequestSchema.parse(request.body);

    const scanId = crypto.randomUUID();

    const payload: L5ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      viewport: body.viewport,
      minTargetSize: body.minTargetSize,
    };

    const job = await l5Queue.add(`l5-scan-${scanId}`, payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    try {
      await createScanRow({
        scanId,
        auditId,
        url: body.url,
        viewport: body.viewport.name,
        scannerLaag: "L5",
      });
    } catch (err) {
      app.log.error({ err, scanId }, "Failed to persist scan row to PostgreSQL");
    }

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "Touch targets scan is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/touch-targets/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await l5Queue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "Touch targets scan niet gevonden" });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === "completed") {
      completeScanRow(scanId, job.returnvalue).catch((err: unknown) => {
        app.log.error({ err, scanId }, "Failed to persist completed scan result to PostgreSQL");
      });
      return reply.send({
        scanId,
        status: "voltooid",
        progress,
        result: job.returnvalue,
      });
    }

    if (state === "failed") {
      failScanRow(scanId, job.failedReason ?? "Onbekende fout").catch((err: unknown) => {
        app.log.error({ err, scanId }, "Failed to persist failed scan state to PostgreSQL");
      });
      return reply.send({
        scanId,
        status: "mislukt",
        progress,
        error: job.failedReason,
      });
    }

    return reply.send({
      scanId,
      status: state === "active" ? "actief" : "wachtend",
      progress,
    });
  });
}
