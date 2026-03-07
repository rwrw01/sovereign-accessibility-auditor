import { Worker, type Job } from "bullmq";
import type { L4ScanJobPayload, L4ScanJobResult } from "@saa/shared";
import { runScan, closeBrowser } from "./orchestrator.js";

const REDIS_HOST = process.env["REDIS_HOST"] ?? "127.0.0.1";
const REDIS_PORT = Number(process.env["REDIS_PORT"] ?? "6379");
const CONCURRENCY = Number(process.env["SCAN_CONCURRENCY"] ?? "2");

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

async function processJob(job: Job<L4ScanJobPayload>): Promise<L4ScanJobResult> {
  const payload = job.data;

  await job.updateProgress(10);
  console.log(`[worker] Starting L4 a11y-tree scan ${payload.scanId} for ${payload.url}`);

  const result = await runScan(payload);

  await job.updateProgress(100);
  console.log(
    `[worker] Completed L4 scan ${payload.scanId}: ${result.findings.length} findings in ${result.totalDurationMs}ms`,
  );

  return result;
}

export function createWorker(): Worker<L4ScanJobPayload, L4ScanJobResult> {
  const worker = new Worker<L4ScanJobPayload, L4ScanJobResult>("l4-a11y-tree", processJob, {
    connection,
    concurrency: CONCURRENCY,
    limiter: {
      max: 4,
      duration: 10_000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err.message);
  });

  return worker;
}

async function shutdown(worker: Worker): Promise<void> {
  console.log("[worker] Shutting down...");
  await worker.close();
  await closeBrowser();
  process.exit(0);
}

if (process.argv[1]?.endsWith("worker.js") || process.argv[1]?.endsWith("worker.ts")) {
  const worker = createWorker();

  process.on("SIGINT", () => shutdown(worker));
  process.on("SIGTERM", () => shutdown(worker));

  console.log(`[worker] L4 a11y-tree worker started (concurrency=${CONCURRENCY})`);
}
