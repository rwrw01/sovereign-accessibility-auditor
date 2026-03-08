/**
 * Development seed script — creates a default admin user.
 * Usage: npx tsx packages/api/src/db/seed.ts
 */
import { db } from "./connection.js";
import { users } from "./schema.js";
import { hashPassword } from "../services/auth.service.js";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "admin@saa.local";
const ADMIN_PASSWORD = "Admin2026!Secure";

async function seed(): Promise<void> {
  console.log("[seed] Checking for existing admin user...");

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    console.log("[seed] Admin user already exists, skipping.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await db.insert(users).values({
    email: ADMIN_EMAIL,
    passwordHash,
    gemeenteId: "dev",
    naam: "SAA Admin",
    rol: "admin",
  });

  console.log(`[seed] Admin user created: ${ADMIN_EMAIL}`);
  console.log(`[seed] Password: ${ADMIN_PASSWORD}`);
  console.log("[seed] BELANGRIJK: wijzig dit wachtwoord voor productie!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
