import {
  Document,
  FileChild,
  Footer,
  NumberFormat,
  Packer,
  Paragraph,
  SectionType,
  SimpleField,
  TextRun,
} from "docx";
import {
  buildAppendixGlossary,
  buildAppendixLocations,
  buildAppendixScoreboard,
  buildActionPlan,
  buildRiskAnalysis,
} from "./docx-appendices.js";
import {
  buildConclusion,
  buildGapAnalysis,
  buildPageSpecificSection,
  buildSiteWideSection,
  buildTableOfContents,
  buildTitlePage,
} from "./docx-sections.js";
import { STYLES } from "./docx-styles.js";
import type { ReportData } from "./types.js";

/**
 * Build the page-number footer shown on every page.
 * Uses SimpleField("PAGE") which is the docx v9 way to insert page numbers.
 */
function buildFooter(organisatie: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `${organisatie} — Toegankelijkheidsrapport WCAG 2.2 AA   |   Pagina `,
            font: "Calibri",
            size: 18,
            color: "6b7280",
          }),
          new SimpleField("PAGE"),
          new TextRun({ text: " / ", font: "Calibri", size: 18, color: "6b7280" }),
          new SimpleField("NUMPAGES"),
        ],
      }),
    ],
  });
}

/**
 * Generates a WCAG accessibility audit report as a DOCX buffer.
 */
export async function generateDocx(data: ReportData): Promise<Buffer> {
  const footer = buildFooter(data.input.organisatie);

  const children: FileChild[] = [
    ...buildTitlePage(data),
    ...buildTableOfContents(),
    ...buildConclusion(data),
    ...buildGapAnalysis(data),
    ...buildSiteWideSection(data),
    ...buildPageSpecificSection(data),
    ...buildActionPlan(data),
    ...buildRiskAnalysis(),
    ...buildAppendixScoreboard(data),
    ...buildAppendixLocations(data),
    ...buildAppendixGlossary(),
  ];

  const doc = new Document({
    styles: STYLES,
    numbering: {
      config: [
        {
          reference: "default-bullets",
          levels: [
            {
              level: 0,
              format: NumberFormat.BULLET,
              text: "\u2022",
              alignment: "left",
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
                run: { font: "Symbol", size: 22 },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: 1080,
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        footers: { default: footer },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
