"use client";

import { useState } from "react";

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
  const [reportData] = useState<ReportData | null>(null);

  const generateReport = () => {
    // Demo report data — in production this would aggregate scan results from the API
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
      <h2>Rapportage</h2>

      <div className="card">
        <h2>Rapport genereren</h2>
        <p style={{ marginBottom: "1rem" }}>
          Genereer een WCAG 2.2 AA conformiteitsrapport op basis van de laatste scanresultaten.
          Het rapport bevat een samenvatting per scan-laag, bevindingen per WCAG-criterium,
          en aanbevelingen voor verbetering.
        </p>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" onClick={generateReport} type="button">
            Rapport downloaden (Markdown)
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Rapport structuur</h2>
        <p>Het rapport bevat de volgende secties:</p>
        <ol style={{ paddingLeft: "1.5rem", lineHeight: 2 }}>
          <li><strong>Samenvatting</strong> — URL, datum, totaal bevindingen, conformiteitsstatus</li>
          <li><strong>Resultaten per laag</strong> — L1 t/m L7 met bevindingen per type</li>
          <li><strong>WCAG criteria overzicht</strong> — Alle getoetste criteria met status</li>
          <li><strong>Bevindingen detail</strong> — Per bevinding: selector, context, aanbeveling</li>
          <li><strong>Aanbevelingen</strong> — Geprioriteerde lijst van verbeteracties</li>
        </ol>
      </div>

      {reportData && (
        <div className="card">
          <h2>Laatste rapport</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{reportData.totalFindings}</div>
              <div className="stat-label">Totaal bevindingen</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function generateMarkdownReport(report: ReportData): string {
  const lines: string[] = [];

  lines.push("# WCAG 2.2 AA Conformiteitsrapport");
  lines.push("");
  lines.push(`**URL**: ${report.url}`);
  lines.push(`**Datum**: ${new Date(report.timestamp).toLocaleDateString("nl-NL")}`);
  lines.push(`**Tool**: Sovereign Accessibility Auditor v0.1.0`);
  lines.push(`**Standaard**: WCAG 2.2 AA (ISO/IEC 40500:2025)`);
  lines.push("");

  lines.push("## Samenvatting");
  lines.push("");
  lines.push(`- **Totaal bevindingen**: ${report.totalFindings}`);
  lines.push(`- **Conformiteitsstatus**: ${report.wcagCompliance}`);
  lines.push("");

  lines.push("## Resultaten per scan-laag");
  lines.push("");
  lines.push("| Laag | Bevindingen | Fouten | Waarschuwingen | Meldingen | Duur |");
  lines.push("|------|-------------|--------|----------------|-----------|------|");

  for (const layer of report.layers) {
    lines.push(
      `| ${layer.name} | ${layer.findings} | ${layer.errors} | ${layer.warnings} | ${layer.notices} | ${layer.durationMs}ms |`,
    );
  }

  lines.push("");
  lines.push("## Aanbevelingen");
  lines.push("");
  lines.push("1. Los eerst alle **fouten** (errors) op — deze vormen een direct WCAG-conformiteitsprobleem");
  lines.push("2. Evalueer **waarschuwingen** (warnings) — deze zijn waarschijnlijk problemen maar vereisen handmatige beoordeling");
  lines.push("3. Bekijk **meldingen** (notices) — deze zijn informatief en kunnen de toegankelijkheid verbeteren");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Dit rapport is automatisch gegenereerd door de Sovereign Accessibility Auditor.*");
  lines.push("*Handmatige beoordeling door een WCAG-expert wordt aanbevolen voor een volledig conformiteitsrapport.*");

  return lines.join("\n");
}
