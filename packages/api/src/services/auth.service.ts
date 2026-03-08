import { randomBytes, createHash } from "node:crypto";
import * as argon2 from "argon2";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/connection.js";
import { users, refreshTokens } from "../db/schema.js";
import type { AuthTokens, PublicUser, UserRole } from "@saa/shared";

interface JwtSignPayload {
  sub: string;
  email: string;
  rol: UserRole;
  gemeenteId: string;
}

const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return {
    id: row.id,
    gemeenteId: row.gemeenteId,
    email: row.email,
    naam: row.naam,
    rol: row.rol as UserRole,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function authenticateUser(
  email: string,
  password: string,
  signJwt: (payload: JwtSignPayload) => string,
): Promise<{ tokens: AuthTokens; user: PublicUser } | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash) {
    return null;
  }

  // Check account lockout
  if (user.geblokkerdTot && new Date(user.geblokkerdTot) > new Date()) {
    return null;
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    const attempts = Number(user.misluktePogingen) + 1;
    const updates: Record<string, unknown> = {
      misluktePogingen: String(attempts),
    };

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updates.geblokkerdTot = new Date(
        Date.now() + LOCKOUT_MINUTES * 60 * 1000,
      );
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));
    return null;
  }

  // Reset failed attempts on successful login
  await db
    .update(users)
    .set({
      misluktePogingen: "0",
      geblokkerdTot: null,
      laatstIngelogdOp: new Date(),
    })
    .where(eq(users.id, user.id));

  const accessToken = signJwt({
    sub: user.id,
    email: user.email,
    rol: user.rol as UserRole,
    gemeenteId: user.gemeenteId,
  });

  const refreshToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    verlooptOp: expiresAt,
  });

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: Number(process.env["JWT_ACCESS_EXPIRY"] ?? 900),
    },
    user: toPublicUser(user),
  };
}

export async function refreshAccessToken(
  token: string,
  signJwt: (payload: JwtSignPayload) => string,
): Promise<AuthTokens | null> {
  const tokenHash = hashToken(token);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.ingetrokken, false),
        gt(refreshTokens.verlooptOp, new Date()),
      ),
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  // Rotate: revoke old token
  await db
    .update(refreshTokens)
    .set({ ingetrokken: true })
    .where(eq(refreshTokens.id, existing.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, existing.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const accessToken = signJwt({
    sub: user.id,
    email: user.email,
    rol: user.rol as UserRole,
    gemeenteId: user.gemeenteId,
  });

  // Issue new refresh token
  const newRefreshToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    verlooptOp: expiresAt,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: Number(process.env["JWT_ACCESS_EXPIRY"] ?? 900),
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(refreshTokens)
    .set({ ingetrokken: true })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ? toPublicUser(user) : null;
}

export async function createUser(data: {
  email: string;
  password: string;
  gemeenteId: string;
  naam?: string;
  rol?: UserRole;
}): Promise<PublicUser> {
  const passwordHash = await hashPassword(data.password);

  const rows = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      passwordHash,
      gemeenteId: data.gemeenteId,
      naam: data.naam ?? null,
      rol: data.rol ?? "auditor",
    })
    .returning();

  return toPublicUser(rows[0]!);
}

export async function findOrCreateOidcUser(
  subject: string,
  issuer: string,
  email: string,
  naam: string | null,
  gemeenteId: string,
  signJwt: (payload: JwtSignPayload) => string,
): Promise<{ tokens: AuthTokens; user: PublicUser }> {
  const existingRows = await db
    .select()
    .from(users)
    .where(eq(users.oidcSubject, subject))
    .limit(1);

  let user = existingRows[0];

  if (!user) {
    const insertedRows = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        oidcSubject: subject,
        oidcIssuer: issuer,
        gemeenteId,
        naam,
        rol: "auditor",
      })
      .returning();
    user = insertedRows[0]!;
  }

  await db
    .update(users)
    .set({ laatstIngelogdOp: new Date() })
    .where(eq(users.id, user.id));

  const accessToken = signJwt({
    sub: user.id,
    email: user.email,
    rol: user.rol as UserRole,
    gemeenteId: user.gemeenteId,
  });

  const refreshToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    verlooptOp: expiresAt,
  });

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: Number(process.env["JWT_ACCESS_EXPIRY"] ?? 900),
    },
    user: toPublicUser(user),
  };
}
