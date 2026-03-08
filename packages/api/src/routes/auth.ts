import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  authenticateUser,
  refreshAccessToken,
  revokeRefreshToken,
  getUserById,
  createUser,
  findOrCreateOidcUser,
} from "../services/auth.service.js";
import {
  isOidcEnabled,
  getAuthorizationUrl,
  handleCallback,
} from "../services/oidc.service.js";
import { requireRole, getUser } from "../middleware/auth.js";
import type { UserRole } from "@saa/shared";

interface JwtSignPayload {
  sub: string;
  email: string;
  rol: UserRole;
  gemeenteId: string;
}

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  gemeenteId: z.string().min(1).max(64),
  naam: z.string().max(255).optional(),
  rol: z.enum(["admin", "auditor", "viewer"]).optional(),
});

function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): void {
  const isProduction = process.env["NODE_ENV"] === "production";

  reply.setCookie("saa_access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
  reply.setCookie("saa_refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie("saa_access_token", { path: "/" });
  reply.clearCookie("saa_refresh_token", { path: "/" });
}

export async function authRoutes(server: FastifyInstance): Promise<void> {
  const signJwt = (payload: JwtSignPayload): string => {
    return server.jwt.sign(payload as unknown as Record<string, string>, {
      expiresIn: Number(process.env["JWT_ACCESS_EXPIRY"] ?? 900),
    });
  };

  // Login
  server.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Ongeldige invoer", details: parsed.error.issues });
      }

      const result = await authenticateUser(
        parsed.data.email,
        parsed.data.password,
        signJwt,
      );

      if (!result) {
        return reply
          .code(401)
          .send({ error: "E-mailadres of wachtwoord onjuist" });
      }

      setAuthCookies(
        reply,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.expiresIn,
      );

      return reply.send({ user: result.user });
    },
  );

  // Refresh token (cookie-based, rate limited)
  server.post(
    "/api/v1/auth/refresh",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const cookies = request.cookies as Record<string, string> | undefined;
      const refreshToken = cookies?.["saa_refresh_token"];

      if (!refreshToken) {
        return reply.code(400).send({ error: "Geen refresh token" });
      }

      const tokens = await refreshAccessToken(refreshToken, signJwt);

      if (!tokens) {
        clearAuthCookies(reply);
        return reply
          .code(401)
          .send({ error: "Ongeldig of verlopen refresh token" });
      }

      setAuthCookies(reply, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      return reply.send({ ok: true });
    },
  );

  // Logout (revoke refresh token from cookie)
  server.post("/api/v1/auth/logout", async (request, reply) => {
    const authUser = getUser(request);
    const cookies = request.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.["saa_refresh_token"];

    if (refreshToken && authUser) {
      await revokeRefreshToken(refreshToken, authUser.sub);
    }

    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  // Get current user
  server.get("/api/v1/auth/me", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) {
      return reply.code(401).send({ error: "Authenticatie vereist" });
    }

    const user = await getUserById(authUser.sub);
    if (!user) {
      return reply.code(404).send({ error: "Gebruiker niet gevonden" });
    }

    return reply.send(user);
  });

  // Register (admin only)
  server.post(
    "/api/v1/auth/register",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Ongeldige invoer", details: parsed.error.issues });
      }

      try {
        const user = await createUser({
          email: parsed.data.email,
          password: parsed.data.password,
          gemeenteId: parsed.data.gemeenteId,
          naam: parsed.data.naam,
          rol: parsed.data.rol as UserRole | undefined,
        });
        return reply.code(201).send(user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("unique") || message.includes("duplicate")) {
          return reply
            .code(409)
            .send({ error: "E-mailadres is al in gebruik" });
        }
        throw err;
      }
    },
  );

  // OIDC: check if enabled
  server.get("/api/v1/auth/oidc/status", async () => {
    return { enabled: isOidcEnabled() };
  });

  // OIDC: redirect to Keycloak
  server.get("/api/v1/auth/oidc/authorize", async (_request, reply) => {
    if (!isOidcEnabled()) {
      return reply.code(404).send({ error: "OIDC is niet geconfigureerd" });
    }

    const url = await getAuthorizationUrl();
    return reply.redirect(url);
  });

  // OIDC: callback from Keycloak
  server.get("/api/v1/auth/oidc/callback", async (request, reply) => {
    if (!isOidcEnabled()) {
      return reply.code(404).send({ error: "OIDC is niet geconfigureerd" });
    }

    try {
      const callbackUrl = `${request.protocol}://${request.hostname}${request.url}`;
      const { subject, issuer, email, naam } =
        await handleCallback(callbackUrl);

      const result = await findOrCreateOidcUser(
        subject,
        issuer,
        email,
        naam,
        "default",
        signJwt,
      );

      const dashboardUrl = process.env["CORS_ORIGIN"] ?? "http://localhost:13000";

      setAuthCookies(
        reply,
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.expiresIn,
      );

      return reply.redirect(`${dashboardUrl}/auth/callback?oidc=success`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OIDC fout";
      server.log.error({ err }, "OIDC callback error");
      return reply.code(400).send({ error: message });
    }
  });
}
