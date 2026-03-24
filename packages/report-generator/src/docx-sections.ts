import { FileChild, HeadingLevel, Paragraph, TextRun } from "docx";
import {
  buildTable,
  bullet,
  formatCriterion,
  impactNL,
  labeledPara,
  para,
  spacer,
  typeNL,
} from "./docx-helpers.js";
import type { AggregatedFinding, ReportData } from "./types.js";

// ---------------------------------------------------------------------------
// Title page
// ---------------------------------------------------------------------------

export function buildTitlePage(data: ReportData): FileChild[] {
  const { input } = data;
  const conformityVerdict =
    data.totalErrors === 0
      ? "Voldoet aan WCAG 2.2 Level AA"
      : "Voldoet nog niet aan WCAG 2.2 Level AA";

  return [
    spacer(),
    spacer(),
    para(input.organisatie, { heading: HeadingLevel.HEADING_1, bold: true }),
    para("Toegankelijkheidsrapport WCAG 2.2 AA", { size: 28 }),
    spacer(),
    labeledPara("Datum", input.datum),
    labeledPara("Website", input.websiteUrl),
    labeledPara("Standaard", input.standaard),
    labeledPara("Tool", input.tool),
    labeledPara("Status", conformityVerdict),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Inhoudsopgave
// ---------------------------------------------------------------------------

export function buildTableOfContents(): FileChild[] {
  const items = [
    "1. Conclusie en aanbevelingen",
    "2. Gap-analyse",
    "3. Bevindingen — site-breed",
    "4. Bevindingen — pagina-specifiek",
    "5. Actieplan",
    "6. Risico-analyse",
    "Bijlage A — Scorebord",
    "Bijlage B — Exacte locaties",
    "Bijlage C — Woordenlijst",
  ];

  return [
    para("Inhoudsopgave", { heading: HeadingLevel.HEADING_1 }),
    ...items.map((item) => bullet(item)),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Section 1: Conclusie en aanbevelingen
// ---------------------------------------------------------------------------

export function buildConclusion(data: ReportData): FileChild[] {
  const { totalErrors, totalWarnings, templateErrors, pageErrors } = data;
  const pageCount = data.input.pages.length;
  const templatePct =
    totalErrors > 0 ? Math.round((templateErrors / totalErrors) * 100) : 0;

  const verdict =
    totalErrors === 0
      ? "De website voldoet aan WCAG 2.2 Level AA op de geteste pagina's."
      : `De website voldoet nog niet aan WCAG 2.2 Level AA. Er zijn ${totalErrors} fouten ` +
        `en ${totalWarnings} waarschuwingen gevonden op ${pageCount} geteste pagina's.`;

  const templateSentence =
    totalErrors > 0
      ? `${templatePct}% van de fouten (${templateErrors} van ${totalErrors}) zijn site-brede template-fouten. ` +
        `Door de template te herstellen worden deze fouten op alle pagina's tegelijk opgelost. ` +
        `De overige ${pageErrors} fouten zijn pagina-specifiek.`
      : "";

  // Top 3 aanbevelingen: highest-impact site-wide errors first
  const topFindings = [...data.siteWideFindings]
    .filter((f) => f.type === "error")
    .slice(0, 3);

  const aanbevelingen: FileChild[] = topFindings.map((f, i) => {
    const criteria = f.wcagCriteria.map(formatCriterion).join(", ");
    return bullet(
      `Aanbeveling ${i + 1} (${impactNL(f.impact)}, ${criteria}): ${f.narrative.oplossing}`,
      false
    );
  });

  if (aanbevelingen.length === 0) {
    aanbevelingen.push(bullet("Geen kritieke site-brede fouten gevonden.", false));
  }

  return [
    para("1. Conclusie en aanbevelingen", { heading: HeadingLevel.HEADING_1 }),
    para(verdict),
    ...(templateSentence ? [para(templateSentence)] : []),
    spacer(),
    para("Top 3 prioritaire aanbevelingen", { heading: HeadingLevel.HEADING_2 }),
    ...aanbevelingen,
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Section 2: Gap-analyse
// ---------------------------------------------------------------------------

export function buildGapAnalysis(data: ReportData): FileChild[] {
  const tableData = [
    ["Pagina", "URL", "Fouten", "Waarschuwingen"],
    ...data.scorePerPage.map((p) => [p.naam, p.url, String(p.errors), String(p.warnings)]),
  ];

  const observations: FileChild[] = [];

  if (data.siteWideFindings.length > 0) {
    observations.push(
      bullet(
        `${data.siteWideFindings.length} unieke bevinding(en) zijn site-breed aanwezig ` +
          `en komen op alle ${data.input.pages.length} geteste pagina's voor.`
      )
    );
  }

  const worstPage = [...data.scorePerPage].sort((a, b) => b.errors - a.errors)[0];
  if (worstPage !== undefined && worstPage.errors > 0) {
    observations.push(
      bullet(`Meeste fouten op: ${worstPage.naam} (${worstPage.errors} fouten).`)
    );
  }

  return [
    para("2. Gap-analyse", { heading: HeadingLevel.HEADING_1 }),
    buildTable(tableData, [3000, 3600, 800, 1400]),
    spacer(),
    para("Observaties", { heading: HeadingLevel.HEADING_2 }),
    ...observations,
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Shared: finding detail block
// ---------------------------------------------------------------------------

function buildFindingBlock(finding: AggregatedFinding, showPages: boolean): FileChild[] {
  const criteria = finding.wcagCriteria.map(formatCriterion).join(", ");
  const pageList = finding.pagesAffected.join(", ");
  const locationLine = finding.isSiteWide
    ? `${finding.count}× gevonden (site-breed, op alle pagina's)`
    : `${finding.count}× gevonden — pagina('s): ${pageList}`;

  const heading = `[${typeNL(finding.type)} / ${impactNL(finding.impact)}] ${criteria}: ${finding.representativeMessage.slice(0, 80)}`;

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: heading, font: "Calibri", bold: true, size: 24, color: "1a365d" })],
    }),
    para(locationLine, { italic: true }),
    ...(showPages && !finding.isSiteWide ? [labeledPara("Pagina's", pageList)] : []),
    labeledPara("Wat is er fout?", finding.narrative.watFout),
    labeledPara(
      "Wat ervaart een blinde of slechtziende bezoeker?",
      finding.narrative.impactBlind
    ),
    labeledPara(
      "Wat ervaart een dove of slechthorende bezoeker?",
      finding.narrative.impactDoof
    ),
    labeledPara("Oplossing", finding.narrative.oplossing),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Section 3: Site-brede bevindingen
// ---------------------------------------------------------------------------

export function buildSiteWideSection(data: ReportData): FileChild[] {
  if (data.siteWideFindings.length === 0) {
    return [
      para("3. Bevindingen — site-breed", { heading: HeadingLevel.HEADING_1 }),
      para("Er zijn geen site-brede bevindingen gevonden."),
      spacer(),
    ];
  }

  return [
    para("3. Bevindingen — site-breed", { heading: HeadingLevel.HEADING_1 }),
    para(
      `De volgende ${data.siteWideFindings.length} bevinding(en) zijn aanwezig op alle geteste pagina's. ` +
        "Deze komen waarschijnlijk uit de template of het CMS-thema en kunnen in één operatie worden hersteld."
    ),
    spacer(),
    ...data.siteWideFindings.flatMap((f) => buildFindingBlock(f, false)),
  ];
}

// ---------------------------------------------------------------------------
// Section 4: Pagina-specifieke bevindingen
// ---------------------------------------------------------------------------

export function buildPageSpecificSection(data: ReportData): FileChild[] {
  if (data.pageSpecificFindings.length === 0) {
    return [
      para("4. Bevindingen — pagina-specifiek", { heading: HeadingLevel.HEADING_1 }),
      para("Er zijn geen pagina-specifieke bevindingen gevonden."),
      spacer(),
    ];
  }

  return [
    para("4. Bevindingen — pagina-specifiek", { heading: HeadingLevel.HEADING_1 }),
    para(
      `De volgende ${data.pageSpecificFindings.length} bevinding(en) zijn specifiek voor één of enkele pagina's.`
    ),
    spacer(),
    ...data.pageSpecificFindings.flatMap((f) => buildFindingBlock(f, true)),
  ];
}
