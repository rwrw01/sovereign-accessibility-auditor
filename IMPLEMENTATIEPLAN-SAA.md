# Implementatieplan: Sovereign Accessibility Auditor (SAA)

**Versie**: 1.1
**Datum**: 2026-03-06
**Status**: CONCEPT — review-feedback verwerkt

---

## 1. Visie en Doel

De Sovereign Accessibility Auditor (SAA) is een open-source, soeverein toegankelijkheidsaudit-platform voor Nederlandse gemeenten. Het combineert 7 geautomatiseerde testlagen om WCAG 2.1 AA-dekking te verhogen van ~30% (huidige tooling) naar ~65%.

**Kernprincipes:**
- Soeverein: volledig zelf te hosten, geen vendor lock-in
- Veilig: OWASP Top 10, Defense in Depth, BIO-compliant
- Toegankelijk: het platform zelf voldoet aan WCAG 2.1 AA (dogfooding)
- Open: EUPL-1.2 licentie, Common Ground componentencatalogus
- Bruikbaar: NL Design System, Nielsen heuristieken, B1 taalniveau

---

## 2. Architectuur

### 2.1 Common Ground 5-Lagen

```
┌─────────────────────────────────────────────────────────┐
│  LAAG 1 — INTERACTIE                                    │
│  Next.js dashboard + NL Design System                   │
│  DigiD/eHerkenning login (gemeente-context)             │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (OpenAPI 3.x)
┌────────────────────────▼────────────────────────────────┐
│  LAAG 2 — PROCES                                        │
│  Scan Orchestrator (BullMQ op Redis)                    │
│  Elke audit = zaak met status + audit trail             │
└───┬───┬───┬───┬───┬───┬───┬─────────────────────────────┘
    │   │   │   │   │   │   │
 ┌──▼┐┌─▼─┐┌▼──┐┌▼──┐┌▼──┐┌▼──┐┌─▼──┐
 │L1 ││L2 ││L3 ││L4 ││L5 ││L6 ││L7 │   LAAG 4 — SERVICES
 │Eng││Vis ││Bhv││Tre││Tgt││Scr││Cog│
 └─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘
   └─────┴────┴────┴────┴────┴────┘
                    │
         ┌──────────▼──────────┐
         │  LAAG 3 — INTEGRATIE │
         │  API Gateway (Traefik)│
         │  OAuth 2.0, rate limit│
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  LAAG 5 — DATA      │
         │  PostgreSQL (encrypted)│
         │  Resultaten + config  │
         └─────────────────────┘
```

### 2.2 De 7 Scan-Services

| # | Service | Technologie | Test-doel | WCAG-dekking |
|---|---------|-------------|-----------|--------------|
| L1 | Multi-engine scanner | Pa11y 8 + axe-core + IBM Equal Access | Statische DOM-analyse, ARIA, contrast, semantiek | 1.1.1, 1.3.1, 1.4.3, 1.4.11, 2.4.2, 2.4.4, 2.4.6, 3.1.1, 4.1.1, 4.1.2 |
| L2 | Visual regression | Playwright + pixelmatch | Reflow (320px), text-spacing, zoom 200% | 1.4.4, 1.4.10, 1.4.12 |
| L3 | Behavioral tests | Playwright scripts | Toetsenbordnavigatie, focus traps, hover/focus content | 2.1.1, 2.1.2, 2.4.3, 2.4.7, 1.4.13 |
| L4 | A11y tree diffing | Playwright accessibility snapshots | Structuurverschillen desktop vs mobiel, missing roles | 1.3.1, 1.3.2, 1.3.4, 4.1.2, 4.1.3 |
| L5 | Touch target meting | Playwright boundingBox() | Elementen kleiner dan 44x44px | 2.5.5 (AAA als signaal), 2.5.8 |
| L6 | Screenreader simulatie | @guidepup/virtual-screen-reader | Ontbrekende announcements, leesrichting (confidence score per bevinding) | 1.3.1, 1.3.2, 2.4.1, 4.1.2, 4.1.3 |
| L7 | Cognitieve toegankelijkheid | Ollama + Gemma 3 + Flesch-Douma | B1 taalniveau, complexe zinnen, jargon-detectie | 3.1.5 (AAA als signaal), cognitieve last |

---

## 3. Technologie-Stack

### 3.1 Runtime & Frameworks

| Component | Technologie | Versie (pinned) | Motivatie |
|-----------|-------------|-----------------|-----------|
| Frontend | Next.js | 15.3.3 | SSR, API routes, React ecosystem |
| UI componenten | NL Design System (Utrecht) | latest stable | Overheids design standaard |
| Backend API | Node.js + Fastify | Node 20 LTS, Fastify 5.x | Snelle JSON API, TypeScript |
| Taak-queue | BullMQ | 5.x | Redis-backed, betrouwbaar, retry logic |
| Database | PostgreSQL | 16 | Encrypted at rest, JSON support |
| Cache/queue backend | Redis | 7.x | BullMQ backend, session store |
| Scanner runtime | Playwright | 1.49.x | Chromium + Firefox, multi-viewport |
| WCAG engine 1 | Pa11y | 8.0.0 | HTML_CodeSniffer |
| WCAG engine 2 | @axe-core/playwright | 4.x | Deque axe-core |
| WCAG engine 3 | @ibma/aat | latest stable | IBM Equal Access |
| Screenreader sim | @guidepup/virtual-screen-reader | 1.x | NVDA/VoiceOver simulatie |
| LLM runtime | Ollama | 0.6.x | Lokaal, soeverein, geen cloud |
| LLM model | Gemma 3 (4B) | gemma3:4b | Licht, draait op CPU, Nederlands |
| Readability | eigen module | n/a | Flesch-Douma + LIX (Leesindex) |
| Rapportgeneratie | python-docx + WeasyPrint | pinned | DOCX + PDF export |
| Container | Docker + Docker Compose | 27.x | Haven-compatibel |
| Orchestratie | Kubernetes (optioneel) | 1.29+ | Haven-compliant deployment |
| Reverse proxy | Traefik | 3.x | TLS termination, rate limiting |
| Auth | NextAuth.js + DigiD SAML | 5.x | Overheids-authenticatie |

