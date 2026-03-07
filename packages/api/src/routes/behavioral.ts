import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { L3ScanJobPayload, BehavioralTest } from "@saa/shared";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const l3Queue = new Queue<L3ScanJobPayload>("l3-behavioral", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const ALL_TESTS: BehavioralTest[] = [
  "keyboard-nav",
  "focus-trap",
  "focus-visible",
  "hover-focus",
  "skip-link",
];

const l3ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "desktop", w: 1280, h: 1024 }),
  tests: z
    .array(z.enum(["keyboard-nav", "focus-trap", "focus-visible", "hover-focus", "skip-link"]))
    .optional()
    .default(ALL_TESTS),
});

const uuidSchema = z.string().uuid();

export async function behavioralRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof l3ScanRequestSchema>;
  }>("/api/v1/audits/:auditId/behavioral", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = l3ScanRequestSchema.parse(request.body);

    const scanId = crypto.randomUUID();

    const payload: L3ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      viewport: body.viewport,
      tests: body.tests,
    };

    const job = await l3Queue.add(`l3-scan-${scanId}`, payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "Behavioral scan is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/behavioral/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await l3Queue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "Behavioral scan niet gevonden" });
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
