export type AuditStatus = "nieuw" | "actief" | "voltooid" | "mislukt";
export type ScanStatus = "wachtend" | "actief" | "voltooid" | "mislukt";
export type ScannerLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
export type Severity = "kritiek" | "ernstig" | "gemiddeld" | "laag";
export type IssueType = "error" | "warning" | "notice";
export type WcagLevel = "A" | "AA" | "AAA";
export type UserRole = "admin" | "auditor" | "viewer";

export interface Viewport {
  name: string;
  w: number;
  h: number;
}

export interface Audit {
  id: string;
  gemeenteId: string;
  naam: string;
  doelUrls: Array<{ name: string; url: string }>;
  viewports: Viewport[];
  status: AuditStatus;
  aangemaaktOp: Date;
  voltooidOp: Date | null;
  aangemaaktDoor: string;
}

export interface Scan {
  id: string;
  auditId: string;
  url: string;
  paginaNaam: string | null;
  viewport: string | null;
  scannerLaag: ScannerLayer;
  status: ScanStatus;
  resultaat: unknown;
  foutmelding: string | null;
  gestartOp: Date | null;
  voltooidOp: Date | null;
}

export interface Issue {
  id: string;
  scanId: string;
  auditId: string;
  type: IssueType;
  wcagCriterium: string | null;
  wcagNiveau: WcagLevel | null;
  bronEngine: string | null;
  selector: string | null;
  context: string | null;
  boodschap: string;
  paginaUrl: string | null;
  viewport: string | null;
  ernst: Severity;
}

export interface User {
  id: string;
  gemeenteId: string;
  email: string;
  naam: string | null;
  rol: UserRole;
  aangemaaktOp: Date;
}
