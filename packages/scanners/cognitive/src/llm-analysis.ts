import type { Page } from "playwright";
import type { CognitiveFinding, CognitiveCheckResult } from "@saa/shared";

// ── LLM Cognitive Analysis (WCAG 3.1.3, 3.1.5) ──
// Uses Ollama with Gemma 3 4B for deeper content analysis.
// Falls back gracefully if Ollama is unavailable.

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "gemma3:4b";
const MAX_TEXT_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `Je bent een toegankelijkheidsexpert voor Nederlandse gemeentewebsites.
Analyseer de tekst en geef maximaal 5 bevindingen over cognitieve toegankelijkheid.
Focus op:
1. Onduidelijke zinsconstructies
2. Passief taalgebruik waar actief beter is
3. Dubbele ontkenningen
4. Zinnen met meer dan 25 woorden
5. Tekst die niet op B1-taalniveau is geschreven

Antwoord ALLEEN in JSON-formaat:
[{"issue": "korte beschrijving", "context": "het stukje tekst", "suggestion": "verbetervoorstel"}]

Als de tekst goed leesbaar is, antwoord met een lege array: []`;

interface LlmFinding {
  issue: string;
  context: string;
  suggestion: string;
}

async function queryOllama(
  ollamaUrl: string,
  text: string,
): Promise<LlmFinding[]> {
  const url = `${ollamaUrl}/api/generate`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: `Analyseer deze tekst:\n\n${text}`,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 1024,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    const responseText = data.response.trim();

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is LlmFinding =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as LlmFinding).issue === "string" &&
          typeof (item as LlmFinding).context === "string",
      )
      .slice(0, 5);
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkLlmAnalysis(
  page: Page,
  ollamaUrl?: string,
): Promise<CognitiveCheckResult> {
  const start = performance.now();
  const findings: CognitiveFinding[] = [];
  const effectiveUrl = ollamaUrl ?? DEFAULT_OLLAMA_URL;

  try {
    // Extract main content text
    const pageText = await page.evaluate(() => {
      const main = document.querySelector("main, [role='main']");
      const container = main ?? document.body;
      const skipTags = new Set(["script", "style", "noscript", "code", "pre", "nav", "footer"]);

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
        if (text && text.length > 2) texts.push(text);
      }

      return texts.join(" ");
    });

    if (pageText.length < 50) {
      return {
        check: "llm-analysis",
        findings: [],
        durationMs: Math.round(performance.now() - start),
        error: null,
      };
    }

    // Truncate to avoid excessive LLM token usage
    const truncatedText = pageText.slice(0, MAX_TEXT_LENGTH);

    let llmFindings: LlmFinding[];
    try {
      llmFindings = await queryOllama(effectiveUrl, truncatedText);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Graceful fallback — LLM is optional
      return {
        check: "llm-analysis",
        findings: [],
        durationMs: Math.round(performance.now() - start),
        error: `Ollama niet beschikbaar: ${errMsg}. LLM-analyse overgeslagen.`,
      };
    }

    for (const finding of llmFindings) {
      findings.push({
        check: "llm-analysis",
        type: "notice",
        wcagCriteria: ["3.1.5"],
        wcagLevel: "AAA",
        selector: "body",
        context: finding.context?.slice(0, 120) ?? "",
        message: `${finding.issue}${finding.suggestion ? ` — Suggestie: ${finding.suggestion}` : ""}`,
        impact: "moderate",
        confidence: 0.5,
      });
    }

    return {
      check: "llm-analysis",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: null,
    };
  } catch (err) {
    return {
      check: "llm-analysis",
      findings,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
