import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { L2ScanJobPayload, VisualScenario } from "@saa/shared";
import { createScanRow, completeScanRow, failScanRow } from "./scan-persistence.js";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const l2Queue = new Queue<L2ScanJobPayload>("l2-visual-regression", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const ALL_SCENARIOS: VisualScenario[] = ["reflow", "zoom-200", "text-spacing"];

const l2ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "desktop", w: 1280, h: 1024 }),
  scenarios: z
    .array(z.enum(["reflow", "zoom-200", "text-spacing"]))
    .optional()
    .default(ALL_SCENARIOS),
});

const uuidSchema = z.string().uuid();

export async function visualRegressionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof l2ScanRequestSchema>;
  }>("/api/v1/audits/:auditId/visual-regression", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = l2ScanRequestSchema.parse(request.body);

    const scanId = crypto.randomUUID();

    const payload: L2ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      viewport: body.viewport,
      scenarios: body.scenarios,
    };

    const job = await l2Queue.add(`l2-scan-${scanId}`, payload, {
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
        scannerLaag: "L2",
      });
    } catch (err) {
      app.log.error({ err, scanId }, "Failed to persist scan row to PostgreSQL");
    }

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "Visual regression scan is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/visual-regression/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await l2Queue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "Visual regression scan niet gevonden" });
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
