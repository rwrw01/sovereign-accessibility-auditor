import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { L4ScanJobPayload } from "@saa/shared";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const l4Queue = new Queue<L4ScanJobPayload>("l4-a11y-tree", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const l4ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  desktopViewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "desktop", w: 1280, h: 1024 }),
  mobileViewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "mobile", w: 375, h: 667 }),
});

const uuidSchema = z.string().uuid();

export async function a11yTreeRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof l4ScanRequestSchema>;
  }>("/api/v1/audits/:auditId/a11y-tree", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = l4ScanRequestSchema.parse(request.body);

    const scanId = crypto.randomUUID();

    const payload: L4ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      desktopViewport: body.desktopViewport,
      mobileViewport: body.mobileViewport,
    };

    const job = await l4Queue.add(`l4-scan-${scanId}`, payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "A11y tree diff scan is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/a11y-tree/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await l4Queue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "A11y tree scan niet gevonden" });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === "completed") {
      return reply.send({
        scanId,
        status: "voltooid",
        progress,
        result: job.returnvalue,
      });
    }

    if (state === "failed") {
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
