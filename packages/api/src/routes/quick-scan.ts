import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { audits } from "../db/schema.js";
import { getUser } from "../middleware/auth.js";

const quickScanSchema = z.object({
  url: z.string().url().max(2048),
  layers: z.array(z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"])).min(1).max(7),
});

export async function quickScanRoutes(server: FastifyInstance): Promise<void> {
  // Create a quick audit and return its ID for the frontend to use with existing scanner routes
  server.post("/api/v1/quick-scan", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) {
      return reply.code(401).send({ error: "Authenticatie vereist" });
    }

    const parsed = quickScanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Ongeldige invoer", details: parsed.error.issues });
    }

    const { url, layers } = parsed.data;

    // Create ad-hoc audit
    const rows = await db.insert(audits).values({
      gemeenteId: authUser.gemeenteId,
      naam: `Snelle scan — ${new URL(url).hostname}`,
      doelUrls: JSON.stringify([url]),
      status: "actief",
      aangemaaktDoor: authUser.sub,
    }).returning();

    const audit = rows[0]!;

    return reply.code(201).send({
      auditId: audit.id,
      url,
      layers,
    });
  });

  // List audits for the current user's gemeente
  server.get("/api/v1/audits", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) {
      return reply.code(401).send({ error: "Authenticatie vereist" });
    }

    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(audits)
      .where(eq(audits.gemeenteId, authUser.gemeenteId))
      .orderBy(audits.aangemaaktOp)
      .limit(50);

    return reply.send(rows);
  });
}
