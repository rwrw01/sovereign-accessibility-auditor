import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { UserRole } from "@saa/shared";

export interface TokenPayload {
  sub: string;
  email: string;
  rol: UserRole;
  gemeenteId: string;
  iat: number;
  exp: number;
}

const PUBLIC_ROUTES = new Set([
  "/api/v1/health",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/oidc/status",
  "/api/v1/auth/oidc/authorize",
  "/api/v1/auth/oidc/callback",
]);

export function getUser(request: FastifyRequest): TokenPayload | null {
  return (request as unknown as { authUser?: TokenPayload }).authUser ?? null;
}

function setUser(request: FastifyRequest, payload: TokenPayload): void {
  (request as unknown as { authUser: TokenPayload }).authUser = payload;
}

export function registerAuthHook(server: FastifyInstance): void {
  const authDisabled = process.env["DISABLE_AUTH"] === "true";
  if (authDisabled) {
    server.log.info("Auth disabled — all requests use local admin user");
  }

  server.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.url.split("?")[0] ?? request.url;
      if (PUBLIC_ROUTES.has(path)) {
        return;
      }
      if (authDisabled) {
        setUser(request, {
          sub: "00000000-0000-0000-0000-000000000000",
          email: "local@dev",
          rol: "admin",
          gemeenteId: "local",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        });
        return;
      }

      // Support both Authorization header and HttpOnly cookie
      const authHeader = request.headers.authorization;
      const cookieToken = (request.cookies as Record<string, string> | undefined)?.["saa_access_token"];
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : cookieToken;

      if (!token) {
        reply.code(401).send({ error: "Authenticatie vereist" });
        return;
      }
      try {
        const payload = server.jwt.verify(token) as TokenPayload;
        setUser(request, payload);
      } catch {
        reply.code(401).send({ error: "Ongeldig of verlopen token" });
      }
    },
  );
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user) {
      reply.code(401).send({ error: "Authenticatie vereist" });
      return;
    }
    if (!roles.includes(user.rol)) {
      reply.code(403).send({ error: "Onvoldoende rechten" });
    }
  };
}
