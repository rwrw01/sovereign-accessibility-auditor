import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Queue } from "bullmq";
import type { ScanJobPayload, EngineName } from "@saa/shared";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "169.254.169.254",
]);

function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(hostname)) return false;
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) return false;
    if (/^(fc|fd|fe80)/i.test(hostname)) return false;
    if (/^0\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");

const scanQueue = new Queue<ScanJobPayload>("l1-scan", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  },
});

const scanRequestSchema = z.object({
  url: z.string().url().max(2048),
  viewport: z
    .object({
      name: z.string().max(64),
      w: z.number().int().min(320).max(3840),
      h: z.number().int().min(240).max(2160),
    })
    .optional()
    .default({ name: "desktop", w: 1280, h: 1024 }),
  engines: z
    .array(z.enum(["axe-core", "ibm-aat"]))
    .optional()
    .default(["axe-core", "ibm-aat"] as EngineName[]),
});

const uuidSchema = z.string().uuid();

export async function scanRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { auditId: string };
    Body: z.infer<typeof scanRequestSchema>;
  }>("/api/v1/audits/:auditId/scan", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const body = scanRequestSchema.parse(request.body);

    if (!isUrlSafe(body.url)) {
      return reply.status(400).send({ error: "URL is niet toegestaan (intern/privé adres)" });
    }

    const scanId = crypto.randomUUID();

    const payload: ScanJobPayload = {
      scanId,
      auditId,
      url: body.url,
      viewport: body.viewport,
      engines: body.engines,
    };

    const job = await scanQueue.add(`scan-${scanId}`, payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    return reply.status(202).send({
      scanId,
      jobId: job.id,
      status: "wachtend",
      message: "Scan is in de wachtrij geplaatst",
    });
  });

  app.get<{
    Params: { auditId: string; scanId: string };
  }>("/api/v1/audits/:auditId/scans/:scanId", async (request, reply) => {
    const auditId = uuidSchema.parse(request.params.auditId);
    const scanId = uuidSchema.parse(request.params.scanId);

    const jobs = await scanQueue.getJobs(["completed", "failed", "active", "waiting"]);
    const job = jobs.find((j) => j.data.scanId === scanId && j.data.auditId === auditId);

    if (!job) {
      return reply.status(404).send({ error: "Scan niet gevonden" });
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