### 3.2 Ontwikkeltalen

- **TypeScript** — Frontend, API, scan-services (type safety)
- **Python** — Rapportgeneratie (python-docx, WeasyPrint)
- **SQL** — Database migraties (via Drizzle ORM)

---

## 4. Directory-Structuur

```
sovereign-accessibility-auditor/
├── publiccode.yml                    # Common Ground catalogus
├── LICENSE                           # EUPL-1.2
├── README.md
├── CHANGELOG.md
├── SECURITY.md                       # Responsible disclosure
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, audit, build
│   │   ├── security-scan.yml         # Dependency audit + SAST
│   │   └── container-sign.yml        # Cosign image signing
│   └── CODEOWNERS
├── helm/                             # Haven-compliant Helm charts
│   └── saa/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── docker-compose.yml                # Lokale ontwikkeling
├── docker-compose.prod.yml           # Productie (hardened)
├── packages/
│   ├── dashboard/                    # Next.js frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app/                  # App router
│   │   │   │   ├── layout.tsx        # Root layout met NL Design System
│   │   │   │   ├── page.tsx          # Dashboard overzicht
│   │   │   │   ├── audits/           # Audit beheer
│   │   │   │   ├── rapportage/       # Rapport weergave
│   │   │   │   └── instellingen/     # Configuratie
│   │   │   ├── components/           # NL Design System wrappers
│   │   │   └── lib/                  # API client, auth
│   │   └── Dockerfile
│   ├── api/                          # Fastify REST API
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── audits.ts         # CRUD audits
│   │   │   │   ├── scans.ts          # Scan triggers
│   │   │   │   └── reports.ts        # Rapport endpoints
│   │   │   ├── services/
│   │   │   │   ├── orchestrator.ts   # BullMQ job scheduling
│   │   │   │   └── deduplicator.ts   # Cross-engine deduplicatie
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # OAuth/session validatie
│   │   │   │   ├── rate-limit.ts     # Rate limiting
│   │   │   │   └── validate.ts       # Zod input validatie
│   │   │   └── db/
│   │   │       ├── schema.ts         # Drizzle ORM schema
│   │   │       └── migrations/
│   │   ├── openapi.yaml              # OpenAPI 3.x specificatie
│   │   └── Dockerfile
│   ├── scanners/                     # 7 scan-services
│   │   ├── multi-engine/             # L1: Pa11y + axe-core + IBM
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── engines/
│   │   │   │   │   ├── pa11y.ts
│   │   │   │   │   ├── axe.ts
│   │   │   │   │   └── ibm-aat.ts
│   │   │   │   └── dedup.ts          # Issue deduplicatie
│   │   │   └── Dockerfile
│   │   ├── visual-regression/        # L2: Screenshot diff
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── capture.ts        # Screenshot maken
│   │   │   │   ├── compare.ts        # Pixelmatch vergelijking
│   │   │   │   └── scenarios.ts      # Reflow, zoom, text-spacing
│   │   │   └── Dockerfile
│   │   ├── behavioral/               # L3: Keyboard/focus tests
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── keyboard.ts       # Tab-navigatie test
│   │   │   │   ├── focus-trap.ts     # Focus trap detectie
│   │   │   │   └── hover-focus.ts    # 1.4.13 hover/focus content
│   │   │   └── Dockerfile
│   │   ├── a11y-tree/                # L4: Accessibility tree diff
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── snapshot.ts       # Tree snapshot maken
│   │   │   │   └── diff.ts           # Desktop vs mobiel diff
│   │   │   └── Dockerfile
│   │   ├── touch-targets/            # L5: Touch target meting
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   └── measure.ts        # boundingBox() meting
│   │   │   └── Dockerfile
│   │   ├── screenreader/             # L6: Virtual screenreader
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   └── simulate.ts       # Guidepup simulatie
│   │   │   └── Dockerfile
│   │   └── cognitive/                # L7: Cognitieve a11y
│   │       ├── package.json
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   ├── readability.ts    # Flesch-Douma + LIX
│   │       │   ├── llm-analysis.ts   # Ollama/Gemma B1 check
│   │       │   └── jargon.ts         # Overheids-jargon detectie
│   │       └── Dockerfile
│   └── report-generator/             # Rapportage service
│       ├── requirements.txt
│       ├── src/
│       │   ├── generate_docx.py
│       │   ├── generate_pdf.py
│       │   └── templates/
│       └── Dockerfile
├── docs/
│   ├── gebruikershandleiding.md
│   ├── beheerhandleiding.md
│   ├── api-specificatie.yaml         # Symlink naar packages/api/openapi.yaml
│   └── architectuur.md
└── tests/
    ├── e2e/                          # Playwright E2E tests
    │   ├── dashboard.spec.ts
    │   └── scan-flow.spec.ts
    ├── integration/                  # API integration tests
    └── dogfood/                      # SAA scant zichzelf
        └── self-audit.spec.ts
```

---

## 5. Fasering

### Fase 0: Fundament (Week 1-2)

