import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { audits, scans, issues } from "../db/schema.js";
import { getUser } from "../middleware/auth.js";
import { aggregateFindings, generateDocx } from "@saa/report-generator";
import type { ReportInput, PageResult, ReportFinding } from "@saa/report-generator";

const uuidSchema = z.string().uuid("Ongeldig audit-ID");

const querySchema = z.object({
  organisatie: z.string().max(255).optional().default("Onbekende organisatie"),
});

// --- JSONB extraction helpers ---

const VALID_TYPES = new Set(["error", "warning", "notice"]);
const VALID_LEVELS = new Set(["A", "AA", "AAA"]);
const VALID_IMPACTS = new Set(["critical", "serious", "moderate", "minor"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toReportFinding(raw: unknown, pageUrl: string): ReportFinding | null {
  if (!isObject(raw)) return null;

  const type = str(raw["type"]);
  if (!VALID_TYPES.has(type)) return null;

  const message = str(raw["message"]);
  if (!message) return null;

  // wcagCriteria: array or string
  let wcagCriteria: string[];
  if (Array.isArray(raw["wcagCriteria"])) {
    wcagCriteria = raw["wcagCriteria"].filter((c): c is string => typeof c === "string");
  } else if (typeof raw["wcagCriteria"] === "string") {
    wcagCriteria = raw["wcagCriteria"] ? [raw["wcagCriteria"]] : [];
  } else {
    wcagCriteria = [];
  }

  const wcagLevel = str(raw["wcagLevel"]);
  const impact = str(raw["impact"]);

  let selector = str(raw["selector"]);
  if (!selector) {
    const role = str(raw["role"]);
    const name = str(raw["name"]);
    if (role) selector = name ? `${role}[name="${name}"]` : role;
  }

  return {
    type: type as ReportFinding["type"],
    wcagCriteria,
    wcagLevel: (VALID_LEVELS.has(wcagLevel) ? wcagLevel : "AA") as ReportFinding["wcagLevel"],
    selector,
    context: str(raw["context"]),
    message,
    impact: (VALID_IMPACTS.has(impact) ? impact : "moderate") as ReportFinding["impact"],
    page: pageUrl,
  };
}

function extractFindings(resultaat: unknown, pageUrl: string): ReportFinding[] {
  if (!isObject(resultaat)) return [];
  const arr = resultaat["findings"];
  if (!Array.isArray(arr)) return [];

  const out: ReportFinding[] = [];
  for (const item of arr) {
    const f = toReportFinding(item, pageUrl);
    if (f) out.push(f);
  }
  return out;
}

// --- Build ReportInput from DB rows ---

interface ScanRow {
  id: string;
  url: string;
  paginaNaam: string | null;
  viewport: string | null;
  scannerLaag: string;
  resultaat: unknown;
}

interface IssueRow {
  type: string;
  wcagCriterium: string | null;
  wcagNiveau: string | null;
  selector: string | null;
  context: string | null;
  boodschap: string;
  paginaUrl: string | null;
  viewport: string | null;
  ernst: string | null;
}

function buildReportInput(
  audit: { id: string; naam: string },
  organisatie: string,
  scanRows: ScanRow[],
  issueRows: IssueRow[],
): ReportInput {
  const pageMap = new Map<string, PageResult>();

  for (const scan of scanRows) {
    const key = `${scan.url}||${scan.viewport ?? "desktop"}`;
    if (!pageMap.has(key)) {
      let naam: string;
      try { naam = scan.paginaNaam ?? new URL(scan.url).pathname; } catch { naam = scan.url; }
      pageMap.set(key, { url: scan.url, naam, viewport: scan.viewport ?? "desktop", findings: [] });
    }
    pageMap.get(key)!.findings.push(...extractFindings(scan.resultaat, scan.url));
  }

  // Fold in issues not covered by scan resultaat
  for (const issue of issueRows) {
    const url = issue.paginaUrl ?? "";
    if (!url) continue;
    const viewport = issue.viewport ?? "desktop";
    const key = `${url}||${viewport}`;

    if (!pageMap.has(key)) {
      let naam: string;
      try { naam = new URL(url).pathname; } catch { naam = url; }
      pageMap.set(key, { url, naam, viewport, findings: [] });
    }

    const type = str(issue.type);
    if (!VALID_TYPES.has(type)) continue;

    pageMap.get(key)!.findings.push({
      type: type as ReportFinding["type"],
      wcagCriteria: issue.wcagCriterium ? [issue.wcagCriterium] : [],
      wcagLevel: (VALID_LEVELS.has(issue.wcagNiveau ?? "") ? issue.wcagNiveau! : "AA") as ReportFinding["wcagLevel"],
      selector: issue.selector ?? "",
      context: issue.context ?? "",
      message: issue.boodschap,
      impact: (VALID_IMPACTS.has(issue.ernst ?? "") ? issue.ernst! : "moderate") as ReportFinding["impact"],
      page: url,
    });
  }

  const firstUrl = scanRows[0]?.url ?? "";
  let websiteHostname: string;
  try { websiteHostname = new URL(firstUrl).hostname; } catch { websiteHostname = firstUrl; }

  return {
    auditId: audit.id,
    organisatie,
    websiteUrl: websiteHostname,
    datum: new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" }),
    standaard: "WCAG 2.2 Level AA",
    tool: "Sovereign Accessibility Auditor v0.1.0",
    pages: Array.from(pageMap.values()),
  };
}

// --- Shared fetch logic ---

async function fetchAuditData(auditId: string, gemeenteId: string, rol: string) {
  const auditFilter = rol === "admin"
    ? eq(audits.id, auditId)
    : and(eq(audits.id, auditId), eq(audits.gemeenteId, gemeenteId));

  const auditRows = await db.select().from(audits).where(auditFilter).limit(1);
  if (auditRows.length === 0) return null;
  const audit = auditRows[0]!;

  const scanRows = (await db.select().from(scans)
    .where(and(eq(scans.auditId, auditId), eq(scans.status, "voltooid")))) as ScanRow[];
  const issueRows = (await db.select().from(issues)
    .where(eq(issues.auditId, auditId))) as IssueRow[];

  return { audit, scanRows, issueRows };
}

// --- Routes ---

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/audits/:auditId/report", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) return reply.code(401).send({ error: "Authenticatie vereist" });

    const paramResult = uuidSchema.safeParse((request.params as Record<string, unknown>)["auditId"]);
    if (!paramResult.success) return reply.code(400).send({ error: "Ongeldig audit-ID" });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) return reply.code(400).send({ error: "Ongeldige queryparameters" });

    const data = await fetchAuditData(paramResult.data, authUser.gemeenteId, authUser.rol);
    if (!data) return reply.code(404).send({ error: "Audit niet gevonden" });

    const input = buildReportInput(data.audit, queryResult.data.organisatie, data.scanRows, data.issueRows);
    const reportData = aggregateFindings(input);
    const buffer = await generateDocx(reportData);

    const date = new Date().toISOString().slice(0, 10);
    const safeName = data.audit.naam.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);

    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    reply.header("Content-Disposition", `attachment; filename="wcag-rapport-${safeName}-${date}.docx"`);
    return reply.send(buffer);
  });

  app.get("/api/v1/audits/:auditId/report/json", async (request, reply) => {
    const authUser = getUser(request);
    if (!authUser) return reply.code(401).send({ error: "Authenticatie vereist" });

    const paramResult = uuidSchema.safeParse((request.params as Record<string, unknown>)["auditId"]);
    if (!paramResult.success) return reply.code(400).send({ error: "Ongeldig audit-ID" });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) return reply.code(400).send({ error: "Ongeldige queryparameters" });

    const data = await fetchAuditData(paramResult.data, authUser.gemeenteId, authUser.rol);
    if (!data) return reply.code(404).send({ error: "Audit niet gevonden" });

    const input = buildReportInput(data.audit, queryResult.data.organisatie, data.scanRows, data.issueRows);
    return reply.send(aggregateFindings(input));
  });
}
