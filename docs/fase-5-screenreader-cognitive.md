# Fase 5 — L6 Screenreader Simulatie + L7 Cognitieve Analyse

## Overzicht

Fase 5 implementeert twee scan-lagen:

- **L6 Screenreader Simulatie**: DOM-gebaseerde analyse die controleert hoe een pagina zich gedraagt voor screenreader-gebruikers
- **L7 Cognitieve Analyse**: Leesbaarheid, jargon-detectie en optionele LLM-analyse voor cognitieve toegankelijkheid

## L6 Screenreader Simulatie

### Checks

| Check | WCAG Criteria | Beschrijving |
|-------|---------------|--------------|
| `heading-order` | 1.3.1, 2.4.6, 2.4.10 | H1-H6 hiërarchie: geen overgeslagen niveaus, precies één H1 |
| `landmark-coverage` | 1.3.1, 2.4.1 | Verplichte landmarks (banner, main, contentinfo), navigatie |
| `aria-live` | 4.1.3 | Live regions voor dynamische content, correcte aria-live waarden |
| `alt-text` | 1.1.1 | Alt-tekst aanwezigheid, kwaliteit (bestandsnamen, generieke tekst) |
| `form-labels` | 1.3.1, 3.3.2, 4.1.2 | Formuliervelden met bijbehorende labels |

### API

```bash
# Scan starten
POST /api/v1/audits/:auditId/screenreader
Content-Type: application/json
{
  "url": "https://example.com",
  "viewport": { "name": "desktop", "w": 1280, "h": 1024 },
  "checks": ["heading-order", "landmark-coverage", "aria-live", "alt-text", "form-labels"]
}

# Resultaat ophalen
GET /api/v1/audits/:auditId/screenreader/:scanId
```

### Architectuur

- Alle checks draaien op dezelfde geladen pagina (read-only DOM analyse)
- Geen Guidepup/screenreader dependency — cross-platform compatibel
- BullMQ queue: `l6-screenreader`, concurrency=2
- Eigen SSRF blocklist per security-architectuur

## L7 Cognitieve Analyse

### Checks

| Check | WCAG Criteria | Beschrijving |
|-------|---------------|--------------|
| `readability` | 3.1.5 (AAA) | Flesch-Douma (NL) + LIX leesbaarheidsscores |
| `jargon` | 3.1.3, 3.1.4 (AAA) | Detectie van ambtelijk/gemeentelijk jargon met suggesties |
| `llm-analysis` | 3.1.5 (AAA) | Ollama/Gemma 3 4B analyse van zinsconstructie en complexiteit |

### Flesch-Douma Score

Nederlandse adaptatie van Flesch Reading Ease:
- Score = 206.835 - (0.93 x gem. woorden/zin) - (77 x gem. lettergrepen/woord)
- >= 80: zeer eenvoudig
- >= 60: eenvoudig (B1 doelniveau)
- >= 40: gemiddeld
- >= 20: moeilijk
- < 20: zeer moeilijk

### Jargon Woordenlijst

50+ ambtelijke/gemeentelijke termen met duidelijke alternatieven:
- "bestemmingsplan" → "plan over wat er gebouwd mag worden"
- "omgevingsvergunning" → "vergunning om te bouwen of verbouwen"
- "bezwaarschrift" → "brief waarin u het niet eens bent met een besluit"
- WMO, AWB, WOO, BAG, BRP, APV en meer afkortingen

### LLM Analyse (Optioneel)

- Gebruikt Ollama met Gemma 3 4B model
- Temperature: 0 voor deterministische output
- Graceful fallback als Ollama niet beschikbaar is
- Analyseert: passief taalgebruik, dubbele ontkenningen, lange zinnen, niet-B1 tekst
- Confidence: 0.5 (LLM resultaten zijn indicatief)

### API

```bash
# Scan starten
POST /api/v1/audits/:auditId/cognitive
Content-Type: application/json
{
  "url": "https://www.amsterdam.nl",
  "viewport": { "name": "desktop", "w": 1280, "h": 1024 },
  "checks": ["readability", "jargon", "llm-analysis"],
  "ollamaUrl": "http://ollama:11434"
}

# Resultaat ophalen
GET /api/v1/audits/:auditId/cognitive/:scanId
```

## Docker Compose

### L6 Scanner Service
```yaml
scanner-l6:
  build: packages/scanners/screenreader/Dockerfile
  networks: [redis-net, scanner-net]
  security: read_only, no-new-privileges, cap_drop ALL
  memory: 2GB limit
```

### L7 Scanner Service
```yaml
scanner-l7:
  build: packages/scanners/cognitive/Dockerfile
  networks: [redis-net, scanner-net, cognitive-net]
  environment: OLLAMA_URL=http://ollama:11434

ollama:
  image: ollama/ollama:0.6.2
  networks: [cognitive-net]  # alleen L7 scanner kan erbij
  memory: 8GB limit, OLLAMA_NUM_PARALLEL=1
```

### Network Isolatie
- `cognitive-net` (internal): alleen L7 scanner ↔ Ollama
- L7 scanner heeft GEEN directe database-toegang
- Ollama heeft GEEN internet-toegang (internal network)

## Smoke Test Resultaten

### L6 op example.com
- **Status**: voltooid
- **Bevindingen**: 5 (landmark-coverage errors — example.com mist header/main/footer/nav)
- **Alle 5 checks**: succesvol, geen errors
- **Duur**: ~2.2s

### L7 op amsterdam.nl
- **Status**: voltooid
- **Bevindingen**: 3 (readability warnings)
  - Flesch-Douma: 17.3 (zeer moeilijk)
  - LIX: 76 (moeilijk)
  - Gem. 32.5 woorden per zin
- **ReadabilityScore** correct berekend
- **Jargon**: 0 (homepage bevat weinig specifiek jargon)
- **Duur**: ~3.8s

## Technische Details

### esbuild/tsx Compatibiliteit
- `page.evaluate()` callbacks mogen geen `function` declarations bevatten — esbuild voegt `__name` decorators toe die in de browser niet bestaan
- Oplossing: inline logica in plaats van helper-functies, of arrow functions buiten evaluate
- TreeWalker filters als objecten met `acceptNode` methode veroorzaken hetzelfde probleem — opgelost door plain loop + conditie

### Bestanden

**L6 Screenreader** (`packages/scanners/screenreader/`)
- `src/heading-order.ts` — H1-H6 hiërarchie validatie
- `src/landmark-coverage.ts` — Landmark detectie en coverage
- `src/aria-live.ts` — Live region validatie
- `src/alt-text.ts` — Alt-tekst kwaliteit
- `src/form-labels.ts` — Formulier label associatie
- `src/orchestrator.ts` — Shared browser, alle checks op één pagina
- `src/worker.ts` — BullMQ worker
- `src/url-validator.ts` — SSRF blocklist
- `Dockerfile` — Hardened multi-stage build

**L7 Cognitive** (`packages/scanners/cognitive/`)
- `src/readability.ts` — Flesch-Douma + LIX scores
- `src/jargon.ts` — Ambtelijk jargon detectie (50+ termen)
- `src/llm-analysis.ts` — Ollama/Gemma integratie
- `src/orchestrator.ts` — Shared browser
- `src/worker.ts` — BullMQ worker
- `src/url-validator.ts` — SSRF blocklist
- `Dockerfile` — Hardened multi-stage build

**API Routes**
- `packages/api/src/routes/screenreader.ts`
- `packages/api/src/routes/cognitive.ts`
