import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { audits, scans, issues } from "../db/schema.js";
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
      naam: `Toegankelijkheidsscan — ${new URL(url).hostname}`,
      doelUrls: JSON.stringify([url]),
      status: "actief",
      aangemaaktDoor: authUser.sub === "00000000-0000-0000-0000-000000000000" ? null : authUser.sub,
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

  // Get single audit with scans and issues
  server.get("/api/v1/audits/:id", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) {
      return reply.code(401).send({ error: "Authenticatie vereist" });
    }

    const { id } = request.params as { id: string };
    const { eq, and } = await import("drizzle-orm");

    const auditRows = await db
      .select()
      .from(audits)
      .where(and(eq(audits.id, id), eq(audits.gemeenteId, authUser.gemeenteId)))
      .limit(1);

    if (auditRows.length === 0) {
      return reply.code(404).send({ error: "Audit niet gevonden" });
    }

    const audit = auditRows[0]!;

    const scanRows = await db
      .select()
      .from(scans)
      .where(eq(scans.auditId, id));

    const issueRows = await db
      .select()
      .from(issues)
      .where(eq(issues.auditId, id));

    return reply.send({
      ...audit,
      scans: scanRows,
      issues: issueRows,
    });
  });
}
