import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  gemeenteId: varchar("gemeente_id", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  naam: varchar("naam", { length: 255 }),
  rol: varchar("rol", { length: 32 }).notNull().default("auditor"),
  aangemaaktOp: timestamp("aangemaakt_op").defaultNow(),
});

export const audits = pgTable("audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  gemeenteId: varchar("gemeente_id", { length: 64 }).notNull(),
  naam: varchar("naam", { length: 255 }).notNull(),
  doelUrls: jsonb("doel_urls").notNull(),
  viewports: jsonb("viewports").notNull().default(
    JSON.stringify([
      { name: "desktop", w: 1280, h: 1024 },
      { name: "mobiel", w: 375, h: 667 },
    ]),
  ),
  status: varchar("status", { length: 32 }).notNull().default("nieuw"),
  aangemaaktOp: timestamp("aangemaakt_op").defaultNow(),
  voltooidOp: timestamp("voltooid_op"),
  aangemaaktDoor: uuid("aangemaakt_door").references(() => users.id),
});

export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 2048 }).notNull(),
  paginaNaam: varchar("pagina_naam", { length: 255 }),
  viewport: varchar("viewport", { length: 32 }),
  scannerLaag: varchar("scanner_laag", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("wachtend"),
  resultaat: jsonb("resultaat"),
  foutmelding: text("foutmelding"),
  gestartOp: timestamp("gestart_op"),
  voltooidOp: timestamp("voltooid_op"),
});

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  auditId: uuid("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 16 }).notNull(),
  wcagCriterium: varchar("wcag_criterium", { length: 16 }),
  wcagNiveau: varchar("wcag_niveau", { length: 4 }),
  bronEngine: varchar("bron_engine", { length: 32 }),
  selector: text("selector"),
  context: text("context"),
  boodschap: text("boodschap").notNull(),
  paginaUrl: varchar("pagina_url", { length: 2048 }),
  viewport: varchar("viewport", { length: 32 }),
  ernst: varchar("ernst", { length: 16 }).default("gemiddeld"),
});
