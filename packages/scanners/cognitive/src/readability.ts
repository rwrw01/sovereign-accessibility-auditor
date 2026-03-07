import type { Page } from "playwright";
import type { CognitiveFinding, CognitiveCheckResult, ReadabilityScore } from "@saa/shared";

// ── Readability Analysis (WCAG 3.1.5) ──
// Flesch-Douma (Dutch) and LIX readability scores.

// Dutch syllable counting heuristic
function countSyllablesDutch(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zàáâãäåèéêëìíîïòóôõöùúûüý]/g, "");
  if (w.length <= 2) return 1;

  // Count vowel groups (Dutch vowels include common diphthongs)
  const vowelGroups = w.match(/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüý]+/gi);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Silent -e at end (like English, common in Dutch)
  if (w.endsWith("e") && count > 1) {
    count--;
  }

  // Dutch compound words tend to have more syllables — -lijk, -heid, -tion
  if (w.endsWith("lijk")) count = Math.max(count, 2);
  if (w.endsWith("heid")) count = Math.max(count, 2);

  return Math.max(count, 1);
}

function calculateFleschDouma(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number,
): number {
  if (sentenceCount === 0 || wordCount === 0) return 0;

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  // Flesch-Douma formula (Dutch adaptation of Flesch Reading Ease)
  // Score = 206.835 - (0.93 × avg_words_per_sentence) - (77 × avg_syllables_per_word)
  return 206.835 - 0.93 * avgWordsPerSentence - 77 * avgSyllablesPerWord;
}

function calculateLIX(wordCount: number, sentenceCount: number, longWordCount: number): number {
  if (sentenceCount === 0) return 0;

  // LIX = (words / sentences) + (long_words * 100 / words)
  return wordCount / sentenceCount + (longWordCount * 100) / wordCount;
}

function getReadabilityLevel(fleschDouma: number): string {
  if (fleschDouma >= 80) return "zeer eenvoudig";
  if (fleschDouma >= 60) return "eenvoudig";
  if (fleschDouma >= 40) return "gemiddeld";
  if (fleschDouma >= 20) return "moeilijk";
  return "zeer moeilijk";
}

export async function checkReadability(page: Page): Promise<CognitiveCheckResult> {
  const start = performance.now();
  const findings: CognitiveFinding[] = [];

  try {
    const textContent = await page.evaluate(() => {
      const main = document.querySelector("main, [role='main']");
      const container = main ?? document.body;
      const skipTags = new Set(["script", "style", "noscript", "code", "pre"]);

      // Collect visible text without TreeWalker filter (avoids esbuild __name issue)
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const parent = n.parentElement;
        if (!parent) continue;
        if (skipTags.has(parent.tagName.toLowerCase())) continue;

        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const text = n.textContent?.trim();
        if (text && text.length >= 2) texts.push(text);
      }

      return texts.join(" ");
    });

    // Tokenize
    const sentences = textContent
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    const words = textContent
      .split(/\s+/)
      .filter((w) => w.length > 0 && /[a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüý]/.test(w));

    const wordCount = words.length;
    const sentenceCount = sentences.length;

    if (wordCount < 30) {
      return {
        check: "readability",
        findings: [],
        durationMs: Math.round(performance.now() - start),
        error: null,
      };
    }

    let syllableCount = 0;
    for (const word of words) {
      syllableCount += countSyllablesDutch(word);
    }

    const longWordCount = words.filter((w) => w.length > 6).length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;

    const fleschDouma = calculateFleschDouma(wordCount, sentenceCount, syllableCount);
    const lix = calculateLIX(wordCount, sentenceCount, longWordCount);
    const level = getReadabilityLevel(fleschDouma);

    const readabilityScore: ReadabilityScore = {
      fleschDouma: Math.round(fleschDouma * 10) / 10,
      lix: Math.round(lix * 10) / 10,
      wordCount,
      sentenceCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      level,
    };

    // WCAG 3.1.5 (AAA): Lower secondary education reading level
    // Flesch-Douma < 40 = difficult, typical government text
    if (fleschDouma < 40) {
      findings.push({
        check: "readability",
        type: "warning",
        wcagCriteria: ["3.1.5"],
        wcagLevel: "AAA",
        selector: "body",
        context: `Flesch-Douma: ${readabilityScore.fleschDouma}, LIX: ${readabilityScore.lix}, niveau: ${level}`,
        message: `Tekst is "${level}" (Flesch-Douma: ${readabilityScore.fleschDouma}) — gemeenteteksten moeten leesbaar zijn op B1-niveau (≥60)`,
        impact: "serious",
        confidence: 0.8,
      });
    }

    // Long sentences
    if (avgWordsPerSentence > 20) {
      findings.push({
        check: "readability",
        type: "warning",
        wcagCriteria: ["3.1.5"],
        wcagLevel: "AAA",
        selector: "body",
        context: `Gemiddeld ${readabilityScore.avgWordsPerSentence} woorden per zin`,
        message: `Zinnen zijn gemiddeld ${readabilityScore.avgWordsPerSentence} woorden lang — houd zinnen onder de 15-20 woorden voor optimale leesbaarheid`,
        impact: "moderate",
        confidence: 0.7,
      });
    }

    // High LIX (>45 = difficult)
    if (lix > 45) {
      findings.push({
        check: "readability",
        type: "notice",
        wcagCriteria: ["3.1.5"],
        wcagLevel: "AAA",
        selector: "body",
        context: `LIX: ${readabilityScore.lix}`,
        message: `LIX-score is ${readabilityScore.lix} (>45 = moeilijk) — overweeg kortere woorden en zinnen`,
        impact: "moderate",
        confidence: 0.7,
      });
    }

    return {
      check: "readability",
      findings,
      readabilityScore,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "readability",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