**Doel**: Monorepo opzetten, CI/CD, basale infrastructuur.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Monorepo initialiseren | `package.json` (workspace), `tsconfig.json` | `npm install` werkt |
| `publiccode.yml` schrijven | Bestand in repo root | Valideert tegen schema |
| Docker Compose basis | `docker-compose.yml` met PostgreSQL + Redis | `docker compose up` start DB + Redis |
| CI/CD pipeline | GitHub Actions: lint, test, audit, build | Pipeline groen op lege repo |
| Security baseline | `.npmrc` (`save-exact=true`), `SECURITY.md` | `npm audit` = 0 critical/high |
| Database schema | Drizzle ORM schema + eerste migratie | Tabellen: audits, scans, issues, users |

**Database schema (kern):**
```sql
-- audits: een volledige audit-run
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gemeente_id VARCHAR(64) NOT NULL,        -- organisatie
    naam VARCHAR(255) NOT NULL,               -- "Audit leiden.nl maart 2026"
    doel_urls JSONB NOT NULL,                 -- [{name, url}]
    viewports JSONB NOT NULL DEFAULT '[{"name":"desktop","w":1280,"h":1024},{"name":"mobiel","w":375,"h":667}]',
    status VARCHAR(32) NOT NULL DEFAULT 'nieuw',  -- nieuw, actief, voltooid, mislukt
    aangemaakt_op TIMESTAMPTZ DEFAULT NOW(),
    voltooid_op TIMESTAMPTZ,
    aangemaakt_door UUID REFERENCES users(id)
);

-- scans: per URL per viewport per scanner-laag
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,
    pagina_naam VARCHAR(255),
    viewport VARCHAR(32),                     -- "desktop" / "mobiel"
    scanner_laag VARCHAR(32) NOT NULL,        -- "L1".."L7"
    status VARCHAR(32) NOT NULL DEFAULT 'wachtend',
    resultaat JSONB,
    foutmelding TEXT,
    gestart_op TIMESTAMPTZ,
    voltooid_op TIMESTAMPTZ
);

-- issues: gededupliceerde bevindingen
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL,                -- error, warning, notice
    wcag_criterium VARCHAR(16),               -- "1.4.3", "2.1.1"
    wcag_niveau VARCHAR(4),                   -- "A", "AA", "AAA"
    bron_engine VARCHAR(32),                  -- "pa11y", "axe-core", "ibm-aat"
    selector TEXT,
    context TEXT,
    boodschap TEXT NOT NULL,
    pagina_url VARCHAR(2048),
    viewport VARCHAR(32),
    ernst VARCHAR(16) DEFAULT 'gemiddeld'     -- kritiek, ernstig, gemiddeld, laag
);

-- users: gemeentegebruikers
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gemeente_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    naam VARCHAR(255),
    rol VARCHAR(32) NOT NULL DEFAULT 'auditor', -- admin, auditor, viewer
    aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);
```

### Fase 1: Multi-Engine Scanner — L1 (Week 3-4)

**Doel**: Drie WCAG-engines parallel draaien en resultaten dedupliceren.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Pa11y wrapper schrijven | `scanners/multi-engine/src/engines/pa11y.ts` | Scant URL, retourneert gestandaardiseerd issue-formaat |
| axe-core wrapper | `scanners/multi-engine/src/engines/axe.ts` | Idem via @axe-core/playwright |
| IBM Equal Access wrapper | `scanners/multi-engine/src/engines/ibm-aat.ts` | Idem via @ibma/aat |
| Issue-deduplicatie | `scanners/multi-engine/src/dedup.ts` | Dezelfde fout van 3 engines = 1 issue met 3 bronnen |
| BullMQ worker | L1 worker luistert op queue | Verwerkt scan-jobs asynchroon |
| API endpoint | `POST /api/v1/audits/{id}/scan` | Start scan, retourneert job-ID |
| Dockerfile (hardened) | `read_only`, `no-new-privileges`, non-root | Container security checklist passed |
| Integratietest | Test met bekende pagina | 3 engines produceren gededupliceerde resultaten |

**Deduplicatie-logica:**
- Match op: WCAG-criterium + genormaliseerde CSS-selector + pagina-URL + viewport
- Selector-normalisatie: strip dynamische ID's (bijv. `#nextjs-123` → `[data-testid]` of tag-based fallback)
- Bij match: combineer bronnen, gebruik ernstigste classificatie (pessimistisch model)
- Unieke issues behouden met engine-bron markering
- **ACT-rules mapping**: Gebruik W3C ACT Rules (Accessibility Conformance Testing) als bruglaag tussen engine-specifieke regel-ID's en WCAG Success Criteria. Dit voorkomt dat axe-core `color-contrast` en Pa11y `WCAG2AA.Principle1.Guideline1_4.1_4_3` als verschillende issues worden geteld.
- Mapping-tabel `act-rules-map.json` bevat per ACT-rule: axe-core rule ID, Pa11y HTMLCS code, IBM AAT rule ID → unified WCAG SC

**Confidence scoring (L6):**
- Elke L6-bevinding krijgt een confidence score (0.0-1.0) gebaseerd op:
  - Determinisme: statische tree-analyse = 1.0, timing-afhankelijke checks = 0.6-0.8
  - Bevindingen met confidence <0.7 worden gemarkeerd als "handmatige verificatie aanbevolen"

### Fase 2: Visual Regression — L2 (Week 5-6)

**Doel**: Visuele tests voor reflow, zoom en text-spacing.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Screenshot-capturer | `capture.ts` — Playwright screenshots op 6 viewports | Screenshots opgeslagen per viewport |
| Reflow test (1.4.10) | Screenshot bij 320px breed | Geen horizontale scrollbar detectie |
| Zoom test (1.4.4) | Screenshot bij 200% zoom | Layout vergelijking met baseline |
| Text-spacing test (1.4.12) | CSS override injecteren, screenshot vergelijken | Content niet afgesneden na spacing-aanpassing |
| Pixelmatch vergelijking | `compare.ts` — diff-afbeeldingen genereren | Diff-score + visuele diff-output |
| BullMQ worker | L2 worker | Verwerkt visual regression jobs |
| Dockerfile (hardened) | Playwright + Chromium minimal image | Security baseline |

