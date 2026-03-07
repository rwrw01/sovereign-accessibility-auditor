import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { L7ScanJobPayload, CognitiveCheck } from "@saa/shared";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const l7Queue = new Queue<L7ScanJobPayload>("l7-cognitive", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const ALL_CHECKS: CognitiveCheck[] = [
  "readability",
  "jargon",
  "llm-analysis",
];

const l7ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "desktop", w: 1280, h: 1024 }),
  checks: z
    .array(z.enum(["readability", "jargon", "llm-analysis"]))
    .optional()
    .default(ALL_CHECKS),
  ollamaUrl: z.string().url().optional(),
});

const uuidSchema = z.string().uuid();

export async function cognitiveRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof l7ScanRequestSchema>;
  }>("/api/v1/audits/:auditId/cognitive", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = l7ScanRequestSchema.parse(request.body);

    const scanId = crypto.randomUUID();

    const payload: L7ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      viewport: body.viewport,
      checks: body.checks,
      ollamaUrl: body.ollamaUrl,
    };

    const job = await l7Queue.add(`l7-scan-${scanId}`, payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "Cognitieve analyse is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/cognitive/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await l7Queue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "Cognitieve scan niet gevonden" });
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
