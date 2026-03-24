import {
  BorderStyle,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ITableCellOptions,
} from "docx";
import { DARK_BLUE, LIGHT_BLUE_BG } from "./docx-styles.js";

/** Single-run paragraph with optional bold/italic overrides. */
export function para(
  text: string,
  opts: { bold?: boolean; italic?: boolean; size?: number; color?: string; heading?: typeof HeadingLevel[keyof typeof HeadingLevel] } = {}
): Paragraph {
  return new Paragraph({
    heading: opts.heading,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: opts.size,
        color: opts.color,
        font: "Calibri",
      }),
    ],
  });
}

/** Bullet paragraph (one level). */
export function bullet(text: string, bold = false): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    children: [
      new TextRun({ text, bold, font: "Calibri", size: 22 }),
    ],
  });
}

/** Labelled field: "Label: value" with bold label. */
export function labeledPara(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: "Calibri", size: 22 }),
      new TextRun({ text: value, font: "Calibri", size: 22 }),
    ],
  });
}

/** Empty spacer paragraph. */
export function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

/** Standard thin border specification for table cells. */
function thinBorder(): ITableCellOptions["borders"] {
  return {
    top:    { style: BorderStyle.SINGLE, size: 4, color: "c3d5e8" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "c3d5e8" },
    left:   { style: BorderStyle.SINGLE, size: 4, color: "c3d5e8" },
    right:  { style: BorderStyle.SINGLE, size: 4, color: "c3d5e8" },
  };
}

/** Build a table from string-array rows. First row is the header. */
export function buildTable(rows: string[][], colWidths?: number[]): Table {
  const tableRows = rows.map((rowData, rowIdx) => {
    const isHeader = rowIdx === 0;
    const shading = isHeader
      ? { fill: DARK_BLUE }
      : rowIdx % 2 === 0
        ? { fill: LIGHT_BLUE_BG }
        : { fill: "FFFFFF" };

    const cells = rowData.map((cellText, colIdx) => {
      const width = colWidths?.[colIdx];
      return new TableCell({
        borders: thinBorder(),
        shading,
        width: width !== undefined ? { size: width, type: WidthType.DXA } : undefined,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                color: isHeader ? "FFFFFF" : "1a202c",
                font: "Calibri",
                size: 20,
              }),
            ],
          }),
        ],
      });
    });

    return new TableRow({ children: cells, tableHeader: isHeader });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/** Format a WCAG criterion code nicely, e.g. "1.1.1 Non-text Content". */
export function formatCriterion(c: string): string {
  return c.startsWith("wcag")
    ? c.replace(/^wcag/, "").replace(/_/g, ".").replace(/^criterion-/, "")
    : c;
}

/** Convert an impact value to Dutch. */
export function impactNL(impact: string): string {
  const map: Record<string, string> = {
    critical: "Kritiek",
    serious: "Ernstig",
    moderate: "Matig",
    minor: "Laag",
  };
  return map[impact] ?? impact;
}

/** Convert a type value to Dutch. */
export function typeNL(type: string): string {
  const map: Record<string, string> = {
    error: "Fout",
    warning: "Waarschuwing",
    notice: "Opmerking",
  };
  return map[type] ?? type;
}