**Test-scenarios:**
```
Scenario 1 — Reflow:
  1. Screenshot bij 1280px breed (baseline)
  2. Screenshot bij 320px breed
  3. Detecteer: horizontale scrollbar, overflow:hidden content, overlappende elementen

Scenario 2 — Zoom 200%:
  1. Screenshot bij 100% zoom (baseline)
  2. Screenshot bij 200% zoom (deviceScaleFactor: 2 + viewport halveren)
  3. Detecteer: afgesneden content, overlappende elementen

Scenario 3 — Text-spacing:
  1. Screenshot normaal (baseline)
  2. Injecteer CSS: line-height:1.5em, letter-spacing:0.12em, word-spacing:0.16em, paragraph-spacing:2em
  3. Detecteer: afgesneden tekst, overlappende elementen
```

### Fase 3: Behavioral Tests — L3 (Week 7-8)

**Doel**: Toetsenbordnavigatie, focus management en interactietests.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Keyboard navigator | `keyboard.ts` — Tab door hele pagina | Alle interactieve elementen bereikbaar |
| Focus trap detector | `focus-trap.ts` — Detecteer onontsnappbare focus | Geen element waar Tab+Shift-Tab niet uit kan |
| Focus visibility checker | Focus-indicator detectie op elk element | Elke gefocuste element heeft zichtbare indicator |
| Hover/focus content test (1.4.13) | Hover-content: dismissable, hoverable, persistent | Tooltips/dropdowns voldoen aan 1.4.13 |
| Skip-link detector (2.4.1) | Eerste focusbare element = skip link | Skip-link aanwezig en functioneel |
| BullMQ worker + Dockerfile | L3 service | Security baseline |

### Fase 4: A11y Tree Diff + Touch Targets — L4 & L5 (Week 9-10)

**Doel**: Accessibility tree vergelijking en touch target meting.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| A11y tree snapshot | `snapshot.ts` — `page.accessibility.snapshot()` | Volledige tree per viewport |
| Desktop vs mobiel diff | `diff.ts` — Structurele vergelijking | Ontbrekende roles/landmarks in mobiel gedetecteerd |
| Portrait vs landscape diff | Vergelijking 375x667 vs 667x375 | Orientatie-afhankelijke issues |
| Touch target scanner | `measure.ts` — boundingBox() op alle interactieve elementen | Lijst van elementen < 44x44px |
| Touch target rapportage | Visuele overlay met te kleine elementen | Screenshot met markering |
| BullMQ workers + Dockerfiles | L4 + L5 services | Security baseline |

### Fase 5: Screenreader + Cognitief — L6 & L7 (Week 11-13)

**Doel**: Virtual screenreader simulatie en cognitieve toegankelijkheidsanalyse.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Virtual screenreader setup | Guidepup integratie | Navigeert door pagina, leest elementen voor |
| Heading-volgorde check | H1-H6 hierarchie validatie via screenreader | Geen overgeslagen niveaus |
| Landmark navigatie | Screenreader navigeert per landmark | Alle secties hebben landmarks |
| Live region test | Detecteer ontbrekende aria-live | Dynamische content wordt aangekondigd |
| Flesch-Douma module | `readability.ts` — Nederlandse leesbaarheidsindex | Score per pagina, markering >B1 |
| LIX (Leesindex) module | Alternatieve readability metric | Cross-validatie met Flesch-Douma |
| Ollama/Gemma integratie | `llm-analysis.ts` — Tekst beoordeling (temperature: 0 voor determinisme) | B1-niveau beoordeling, jargon-detectie |
| Overheids-jargon woordenlijst | `jargon.ts` — Bekende jargon-termen markeren | Lijst van complexe termen met suggesties |
| BullMQ workers + Dockerfiles | L6 + L7 services | Security baseline, Ollama als sidecar |

**Ollama deployment-model:**
```yaml
# Ollama draait als aparte service, niet in scanner-container
services:
  ollama:
    image: ollama/ollama:0.6
    volumes:
      - ollama-models:/root/.ollama
    networks:
      - cognitive-net           # Alleen L7 scanner heeft toegang
    deploy:
      resources:
        limits:
          memory: 8G            # 4GB onvoldoende voor stabiele Gemma 3 4B inferentie
          cpus: "4"
    environment:
      - OLLAMA_NUM_PARALLEL=1   # Geen concurrent inferentie, voorkomt OOM
    read_only: true
    security_opt:
      - no-new-privileges:true
```

### Fase 6: Dashboard + Rapportage (Week 14-17)

**Doel**: Gebruikersinterface en rapportgeneratie.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Dashboard layout | Next.js App Router + NL Design System | Responsive, WCAG 2.1 AA compliant |
| Audit-overzicht pagina | Lijst van audits met status/scores | Sorteerbaar, filterbaar |
| Audit-detail pagina | Per audit: issues per laag, per pagina, per viewport | Drill-down naar individuele issues |
| Scan starten flow | Formulier: URLs invoeren, viewports kiezen, scan starten | Inline validatie, bevestigingsdialoog |
| Real-time voortgang | WebSocket/SSE: scan-voortgang per job | Progress bar, live status updates |
| Rapport-export | DOCX + PDF + JSON + CSV export | python-docx + WeasyPrint |
| Rapport template | Professioneel rapport met management samenvatting | Conform documentatie-skill structuur |
| DigiD/eHerkenning mock | NextAuth.js met SAML provider (mock voor dev) | Login flow werkt |
| Dogfood test | SAA scant eigen dashboard | 0 critical/high WCAG issues |

