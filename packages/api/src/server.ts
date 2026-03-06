import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

const envToLogger: Record<string, object | boolean> = {
  development: {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
    },
  },
  production: true,
  test: false,
};

const environment = process.env["NODE_ENV"] ?? "development";

const server = Fastify({
  logger: envToLogger[environment] ?? true,
});

await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
});

await server.register(cors, {
  origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  credentials: true,
});

await server.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

server.get("/api/v1/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async (): Promise<void> => {
  const host = process.env["HOST"] ?? "127.0.0.1";
  const port = Number(process.env["PORT"] ?? 3001);

  await server.listen({ host, port });
};

start().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});
