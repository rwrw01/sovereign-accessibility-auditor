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

// ── L1 Multi-engine Scanner Types ──

export type EngineName = "axe-core" | "ibm-aat";

export interface EngineResult {
  engine: EngineName;
  findings: Finding[];
  durationMs: number;
  error: string | null;
}

export interface Finding {
  ruleId: string;
  actRuleId: string | null;
  type: IssueType;
  wcagCriteria: string[];
  wcagLevel: WcagLevel | null;
  selector: string;
  context: string;
  message: string;
  engine: EngineName;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
}

export interface DeduplicatedFinding extends Finding {
  confirmedBy: EngineName[];
  confidence: number;
}

export interface ScanJobPayload {
  scanId: string;
  auditId: string;
  url: string;
  viewport: Viewport;
  engines: EngineName[];
}

export interface ScanJobResult {
  scanId: string;
  findings: DeduplicatedFinding[];
  engineResults: EngineResult[];
  totalDurationMs: number;
}

// ── L2 Visual Regression Scanner Types ──

export type VisualScenario = "reflow" | "zoom-200" | "text-spacing";

export interface VisualRegressionFinding {
  scenario: VisualScenario;
  type: IssueType;
  wcagCriteria: string[];
  wcagLevel: WcagLevel;
  selector: string;
  context: string;
  message: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  diffPercentage: number | null;
}

export interface ScenarioResult {
  scenario: VisualScenario;
  findings: VisualRegressionFinding[];
  diffPercentage: number | null;
  durationMs: number;
  error: string | null;
}

export interface L2ScanJobPayload {
  scanId: string;
  auditId: string;
  url: string;
  viewport: Viewport;
  scenarios: VisualScenario[];
}

export interface L2ScanJobResult {
  scanId: string;
  findings: VisualRegressionFinding[];
  scenarioResults: ScenarioResult[];
  totalDurationMs: number;
}

// ── L3 Behavioral Tests Types ──

export type BehavioralTest =
  | "keyboard-nav"
  | "focus-trap"
  | "focus-visible"
  | "hover-focus"
  | "skip-link";

export interface BehavioralFinding {
  test: BehavioralTest;
  type: IssueType;
  wcagCriteria: string[];
  wcagLevel: WcagLevel;
  selector: string;
  context: string;
  message: string;
  impact: "critical" | "serious" | "moderate" | "minor";
}

export interface BehavioralTestResult {
  test: BehavioralTest;
  findings: BehavioralFinding[];
  durationMs: number;
  error: string | null;
}

export interface L3ScanJobPayload {
  scanId: string;
  auditId: string;
  url: string;
  viewport: Viewport;
  tests: BehavioralTest[];
}

export interface L3ScanJobResult {
  scanId: string;
  findings: BehavioralFinding[];
  testResults: BehavioralTestResult[];
  totalDurationMs: number;
}

// ── L4 A11y Tree Diff Types ──

export interface A11yTreeNode {
  role: string;
  name: string;
  children?: A11yTreeNode[];
  level?: number;
  checked?: boolean | "mixed";
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  value?: string;
}

export interface A11yTreeDiffFinding {
  type: IssueType;
  wcagCriteria: string[];
  wcagLevel: WcagLevel;
  diffType: "missing-role" | "missing-landmark" | "missing-name" | "structural-change" | "orientation-issue";
  role: string;
  name: string;
  context: string;
  message: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  viewport: string;
}

export interface A11yTreeDiffResult {
  comparison: string;
  findings: A11yTreeDiffFinding[];
  desktopNodeCount: number;
  mobileNodeCount: number;
  durationMs: number;
  error: string | null;
}

export interface L4ScanJobPayload {
  scanId: string;
  auditId: string;
  url: string;
  desktopViewport: Viewport;
  mobileViewport: Viewport;
}

export interface L4ScanJobResult {
  scanId: string;
  findings: A11yTreeDiffFinding[];
  comparisons: A11yTreeDiffResult[];
  totalDurationMs: number;
}

// ── L5 Touch Targets Types ──

export interface TouchTargetFinding {
  type: IssueType;
  wcagCriteria: string[];
  wcagLevel: WcagLevel;
  selector: string;
  tagName: string;
  text: string;
  width: number;
  height: number;
  minRequired: number;
  context: string;
  message: string;
  impact: "critical" | "serious" | "moderate" | "minor";
}

export interface L5ScanJobPayload {
  scanId: string;
  auditId: string;
  url: string;
  viewport: Viewport;
  minTargetSize: number;
}

export interface L5ScanJobResult {
  scanId: string;
  findings: TouchTargetFinding[];
  totalElements: number;
  failingElements: number;
  totalDurationMs: number;
}