**Dashboard pagina's:**
```
/                       → Dashboard overzicht (recente audits, scores)
/audits                 → Audit-lijst (filteren op gemeente, status, datum)
/audits/nieuw           → Nieuwe audit starten
/audits/[id]            → Audit-detail (issues, scores, voortgang)
/audits/[id]/rapport    → Rapport weergave + export
/instellingen           → Profiel, gemeente-config, API keys
/help                   → Contextgevoelige hulp
```

### Fase 7: Hardening + Haven (Week 18-20)

**Doel**: Productie-hardening, Helm charts, documentatie.

| Taak | Deliverable | Criterium |
|------|-------------|-----------|
| Container hardening | Alle containers: read-only FS, no-new-privileges, cap_drop ALL, non-root | Security checklist 100% |
| Netwerksegmentatie | Elke scanner in eigen Docker network | Geen inter-scanner communicatie mogelijk |
| mTLS service-to-service | Interne communicatie versleuteld | Geen plaintext intern verkeer |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | A-rating op securityheaders.com |
| SSRF bescherming | URL-validatie: blocklist interne netwerken | Geen scans op 10.x, 172.16.x, 169.254.x, localhost |
| Rate limiting | Per API endpoint: 100 req/min viewer, 20 req/min scan-trigger | Geen abuse mogelijk |
| Helm charts | `helm/saa/` — Haven-compliant | `helm install` werkt op K8s cluster |
| SBOM generatie | CycloneDX SBOM bij elke release | Volledige dependency-lijst |
| Cosign image signing | Alle container images gesigneerd | Signature verifieerbaar |
| `npm audit` gate | CI blokkeert bij critical/high | Automatische blokkade |
| Gebruikershandleiding | `docs/gebruikershandleiding.md` | Nederlands, B1 taalniveau |
| Beheerhandleiding | `docs/beheerhandleiding.md` | Installatie, configuratie, troubleshooting |
| OpenAPI spec | `docs/api-specificatie.yaml` | Valideert tegen OpenAPI 3.x |
| Penetratietest (passief) | Grep op hardcoded secrets, .env exposure | 0 bevindingen |

---

## 6. Security Architectuur (Detail)

### 6.1 Container Security per Service

```yaml
# Template voor elke scanner-service
services:
  scanner-lx:
    build:
      context: ./packages/scanners/<naam>
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp:noexec,nosuid,size=256m
    user: "10001:10001"
    networks:
      - scanner-lx-net          # Eigen geïsoleerd netwerk
      - redis-net               # Alleen voor BullMQ
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2"
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 5s
      retries: 3
```

**Globale concurrency limiet:**
Playwright + Chromium verbruikt ~300-500MB per instantie. Bij 7 scanners parallel kan dit leiden tot OOM.
Oplossing: BullMQ globale concurrency op Redis-niveau:
```typescript
// orchestrator.ts — globale limiet over alle scanner-workers
const globalLimiter = new RateLimiter({
  max: 4,              // Max 4 gelijktijdige Playwright-instanties over ALLE scanners
  duration: 1000,      // Per seconde
});
// Elke scanner-worker checkt limiter vóór Playwright.launch()
```
Bij 16GB RAM server: max 4 concurrent Playwright = ~2GB + overhead = veilig binnen limieten.

### 6.2 Netwerksegmentatie

```
┌─────────────┐
│  internet    │
└──────┬──────┘
       │ :443 (TLS)
┌──────▼──────┐
│   Traefik    │ ── frontend-net ── Dashboard
│  (gateway)   │ ── api-net ─────── API
└──────────────┘
                    API ── redis-net ── Redis
                    API ── db-net ───── PostgreSQL

                    Redis ── scanner-L1-net ── L1 Scanner
                    Redis ── scanner-L2-net ── L2 Scanner
                    Redis ── scanner-L3-net ── L3 Scanner
                    Redis ── scanner-L4-net ── L4 Scanner
                    Redis ── scanner-L5-net ── L5 Scanner
                    Redis ── scanner-L6-net ── L6 Scanner
                    Redis ── scanner-L7-net ── L7 Scanner

                    L7 Scanner ── cognitive-net ── Ollama
```

Elke scanner kan ALLEEN:
1. Redis bereiken (voor job-queue)
2. Het internet bereiken (voor scan-targets)
3. L7 kan daarnaast Ollama bereiken

Scanners kunnen NIET:
- De database bereiken (alleen via API)
- Elkaar bereiken
- Het dashboard bereiken
- Interne netwerken scannen (SSRF blocklist)

### 6.3 RBAC Model

| Rol | Rechten |
|-----|---------|
| **admin** | Gemeente-instellingen beheren, gebruikers beheren, alle audits zien/starten/verwijderen |
| **auditor** | Audits starten, eigen audits zien, rapporten exporteren |
| **viewer** | Alleen eigen gemeente-audits inzien, rapporten downloaden |

---

## 7. API Ontwerp (NL API Strategie)

### 7.1 Endpoints

```
POST   /api/v1/audits                    # Nieuwe audit aanmaken
GET    /api/v1/audits                    # Lijst audits (paginering, filtering)
GET    /api/v1/audits/{id}               # Audit detail
DELETE /api/v1/audits/{id}               # Audit verwijderen
POST   /api/v1/audits/{id}/start         # Scan starten
GET    /api/v1/audits/{id}/status        # Scan voortgang (SSE)
GET    /api/v1/audits/{id}/issues        # Issues (paginering, filtering)
GET    /api/v1/audits/{id}/rapport       # Rapport downloaden (?format=docx|pdf|json|csv)
GET    /api/v1/health                    # Health check
GET    /api/v1/openapi.yaml              # API specificatie
```

