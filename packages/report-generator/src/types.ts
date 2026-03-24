export interface ReportInput {
  auditId: string;
  organisatie: string;
  websiteUrl: string;
  datum: string;
  standaard: string;
  tool: string;
  pages: PageResult[];
}

export interface PageResult {
  url: string;
  naam: string;
  viewport: string;
  findings: ReportFinding[];
}

export interface ReportFinding {
  type: "error" | "warning" | "notice";
  wcagCriteria: string[];
  wcagLevel: "A" | "AA" | "AAA";
  selector: string;
  context: string;
  message: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  engine?: string;
  page: string;
}

export interface AggregatedFinding {
  key: string;
  wcagCriteria: string[];
  wcagLevel: "A" | "AA" | "AAA";
  type: "error" | "warning" | "notice";
  impact: "critical" | "serious" | "moderate" | "minor";
  count: number;
  pagesAffected: string[];
  isSiteWide: boolean;
  representativeSelector: string;
  representativeMessage: string;
  narrative: FindingNarrative;
}

export interface FindingNarrative {
  watFout: string;
  impactBlind: string;
  impactDoof: string;
  oplossing: string;
}

export interface ReportData {
  input: ReportInput;
  siteWideFindings: AggregatedFinding[];
  pageSpecificFindings: AggregatedFinding[];
  totalErrors: number;
  totalWarnings: number;
  totalNotices: number;
  templateErrors: number;
  pageErrors: number;
  scorePerPage: Array<{ naam: string; url: string; errors: number; warnings: number }>;
}
