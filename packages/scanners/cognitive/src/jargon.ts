import type { Page } from "playwright";
import type { CognitiveFinding, CognitiveCheckResult } from "@saa/shared";

// ── Jargon Detection (WCAG 3.1.3, 3.1.4) ──
// Detect government/legal jargon that reduces comprehension.
// Focus on Dutch gemeentetaal (municipal language).

const JARGON_WORDS: Map<string, string> = new Map([
  // Ambtelijk jargon
  ["bestemmingsplan", "plan over wat er gebouwd mag worden"],
  ["omgevingsvergunning", "vergunning om te bouwen of verbouwen"],
  ["bezwaarschrift", "brief waarin u het niet eens bent met een besluit"],
  ["beroepschrift", "brief aan de rechter als u het niet eens bent"],
  ["beschikking", "officieel besluit van de gemeente"],
  ["verordening", "regel die de gemeenteraad heeft vastgesteld"],
  ["mandatering", "iemand anders mag een besluit nemen namens"],
  ["beleidsregel", "regel die uitlegt hoe de gemeente een wet toepast"],
  ["uitvoeringsregeling", "regel over hoe iets precies gedaan moet worden"],
  ["zienswijze", "uw mening over een plan van de gemeente"],
  ["bekendmaking", "officieel bericht van de gemeente"],
  ["raadsbesluit", "besluit van de gemeenteraad"],
  ["collegebesluit", "besluit van burgemeester en wethouders"],
  ["subsidieverordening", "regels voor het aanvragen van subsidie"],
  ["inspraakprocedure", "manier om uw mening te geven over een plan"],
  ["ter inzage", "beschikbaar om te bekijken"],
  ["rechtsmiddelen", "manieren om bezwaar te maken"],
  ["van rechtswege", "automatisch volgens de wet"],
  ["aanslag", "rekening van de gemeente (voor belasting)"],
  ["retributie", "betaling voor een dienst van de gemeente"],
  ["leges", "kosten die u betaalt voor een aanvraag"],
  ["precario", "belasting voor gebruik van gemeentegrond"],
  ["planschade", "schade door een nieuw bestemmingsplan"],
  ["ontheffing", "toestemming om af te wijken van de regels"],
  ["dwangsom", "boete als u zich niet aan een besluit houdt"],
  ["ingebrekestelling", "brief dat de gemeente te laat is met een besluit"],
  ["voorbereidingsbesluit", "besluit dat er een nieuw plan komt"],
  ["exploitatieplan", "plan over de kosten van een bouwproject"],
  ["anterieure overeenkomst", "afspraak voordat een plan officieel is"],
  ["posterieure overeenkomst", "afspraak nadat een plan officieel is"],
  // Juridisch
  ["rechtspersoon", "organisatie met rechten en plichten"],
  ["natuurlijk persoon", "gewoon mens (niet een bedrijf)"],
  ["machtiging", "toestemming om namens iemand te handelen"],
  ["volmacht", "officiële toestemming om namens iemand te handelen"],
  ["toekennen", "goedkeuren en geven"],
  ["afwijzen", "niet goedkeuren"],
  ["intrekken", "terugdraaien van een eerder besluit"],
  // Afkortingen
  ["wmo", "Wet maatschappelijke ondersteuning"],
  ["awb", "Algemene wet bestuursrecht"],
  ["wob", "Wet openbaarheid van bestuur"],
  ["woo", "Wet open overheid"],
  ["bag", "Basisregistratie Adressen en Gebouwen"],
  ["brp", "Basisregistratie Personen"],
  ["bgt", "Basisregistratie Grootschalige Topografie"],
  ["apv", "Algemene Plaatselijke Verordening"],
  ["vng", "Vereniging van Nederlandse Gemeenten"],
  ["ggz", "geestelijke gezondheidszorg"],
]);

export async function checkJargon(page: Page): Promise<CognitiveCheckResult> {
  const start = performance.now();
  const findings: CognitiveFinding[] = [];

  try {
    const pageText = await page.evaluate(() => {
      const main = document.querySelector("main, [role='main']");
      const container = main ?? document.body;
      const skipTags = new Set(["script", "style", "noscript", "code", "pre"]);

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

      const texts: string[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const parent = n.parentElement;
        if (!parent) continue;
        if (skipTags.has(parent.tagName.toLowerCase())) continue;

        const text = n.textContent?.trim();
        if (text) texts.push(text);
      }

      return texts.join(" ");
    });

    const lowerText = pageText.toLowerCase();
    const foundJargon: Array<{ term: string; suggestion: string }> = [];

    for (const [term, suggestion] of JARGON_WORDS) {
      // Word boundary check with Unicode support
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      if (regex.test(lowerText)) {
        foundJargon.push({ term, suggestion });
      }
    }

    if (foundJargon.length > 0) {
      // Group findings to avoid excessive noise
      const topJargon = foundJargon.slice(0, 15);

      for (const { term, suggestion } of topJargon) {
        findings.push({
          check: "jargon",
          type: "warning",
          wcagCriteria: ["3.1.3", "3.1.4"],
          wcagLevel: "AAA",
          selector: "body",
          context: `Jargon gevonden: "${term}"`,
          message: `Ambtelijk jargon "${term}" gevonden — overweeg: "${suggestion}"`,
          impact: "moderate",
          confidence: 0.7,
        });
      }

      if (foundJargon.length > 15) {
        findings.push({
          check: "jargon",
          type: "notice",
          wcagCriteria: ["3.1.3"],
          wcagLevel: "AAA",
          selector: "body",
          context: `${foundJargon.length} jargontermen gevonden, eerste 15 getoond`,
          message: `Nog ${foundJargon.length - 15} extra jargontermen gevonden — overweeg de tekst te herschrijven in B1-Nederlands`,
          impact: "moderate",
          confidence: 0.6,
        });
      }
    }

    return {
      check: "jargon",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "jargon",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
