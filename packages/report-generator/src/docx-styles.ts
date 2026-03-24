import {
  convertInchesToTwip,
  type IStylesOptions,
  type IParagraphStyleOptions,
} from "docx";

const DARK_BLUE = "1a365d";
const MID_BLUE = "2b6cb0";
const LIGHT_BLUE_BG = "ebf4ff";
const BODY_COLOR = "1a202c";

const bodyStyle: IParagraphStyleOptions = {
  id: "Normal",
  name: "Normal",
  run: { font: "Calibri", size: 22, color: BODY_COLOR },
  paragraph: {
    spacing: { line: 338, lineRule: "auto" },
  },
};

const heading1Style: IParagraphStyleOptions = {
  id: "Heading1",
  name: "Heading 1",
  basedOn: "Normal",
  next: "Normal",
  run: { font: "Calibri", size: 32, bold: true, color: DARK_BLUE },
  paragraph: {
    spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.08) },
  },
};

const heading2Style: IParagraphStyleOptions = {
  id: "Heading2",
  name: "Heading 2",
  basedOn: "Normal",
  next: "Normal",
  run: { font: "Calibri", size: 26, bold: true, color: MID_BLUE },
  paragraph: {
    spacing: { before: convertInchesToTwip(0.16), after: convertInchesToTwip(0.06) },
  },
};

const heading3Style: IParagraphStyleOptions = {
  id: "Heading3",
  name: "Heading 3",
  basedOn: "Normal",
  next: "Normal",
  run: { font: "Calibri", size: 24, bold: true, color: DARK_BLUE },
  paragraph: {
    spacing: { before: convertInchesToTwip(0.12), after: convertInchesToTwip(0.04) },
  },
};

export const STYLES: IStylesOptions = {
  default: {
    document: {
      run: { font: "Calibri", size: 22, color: BODY_COLOR },
    },
  },
  paragraphStyles: [bodyStyle, heading1Style, heading2Style, heading3Style],
};

export {
  DARK_BLUE,
  LIGHT_BLUE_BG,
  MID_BLUE,
};
