import { FileChild, HeadingLevel } from "docx";
import {
  buildTable,
  bullet,
  formatCriterion,
  impactNL,
  para,
  spacer,
  typeNL,
} from "./docx-helpers.js";
import type { ReportData } from "./types.js";

// ---------------------------------------------------------------------------
// Section 5: Actieplan
// ---------------------------------------------------------------------------

export function buildActionPlan(data: ReportData): FileChild[] {
  const siteWideErrors = data.siteWideFindings.filter((f) => f.type === "error").length;
  const pageSpecificErrors = data.pageSpecificFindings.filter((f) => f.type === "error").length;
  const estimatedReduction =
    data.totalErrors > 0
      ? Math.round((data.templateErrors / data.totalErrors) * 100)
      : 0;

  const fase2Bullets: FileChild[] = data.scorePerPage
    .filter((p) => p.errors > 0)
    .map((p) => bullet(`${p.naam}: ${p.errors} fout(en) te herstellen`));

  return [
    para("5. Actieplan", { heading: HeadingLevel.HEADING_1 }),
    spacer(),
    para("Fase 1 — Template-fixes (site-breed)", { heading: HeadingLevel.HEADING_2 }),
    para(
      `Herstel de ${siteWideErrors} site-brede fout(en) in de template of het CMS-thema. ` +
        `Dit elimineert naar verwachting ${estimatedReduction}% van alle gevonden fouten in één release.`
    ),
    spacer(),
    para("Fase 2 — Pagina-specifieke fixes", { heading: HeadingLevel.HEADING_2 }),
    para(`Herstel de ${pageSpecificErrors} fout(en) op individuele pagina's:`),
    ...fase2Bullets,
    spacer(),
    para("Fase 3 — Handmatige audit en monitoring", { heading: HeadingLevel.HEADING_2 }),
    bullet("Voer een handmatige screenreader-test uit (NVDA/JAWS + Windows, VoiceOver + macOS/iOS)."),
    bullet("Laat eindgebruikers met een visuele beperking de website testen."),
    bullet("Integreer geautomatiseerde WCAG-tests in de CI/CD-pipeline."),
    bullet("Publiceer een bijgewerkte toegankelijkheidsverklaring op de website."),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Section 6: Risico-analyse
// ---------------------------------------------------------------------------

export function buildRiskAnalysis(): FileChild[] {
  return [
    para("6. Risico-analyse", { heading: HeadingLevel.HEADING_1 }),
    para(
      "Organisaties die websites voor het publiek toegankelijk stellen, zijn in Nederland gebonden aan " +
        "het Besluit digitale toegankelijkheid overheid (gebaseerd op EN 301 549 / WCAG 2.1 AA, " +
        "met verwachte upgrade naar WCAG 2.2 AA). ISO/IEC 40500:2025 formaliseert WCAG 2.2 als " +
        "internationale norm."
    ),
    spacer(),
    para("Wettelijke en reputatierisico's", { heading: HeadingLevel.HEADING_2 }),
    bullet("Boetes en toezichtsmaatregelen door het Ministerie van BZK of de toezichthoudende instantie."),
    bullet(
      "Reputatieschade bij publicatie van klachten via de Nationale Ombudsman of in de pers."
    ),
    bullet(
      "Uitsluiting van subsidies of aanbestedingen waarbij digitale toegankelijkheid een eis is."
    ),
    bullet(
      "Aansprakelijkheidsrisico voor individuele bezoekers die door ontoegankelijkheid schade ondervinden."
    ),
    spacer(),
    para("Kansen", { heading: HeadingLevel.HEADING_2 }),
    bullet(
      "Verbetering van SEO: zoekmachines waarderen semantisch correcte, goed gestructureerde HTML."
    ),
    bullet(
      "Bredere doelgroep: toegankelijke websites bereiken ook ouderen, mensen met tijdelijke beperkingen en gebruikers op langzame verbindingen."
    ),
    bullet(
      "Toekomstbestendigheid: investering nu voorkomt hogere herstelkosten na een herontwerp."
    ),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Bijlage A: Scorebord
// ---------------------------------------------------------------------------

export function buildAppendixScoreboard(data: ReportData): FileChild[] {
  const tableData = [
    ["Pagina", "URL", "Fouten", "Waarschuwingen", "Opmerkingen"],
    ...data.scorePerPage.map((p) => [
      p.naam,
      p.url,
      String(p.errors),
      String(p.warnings),
      p.errors === 0 ? "Geen fouten" : "Actie vereist",
    ]),
  ];

  return [
    para("Bijlage A — Scorebord", { heading: HeadingLevel.HEADING_1 }),
    buildTable(tableData),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Bijlage B: Exacte locaties
// ---------------------------------------------------------------------------

export function buildAppendixLocations(data: ReportData): FileChild[] {
  const allFindings = [...data.siteWideFindings, ...data.pageSpecificFindings];

  if (allFindings.length === 0) {
    return [
      para("Bijlage B — Exacte locaties", { heading: HeadingLevel.HEADING_1 }),
      para("Geen bevindingen gevonden."),
      spacer(),
    ];
  }

  const tableData = [
    ["Criterium", "Type", "Impact", "CSS Selector", "Pagina('s)"],
    ...allFindings.map((f) => [
      f.wcagCriteria.map(formatCriterion).join(", "),
      typeNL(f.type),
      impactNL(f.impact),
      f.representativeSelector.slice(0, 60),
      f.isSiteWide ? "Site-breed" : f.pagesAffected.slice(0, 2).join(", "),
    ]),
  ];

  return [
    para("Bijlage B — Exacte locaties", { heading: HeadingLevel.HEADING_1 }),
    para(
      "De onderstaande tabel bevat de representatieve CSS-selector per bevinding. " +
        "Voor de volledige lijst van selectors, exporteer de ruwe scanresultaten als JSON."
    ),
    buildTable(tableData, [1600, 800, 800, 2800, 1800]),
    spacer(),
  ];
}

// ---------------------------------------------------------------------------
// Bijlage C: Woordenlijst
// ---------------------------------------------------------------------------

const GLOSSARY: Array<[string, string]> = [
  ["ARIA", "Accessible Rich Internet Applications — W3C-specificatie voor het toevoegen van toegankelijkheidsinformatie aan HTML."],
  ["Axe", "Open-source WCAG-testbibliotheek van Deque Systems, ingebed in de scanner."],
  ["Contrast ratio", "Verhouding tussen de lichtsterkte van tekst en achtergrond. Minimumeis: 4,5:1 (normaal), 3:1 (groot)."],
  ["CSS-selector", "Technische aanwijzing die aangeeft op welk HTML-element een bevinding betrekking heeft."],
  ["EN 301 549", "Europese norm voor toegankelijkheidsvereisten voor ICT-producten en -diensten, verwijst naar WCAG."],
  ["Focus", "De toetsenbordfocus geeft aan welk element actief is bij toetsenbordnavigatie."],
  ["Screenreader", "Software die de inhoud van een scherm voorleest; bijv. NVDA (Windows), JAWS (Windows), VoiceOver (Apple)."],
  ["Skip-link", "Verborgen link die toetsenbordgebruikers in staat stelt herhalende navigatie over te slaan."],
  ["WCAG", "Web Content Accessibility Guidelines — internationale richtlijnen voor webtoegankelijkheid (W3C)."],
  ["WCAG Level A", "Basisniveau: minimale toegankelijkheidsvereisten."],
  ["WCAG Level AA", "Gangbaar conformiteitsniveau; wettelijk vereist in Nederland (Besluit digitale toegankelijkheid)."],
  ["WCAG Level AAA", "Hoogste conformiteitsniveau; wordt aanbevolen maar niet wettelijk verplicht."],
];

export function buildAppendixGlossary(): FileChild[] {
  const tableData: string[][] = [
    ["Term", "Omschrijving"],
    ...GLOSSARY,
  ];

  return [
    para("Bijlage C — Woordenlijst", { heading: HeadingLevel.HEADING_1 }),
    buildTable(tableData, [1800, 6400]),
    spacer(),
  ];
}
