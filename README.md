# Sovereign Accessibility Auditor (SAA)

**Open-source WCAG 2.2 AA audit-platform voor Nederlandse gemeenten**

De Sovereign Accessibility Auditor (SAA) is een soeverein, zelf te hosten toegankelijkheidsaudit-platform. Het combineert 7 geautomatiseerde testlagen om de WCAG 2.2 AA-dekking te verhogen van ~30% (huidige tooling) naar ~65%.

## Kenmerken

- **Multi-engine scanning**: Pa11y, axe-core en IBM Equal Access draaien parallel met cross-engine deduplicatie
- **Visuele regressie**: Automatische tests voor reflow (320px), zoom (200%) en text-spacing
- **Gedragstests**: Toetsenbordnavigatie, focus traps, hover/focus content
- **Accessibility tree diff**: Desktop vs. mobiel structuurvergelijking
- **Touch target meting**: Detectie van elementen kleiner dan 44x44px
- **Screenreader simulatie**: Virtual screenreader met confidence scoring
- **Cognitieve analyse**: B1-taalniveaucheck via Ollama + Gemma 3, Flesch-Douma index, jargondetectie
- **NL Design System**: Dashboard conform overheids design standaarden
- **Soeverein**: Volledig zelf te hosten, geen vendor lock-in, geen cloud-afhankelijkheid

## Architectuur

Het platform volgt de [Common Ground](https://commonground.nl/) 5-lagenarchitectuur:

```
Interactie    → Next.js dashboard + NL Design System
Proces        → BullMQ scan-orchestratie op Valkey
Integratie    → Traefik API gateway + OpenAPI 3.x
Services      → 7 geïsoleerde scan-microservices
Data          → PostgreSQL 16 (encrypted at rest)
```

## Snel starten

### Vereisten

- [Docker](https://docs.docker.com/get-docker/) 27+
- [Docker Compose](https://docs.docker.com/compose/) v2+
- [Node.js](https://nodejs.org/) 20 LTS+
- [npm](https://www.npmjs.com/) 10+

### Installatie

```bash
git clone https://github.com/rwrw01/sovereign-accessibility-auditor.git
cd sovereign-accessibility-auditor
npm install
```

### Ontwikkelen

```bash
# Start PostgreSQL + Valkey
docker compose up -d

# Start alle services in dev-modus
npm run dev
```

### Testen

```bash
npm run test          # Unit + integration tests
npm run test:e2e      # Playwright E2E tests
npm run audit:deps    # Dependency security audit
```

## Projectstructuur

```
sovereign-accessibility-auditor/
├── packages/
│   ├── api/                    # Fastify REST API
│   ├── dashboard/              # Next.js frontend
│   ├── shared/                 # Gedeelde types en utilities
│   └── scanners/               # 7 scan-microservices
│       ├── multi-engine/       # L1: Pa11y + axe-core + IBM
│       ├── visual-regression/  # L2: Screenshot diff
│       ├── behavioral/         # L3: Keyboard/focus tests
│       ├── a11y-tree/          # L4: Accessibility tree diff
│       ├── touch-targets/      # L5: Touch target meting
│       ├── screenreader/       # L6: Virtual screenreader
│       └── cognitive/          # L7: Ollama + Gemma 3
├── docker-compose.yml          # Lokale ontwikkeling
├── publiccode.yml              # Common Ground catalogus
└── docs/                       # Documentatie
```

## Hergebruikte software

| Component | Versie | Licentie | Link |
|-----------|--------|----------|------|
| [Next.js](https://nextjs.org/) | 15.5.12 | MIT | [GitHub](https://github.com/vercel/next.js) |
| [NL Design System (Utrecht)](https://nl-design-system.github.io/utrecht/) | latest stable | EUPL-1.2 | [GitHub](https://github.com/nl-design-system/utrecht) |
| [Fastify](https://fastify.dev/) | 5.8.1 | MIT | [GitHub](https://github.com/fastify/fastify) |
| [Drizzle ORM](https://orm.drizzle.team/) | 0.44.x | Apache-2.0 | [GitHub](https://github.com/drizzle-team/drizzle-orm) |
| [BullMQ](https://bullmq.io/) | 5.x | MIT | [GitHub](https://github.com/taskforcesh/bullmq) |
| [Playwright](https://playwright.dev/) | 1.49.x | Apache-2.0 | [GitHub](https://github.com/microsoft/playwright) |
| [Pa11y](https://pa11y.org/) | 8.0.0 | LGPL-3.0 | [GitHub](https://github.com/pa11y/pa11y) |
| [@axe-core/playwright](https://www.deque.com/axe/) | 4.x | MPL-2.0 | [GitHub](https://github.com/dequelabs/axe-core) |
| [@ibma/aat](https://www.ibm.com/able/) | latest stable | Apache-2.0 | [GitHub](https://github.com/IBMa/equal-access) |
| [@guidepup/virtual-screen-reader](https://www.guidepup.dev/) | 1.x | MIT | [GitHub](https://github.com/guidepup/virtual-screen-reader) |
| [Ollama](https://ollama.com/) | 0.6.x | MIT | [GitHub](https://github.com/ollama/ollama) |
| [Gemma 3](https://ai.google.dev/gemma) | 4B | Gemma License | [Kaggle](https://www.kaggle.com/models/google/gemma) |
| [PostgreSQL](https://www.postgresql.org/) | 16 | PostgreSQL License | [Website](https://www.postgresql.org/) |
| [Valkey](https://valkey.io/) | 8.x | BSD-3-Clause | [GitHub](https://github.com/valkey-io/valkey) |
| [Traefik](https://traefik.io/) | 3.x | MIT | [GitHub](https://github.com/traefik/traefik) |
| [NextAuth.js](https://authjs.dev/) | 5.x | ISC | [GitHub](https://github.com/nextauthjs/next-auth) |
| [Turborepo](https://turbo.build/) | 2.x | MIT | [GitHub](https://github.com/vercel/turborepo) |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Apache-2.0 | [GitHub](https://github.com/microsoft/TypeScript) |
| [pixelmatch](https://github.com/mapbox/pixelmatch) | 6.x | ISC | [GitHub](https://github.com/mapbox/pixelmatch) |
| [python-docx](https://python-docx.readthedocs.io/) | pinned | MIT | [GitHub](https://github.com/python-openxml/python-docx) |
| [WeasyPrint](https://weasyprint.org/) | pinned | BSD-3-Clause | [GitHub](https://github.com/Kozea/WeasyPrint) |

## Licentie

Copyright (c) 2026 [Athide.nl](https://athide.nl)

Dit project is gelicenseerd onder de [European Union Public License v1.2](LICENSE) (EUPL-1.2).

De EUPL-1.2 vereist dat:
- De **naamsvermelding** (copyright notice) behouden blijft in alle kopieën en afgeleide werken
- Afgeleide werken onder dezelfde of een [compatibele licentie](https://joinup.ec.europa.eu/collection/eupl/eupl-compatible-open-source-licences) worden verspreid

## Bijdragen

Bijdragen zijn welkom. Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor richtlijnen.

## Beveiliging

Zie [SECURITY.md](SECURITY.md) voor het melden van kwetsbaarheden.
