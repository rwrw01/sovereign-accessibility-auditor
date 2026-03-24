import type { FindingNarrative } from "./types.js";
import { NARRATIVES_1X2X } from "./narratives-1x2x.js";
import { NARRATIVES_3X4X } from "./narratives-3x4x.js";

/**
 * Complete database of Dutch WCAG 2.2 narratives, keyed by criterion number (e.g. "1.1.1").
 * Covers all Level A and AA criteria required for EN 301 549 compliance.
 */
export const WCAG_NARRATIVES: Record<string, FindingNarrative> = {
  ...NARRATIVES_1X2X,
  ...NARRATIVES_3X4X,
};

/**
 * Returns a generic narrative for WCAG criteria not in the database.
 * Falls back to using the raw scanner message.
 */
export function getDefaultNarrative(criterium: string, message: string): FindingNarrative {
  return {
    watFout:
      `Criterium ${criterium}: ${message} ` +
      "Dit element voldoet niet aan de WCAG 2.2-eis voor dit criterium.",
    impactBlind:
      "Bezoekers die afhankelijk zijn van ondersteunende technologie (screenreaders, vergrotingssoftware) " +
      "kunnen mogelijk geen gebruik maken van dit onderdeel van de website.",
    impactDoof:
      "Afhankelijk van de aard van het probleem kunnen dove of slechthorende bezoekers " +
      "hinder ondervinden bij het gebruik van dit onderdeel.",
    oplossing:
      `Herstel de overtreding van WCAG 2.2 criterium ${criterium}. ` +
      "Raadpleeg de WCAG 2.2-documentatie en de bijbehorende Techniques for WCAG voor concrete implementatierichtlijnen.",
  };
}