### 7.2 Foutafhandeling (RFC 7807)

```json
{
    "type": "https://saa.example.nl/fouten/validatie",
    "title": "Validatiefout",
    "status": 422,
    "detail": "De opgegeven URL 'htps://example' is geen geldige HTTPS URL.",
    "instance": "/api/v1/audits"
}
```

### 7.3 Paginering

```
GET /api/v1/audits/{id}/issues?page=2&pageSize=50&sort=-ernst&filter[type]=error
```

Response headers:
```
X-Total-Count: 342
X-Page: 2
X-Page-Size: 50
Link: </api/v1/audits/{id}/issues?page=1>; rel="first",
      </api/v1/audits/{id}/issues?page=3>; rel="next",
      </api/v1/audits/{id}/issues?page=7>; rel="last"
```

---

## 8. MVP Scope vs. Volledige Scope

### MVP (Fase 0-3, Week 1-8): Minimaal Levensvatbaar Product

- L1 Multi-engine scanner (Pa11y + axe-core + IBM)
- L2 Visual regression (reflow + zoom)
- L3 Behavioral tests (keyboard + focus)
- CLI interface (geen dashboard nog)
- JSON + DOCX rapport-export
- Docker Compose deployment
- Eén gemeente, geen auth

**MVP kan al meer dan huidige Pa11y-only aanpak:**
- 3 engines i.p.v. 1 → meer issues gevonden
- Deduplicatie → geen duplicaten in rapport
- Visuele reflow/zoom tests → WCAG 1.4.4, 1.4.10, 1.4.12 afgedekt
- Keyboard tests → WCAG 2.1.1, 2.1.2, 2.4.7 afgedekt

### Volledige Scope (Fase 0-7, Week 1-20)

Alles hierboven, plus:
- L4-L7 scanners (tree diff, touch targets, screenreader, cognitief)
- Dashboard met NL Design System
- Multi-tenant (meerdere gemeenten)
- DigiD/eHerkenning authenticatie
- Haven-compliant Helm charts
- SBOM + signed images

---

## 9. Kwaliteitsbewaking

### 9.1 Testen

| Type | Tool | Scope |
|------|------|-------|
| Unit tests | Vitest | Alle services: deduplicatie, readability, URL-validatie |
| Integration tests | Vitest + testcontainers | API + database + Redis |
| E2E tests | Playwright | Dashboard user flows (happy + bad flows) |
| Security tests | `npm audit`, SAST (CodeQL) | Elke PR |
| Dogfood test | SAA scant zichzelf | Dashboard WCAG 2.1 AA = 0 critical |
| Performance | k6 | API endpoints: <200ms p95 |

### 9.2 E2E Test Scenarios (Playwright)

Alle E2E tests draaien tegen een volledige Docker Compose stack (API + DB + Redis + scanners).

#### Happy Flows

**HF-01: Nieuwe audit aanmaken en starten**
```
1. Login als auditor
2. Navigeer naar /audits/nieuw
3. Vul auditnaam in: "Test audit leiden.nl"
4. Voeg 3 URLs toe (leiden.nl homepage, contact, toegankelijkheid)
5. Selecteer viewports: desktop + mobiel
6. Klik "Audit starten"
7. Verwacht: redirect naar /audits/{id} met status "actief"
8. Verwacht: progress bar toont voortgang per URL/viewport/laag
9. Wacht tot status = "voltooid"
10. Verwacht: score-overzicht zichtbaar met errors/warnings/notices
```

**HF-02: Rapport exporteren**
```
1. Login als auditor
2. Navigeer naar voltooide audit
3. Klik "Rapport downloaden" → DOCX
4. Verwacht: DOCX bestand wordt gedownload, >10KB
5. Klik "Rapport downloaden" → PDF
6. Verwacht: PDF bestand wordt gedownload, >10KB
7. Klik "Rapport downloaden" → JSON
8. Verwacht: valide JSON met meta, pages, totals structuur
9. Klik "Rapport downloaden" → CSV
10. Verwacht: CSV met headers: pagina, viewport, criterium, ernst, boodschap
```

**HF-03: Issue drill-down**
```
1. Login als auditor
2. Open voltooide audit
3. Filter issues op type = "error"
4. Verwacht: alleen errors getoond, warnings/notices verborgen
5. Filter op WCAG-criterium "1.4.3" (contrast)
6. Verwacht: alleen contrastproblemen getoond
7. Klik op individueel issue
8. Verwacht: detail met selector, context, boodschap, bron-engine(s), WCAG-link
9. Filter op viewport = "mobiel"
10. Verwacht: alleen mobiele issues getoond
```

**HF-04: Multi-tenant isolatie**
```
1. Login als auditor van gemeente A
2. Maak audit aan voor gemeente A
3. Logout
4. Login als auditor van gemeente B
5. Navigeer naar /audits
6. Verwacht: audit van gemeente A is NIET zichtbaar
7. Probeer direct /audits/{id-van-gemeente-A}
8. Verwacht: 403 Forbidden
```

**HF-05: Toetsenbordbediening (dogfooding)**
```
1. Focus op pagina (Tab)
2. Verwacht: skip-link verschijnt als eerste focusbare element
3. Activeer skip-link (Enter)
4. Verwacht: focus springt naar main content
5. Tab door hoofdnavigatie
6. Verwacht: elke link heeft zichtbare focus-indicator
7. Tab naar "Nieuwe audit" knop, activeer met Enter
8. Verwacht: formulier opent, eerste veld gefocust
9. Vul formulier in met alleen toetsenbord (Tab, Enter, spatiebalk)
10. Verwacht: audit succesvol aangemaakt zonder muis
```

