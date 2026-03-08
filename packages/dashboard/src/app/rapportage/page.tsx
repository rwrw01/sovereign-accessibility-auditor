"use client";

import { Download } from "lucide-react";

interface ReportData {
  url: string;
  timestamp: string;
  layers: Array<{
    name: string;
    findings: number;
    errors: number;
    warnings: number;
    notices: number;
    durationMs: number;
  }>;
  totalFindings: number;
  wcagCompliance: string;
}

export default function RapportagePage() {
  const generateReport = () => {
    const report: ReportData = {
      url: "https://example.com",
      timestamp: new Date().toISOString(),
      layers: [
        { name: "L1 Multi-engine", findings: 3, errors: 1, warnings: 1, notices: 1, durationMs: 2500 },
        { name: "L6 Screenreader", findings: 5, errors: 4, warnings: 1, notices: 0, durationMs: 2200 },
        { name: "L7 Cognitief", findings: 3, errors: 0, warnings: 2, notices: 1, durationMs: 3800 },
      ],
      totalFindings: 11,
      wcagCompliance: "Niet conform — 5 fouten gevonden",
    };

    const markdown = generateMarkdownReport(report);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saa-rapport-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Rapportage</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}>
          Rapport genereren
        </h1>

        <p style={{ color: "var(--vsc-fg-secondary)", marginBottom: 24, maxWidth: 600 }}>
          Genereer een WCAG 2.2 AA conformiteitsrapport op basis van de laatste scanresultaten.
        </p>

        <button className="btn-primary" onClick={generateReport} type="button" style={{ width: "auto" }}>
          <Download size={14} aria-hidden="true" /> Rapport downloaden (Markdown)
        </button>

        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Rapport structuur
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: 2, color: "var(--vsc-fg-secondary)", fontSize: "0.85rem" }}>
            <li>Samenvatting — URL, datum, conformiteitsstatus</li>
            <li>Resultaten per laag — L1 t/m L7</li>
            <li>WCAG criteria overzicht</li>
            <li>Bevindingen detail — selector, context, aanbeveling</li>
            <li>Aanbevelingen — geprioriteerde verbeteracties</li>
          </ol>
        </div>
      </div>
    </>
  );
}

function generateMarkdownReport(report: ReportData): string {
  const lines: string[] = [];
  lines.push("# WCAG 2.2 AA Conformiteitsrapport", "");
  lines.push(`**URL**: ${report.url}`);
  lines.push(`**Datum**: ${new Date(report.timestamp).toLocaleDateString("nl-NL")}`);
  lines.push(`**Tool**: Sovereign Accessibility Auditor v0.1.0`);
  lines.push(`**Standaard**: WCAG 2.2 AA (ISO/IEC 40500:2025)`, "");
  lines.push("## Samenvatting", "");
  lines.push(`- **Totaal bevindingen**: ${report.totalFindings}`);
  lines.push(`- **Conformiteitsstatus**: ${report.wcagCompliance}`, "");
  lines.push("## Resultaten per scan-laag", "");
  lines.push("| Laag | Bevindingen | Fouten | Waarschuwingen | Meldingen | Duur |");
  lines.push("|------|-------------|--------|----------------|-----------|------|");
  for (const l of report.layers) {
    lines.push(`| ${l.name} | ${l.findings} | ${l.errors} | ${l.warnings} | ${l.notices} | ${l.durationMs}ms |`);
  }
  lines.push("", "---", "");
  lines.push("*Automatisch gegenereerd door SAA. Handmatige beoordeling aanbevolen.*");
  return lines.join("\n");
}
