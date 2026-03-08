import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { scanRoutes } from "./routes/scan.js";
import { visualRegressionRoutes } from "./routes/visual-regression.js";
import { behavioralRoutes } from "./routes/behavioral.js";
import { a11yTreeRoutes } from "./routes/a11y-tree.js";
import { touchTargetsRoutes } from "./routes/touch-targets.js";
import { screenreaderRoutes } from "./routes/screenreader.js";
import { cognitiveRoutes } from "./routes/cognitive.js";
import { authRoutes } from "./routes/auth.js";
import { registerAuthHook } from "./middleware/auth.js";

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
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
});

// Additional security headers
server.addHook("onSend", async (_request, reply) => {
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  reply.header("X-Permitted-Cross-Domain-Policies", "none");
});

await server.register(cors, {
  origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  credentials: true,
});

await server.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const jwtSecret = process.env["JWT_SECRET"];
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET env var is vereist (minimaal 32 karakters). " +
      "Genereer met: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  );
}

await server.register(fastifyJwt, {
  secret: jwtSecret,
  sign: { algorithm: "HS256" },
  verify: { algorithms: ["HS256"] },
});

await server.register(fastifyCookie);

registerAuthHook(server);

server.get("/api/v1/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

await server.register(authRoutes);
await server.register(scanRoutes);
await server.register(visualRegressionRoutes);
await server.register(behavioralRoutes);
await server.register(a11yTreeRoutes);
await server.register(touchTargetsRoutes);
await server.register(screenreaderRoutes);
await server.register(cognitiveRoutes);

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    server.log.info(`${signal} received, shutting down...`);
    await server.close();
    process.exit(0);
  });
}

const start = async (): Promise<void> => {
  const host = process.env["HOST"] ?? "127.0.0.1";
  const port = Number(process.env["PORT"] ?? 3001);

  await server.listen({ host, port });
};

start().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});