**HF-06: Real-time voortgang volgen**
```
1. Start nieuwe audit met 5 URLs, 2 viewports
2. Verwacht: WebSocket/SSE verbinding actief
3. Verwacht: per URL/viewport/laag een voortgangsitem
4. Verwacht: items veranderen van "wachtend" → "actief" → "voltooid"
5. Verwacht: progress bar percentage stijgt monotoon
6. Verwacht: bij voltooiing verschijnt "Audit voltooid" notificatie
7. Sluit browser, open opnieuw → verwacht: huidige status correct weergegeven
```

**HF-07: Cognitieve analyse (L7)**
```
1. Start audit met L7 (cognitief) ingeschakeld
2. Wacht tot L7 voltooid
3. Navigeer naar cognitieve resultaten
4. Verwacht: Flesch-Douma score per pagina
5. Verwacht: LIX score per pagina
6. Verwacht: B1-niveau beoordeling (voldoet/voldoet niet)
7. Verwacht: lijst van complexe zinnen met suggesties
8. Verwacht: lijst van jargon-termen met uitleg
```

#### Bad Flows (Foutpaden)

**BF-01: Ongeldige URL invoer**
```
1. Login als auditor
2. Navigeer naar /audits/nieuw
3. Voer in: "geen-url"
4. Verwacht: inline validatiefout "Voer een geldige HTTPS URL in"
5. Voer in: "http://example.com" (HTTP, niet HTTPS)
6. Verwacht: waarschuwing "Alleen HTTPS URLs worden ondersteund"
7. Voer in: "https://10.0.0.1/admin" (intern netwerk)
8. Verwacht: fout "Interne netwerkadressen zijn niet toegestaan" (SSRF bescherming)
9. Voer in: "https://localhost:3000"
10. Verwacht: fout "Localhost URLs zijn niet toegestaan"
11. Laat URL-veld leeg, klik "Audit starten"
12. Verwacht: fout "Voeg minimaal 1 URL toe"
```

**BF-02: Onbereikbare website**
```
1. Start audit met URL: "https://deze-site-bestaat-echt-niet-xyz123.nl"
2. Verwacht: scan start normaal
3. Verwacht: na timeout verschijnt foutmelding per URL
4. Verwacht: fout in resultaten: "Pagina onbereikbaar: DNS lookup mislukt"
5. Verwacht: andere URLs in dezelfde audit worden WEL gescand
6. Verwacht: audit status = "voltooid" (niet "mislukt") met gedeeltelijke resultaten
7. Verwacht: rapport bevat sectie "Niet-gescande pagina's" met reden
```

**BF-03: Ongeautoriseerde toegang**
```
1. Probeer /api/v1/audits ZONDER authenticatie
2. Verwacht: 401 Unauthorized (RFC 7807 formaat)
3. Login als viewer
4. Probeer POST /api/v1/audits (audit aanmaken)
5. Verwacht: 403 Forbidden "Onvoldoende rechten"
6. Login als auditor van gemeente A
7. Probeer DELETE /api/v1/audits/{id-gemeente-B}
8. Verwacht: 403 Forbidden (of 404 — geen informatie-lek)
9. Probeer /api/v1/audits?gemeente_id=andere-gemeente
10. Verwacht: lege lijst (filter wordt overschreven door eigen gemeente)
```

**BF-04: Rate limiting**
```
1. Login als auditor
2. Stuur 150 requests naar /api/v1/audits in 60 seconden
3. Verwacht: na 100 requests → 429 Too Many Requests
4. Verwacht: response header Retry-After aanwezig
5. Wacht Retry-After seconden
6. Verwacht: volgende request slaagt weer
7. Probeer 25 scan-triggers in 60 seconden
8. Verwacht: na 20 → 429 Too Many Requests
```

**BF-05: Scan-timeout en recovery**
```
1. Start audit met URL die extreem langzaam laadt (mock met 90s delay)
2. Verwacht: scan timeout na 60 seconden
3. Verwacht: foutmelding "Scan timeout: pagina reageerde niet binnen 60 seconden"
4. Verwacht: andere URLs in audit gaan gewoon door
5. Verwacht: retry-knop beschikbaar voor gefaalde URL
6. Klik retry
7. Verwacht: alleen de gefaalde URL wordt opnieuw gescand
```

**BF-06: Lege of kapotte pagina**
```
1. Start audit met URL die 404 retourneert
2. Verwacht: scan-resultaat toont "HTTP 404 — pagina niet gevonden"
3. Start audit met URL die 500 retourneert
4. Verwacht: scan-resultaat toont "HTTP 500 — serverfout bij doelsite"
5. Start audit met URL die lege HTML retourneert (<html><body></body></html>)
6. Verwacht: scan voltooid, resultaat "Geen content gevonden op pagina"
7. Start audit met URL die redirect-loop heeft
8. Verwacht: fout "Te veel redirects (max 5)"
```

**BF-07: Gelijktijdige audits / resource exhaustion**
```
1. Login als auditor
2. Start audit met 50 URLs (maximale limiet)
3. Probeer gelijktijdig tweede audit te starten
4. Verwacht: melding "Er loopt al een audit. Wacht tot deze voltooid is of annuleer deze eerst."
   OF: tweede audit wordt in wachtrij geplaatst met positie-indicatie
5. Probeer audit met 51 URLs
6. Verwacht: validatiefout "Maximaal 50 URLs per audit"
```

**BF-08: Browser back/forward tijdens scan**
```
1. Start audit (status: actief)
2. Druk op browser Back
3. Navigeer terug naar audit
4. Verwacht: scan loopt nog steeds, voortgang correct weergegeven
5. Sluit browsertab tijdens actieve scan
6. Open nieuw tabblad, navigeer naar audit
7. Verwacht: scan loopt door (server-side), status correct
```

**BF-09: Sessie verloopt tijdens gebruik**
```
1. Login als auditor
2. Laat sessie verlopen (simuleer met korte sessie-TTL)
3. Probeer actie (bijv. rapport downloaden)
4. Verwacht: redirect naar loginpagina
5. Verwacht: na opnieuw inloggen redirect terug naar oorspronkelijke pagina
6. Verwacht: geen dataverlies (audit-resultaten intact)
```

**BF-10: XSS/injection via scan-resultaten**
```
1. Scan een pagina die <script>alert('xss')</script> bevat in alt-tekst
2. Verwacht: scan-resultaat toont de tekst ESCAPED in het dashboard
3. Verwacht: geen JavaScript-executie in het dashboard
4. Scan een pagina met SQL-achtige strings in content
5. Verwacht: strings worden opgeslagen als plain text, geen query-executie
6. Controleer: alle issue-teksten in rapport zijn HTML-escaped
```

#### Edge Cases

**EC-01: Grote website (50 pagina's, 7 lagen, 2 viewports = 700 scan-jobs)**
```
1. Start audit met 50 URLs
2. Verwacht: alle 700 jobs worden aangemaakt in BullMQ
3. Verwacht: jobs worden parallel verwerkt (max concurrency per laag)
4. Verwacht: voortgang blijft responsive in dashboard
5. Verwacht: rapport wordt correct gegenereerd met alle resultaten
6. Verwacht: geheugengebruik blijft binnen containerlimieten
```

**EC-02: Website met cookie-banner / consent wall**
```
1. Scan een pagina met cookie-banner die content blokkeert
2. Verwacht: scanner detecteert overlay en rapporteert
3. Verwacht: resultaten bevatten opmerking over mogelijke beperkte scan
```

**EC-03: SPA (Single Page Application)**
```
1. Scan een React/Angular/Vue SPA
2. Verwacht: scanner wacht op JavaScript rendering (wait: 3000ms)
3. Verwacht: gerenderde DOM wordt geanalyseerd, niet de lege HTML shell
4. Verwacht: client-side routing wordt gevolgd voor opgegeven URLs
```

### 9.3 CI/CD Pipeline

```yaml
# Elke PR:
1. npm ci (exact versions)
2. npm audit --audit-level=high  → BLOCK als niet 0
3. TypeScript compilation
4. ESLint + Prettier
5. Unit + integration tests
6. Build containers
7. E2E tests tegen containers
8. Dogfood: SAA scant eigen dashboard
9. SBOM generatie (CycloneDX)

# Elke release:
10. Cosign image signing
11. Helm chart packaging
12. Changelog generatie
13. GitHub release met SBOM
```

---

## 10. Risico's en Mitigatie

| Risico | Impact | Kans | Mitigatie |
|--------|--------|------|-----------|
| Ollama te zwaar voor kleine servers | L7 onbruikbaar | Gemiddeld | 8GB RAM limiet; Gemma 3 4B; L7 optioneel; `OLLAMA_NUM_PARALLEL=1` |
| Pa11y/axe-core updates breken compatibility | Scan-resultaten veranderen | Laag | Pinned versions, integratietests |
| Guidepup onvolwassen library | L6 onbetrouwbaar, false positives door timing | Gemiddeld | Confidence score per bevinding; fallback naar pure a11y tree analyse |
| SSRF via scanner | Interne netwerken bereikbaar | Hoog | URL-blocklist + netwerksegmentatie + geen DB-toegang |
| Supply chain aanval via npm | Compromised dependency | Gemiddeld | `npm audit`, SBOM, Cosign, pinned versions |
| Gemeenten kunnen niet zelf hosten | Adoptie laag | Gemiddeld | Docker Compose one-liner + Helm chart + documentatie |
| OOM door concurrent Playwright | Scanner crashes, incomplete audits | Hoog | Globale concurrency limiet (max 4 Playwright instances op Redis) |
| Deduplicatie false matches | Issues ten onrechte samengevoegd | Gemiddeld | ACT-rules mapping als bruglaag; selector-normalisatie; integratietests met bekende pagina's |
| Vibe-coding technical debt | Inconsistente patronen, security gaps | Gemiddeld | Strikte code review op security-fase; ACT-mapping handmatig geverifieerd |

---

## 11. Licentie en Governance

- **Licentie**: EUPL-1.2 (compatible met GPL, LGPL, MPL, Apache)
- **Governance**: Open development op GitHub
- **Bijdragen**: CONTRIBUTING.md met DCO (Developer Certificate of Origin)
- **Code of Conduct**: Contributor Covenant
- **Security**: SECURITY.md met responsible disclosure procedure
- **Catalogus**: Aanmelding bij Common Ground componentencatalogus na MVP

---

## 12. Tijdlijn Samenvatting

```
Week  1-2   ████ Fase 0: Fundament (monorepo, CI/CD, DB schema)
Week  3-4   ████ Fase 1: L1 Multi-engine scanner
Week  5-6   ████ Fase 2: L2 Visual regression
Week  7-8   ████ Fase 3: L3 Behavioral tests
                  ──── MVP OPLEVERING ────
Week  9-10  ████ Fase 4: L4 A11y tree + L5 Touch targets
Week 11-13  ██████ Fase 5: L6 Screenreader + L7 Cognitief
Week 14-17  ████████ Fase 6: Dashboard + Rapportage
Week 18-20  ██████ Fase 7: Hardening + Haven + Docs
                  ──── V1.0 RELEASE ────
```

**Totaal**: ~20 werkweken voor volledige scope, **~8 weken voor MVP**.
