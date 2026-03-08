# Sovereign Accessibility Auditor (SAA)

**Open-source WCAG 2.2 AA audit-platform voor Nederlandse gemeenten**

Combineert 7 geautomatiseerde testlagen om WCAG 2.2 AA-dekking te verhogen van ~30% (huidige tooling) naar ~65%. Volledig zelf te hosten, geen vendor lock-in.

## Scan-lagen

| Laag | Functie | Technologie |
|------|---------|-------------|
| L1 | Multi-engine WCAG scan | axe-core + IBM Equal Access |
| L2 | Visuele regressie | Reflow (320px), zoom (200%), text-spacing |
| L3 | Gedragstests | Toetsenbord, focus traps, hover/focus content |
| L4 | Accessibility tree diff | Desktop vs. mobiel structuurvergelijking |
| L5 | Touch target meting | Detectie < 44x44px elementen |
| L6 | Screenreader simulatie | DOM-analyse met confidence scoring |
| L7 | Cognitieve analyse | Flesch-Douma, jargondetectie, Ollama + Gemma 3 |

## Architectuur

[Common Ground](https://commonground.nl/) 5-lagenmodel:

```
Interactie    → Next.js 15 dashboard (VS Code-stijl) + authenticatie
Proces        → BullMQ scan-orchestratie op Valkey 8.1
Integratie    → API gateway + OpenAPI 3.x
Services      → 7 geïsoleerde scan-microservices (Fastify 5)
Data          → PostgreSQL 16 (encrypted at rest)
```

Elke scanner draait in een eigen Docker network met SSRF blocklist. Geen inter-scanner communicatie, geen directe database-toegang.

## Authenticatie & autorisatie

- **Credentials**: E-mail + wachtwoord (argon2id hashing, account lockout na 10 pogingen)
- **OIDC**: Optionele Keycloak/OIDC-integratie voor organisatie-accounts
- **Sessies**: HttpOnly cookies (geen localStorage), JWT access tokens (HS256, 15 min), refresh token rotatie
- **Rollen**: Admin (volledig beheer), Auditor (scans starten), Viewer (alleen inzien)
- **Rate limiting**: 5 login pogingen/min, 100 API calls/min

## Snel starten

```bash
git clone https://github.com/rwrw01/sovereign-accessibility-auditor.git
cd sovereign-accessibility-auditor
cp .env.example .env    # Configureer DATABASE_URL, JWT_SECRET, etc.
npm install

# Start PostgreSQL + Valkey
docker compose up -d

# Database migratie + seed (optioneel)
npx tsx packages/api/src/db/seed.ts

# Ontwikkelen
npm run dev

# Testen
npm run test
npm run audit:deps

# E2E tests
cd packages/dashboard && npx playwright test
```

## Projectstructuur

```
packages/
├── api/                    Fastify REST API + auth
├── dashboard/              Next.js 15 frontend (VS Code-stijl)
│   └── e2e/                Playwright E2E tests
├── shared/                 Gedeelde types en utilities
└── scanners/
    ├── multi-engine/       L1: axe-core + IBM Equal Access
    ├── visual-regression/  L2: Screenshot diff
    ├── behavioral/         L3: Keyboard/focus tests
    ├── a11y-tree/          L4: Accessibility tree diff
    ├── touch-targets/      L5: Touch target meting
    ├── screenreader/       L6: Virtual screenreader
    └── cognitive/          L7: Ollama + Gemma 3
```

## Dashboard pagina's

| Pagina | Route | Beschrijving |
|--------|-------|-------------|
| Dashboard | `/` | Overzicht met recente audits en snelkoppelingen |
| Nieuwe scan | `/scan` | URL invoeren, scanlagen selecteren, scan starten |
| Rapportage | `/rapportage` | Rapport preview en JSON export |
| Instellingen | `/instellingen` | Gebruikersprofiel en app-informatie |
| Help | `/help` | Documentatie, FAQ, scanlaag-uitleg, sneltoetsen |
| Login | `/auth/login` | Credentials + optioneel OIDC inloggen |

## Hergebruikte software

| Component | Versie | Licentie |
|-----------|--------|----------|
| [Next.js](https://nextjs.org/) | 15.5.12 | MIT |
| [Fastify](https://fastify.dev/) | 5.8.1 | MIT |
| [Drizzle ORM](https://orm.drizzle.team/) | 0.44.2 | Apache-2.0 |
| [BullMQ](https://bullmq.io/) | 5.52.2 | MIT |
| [Playwright](https://playwright.dev/) | 1.58.2 | Apache-2.0 |
| [@axe-core/playwright](https://www.deque.com/axe/) | 4.11.1 | MPL-2.0 |
| [accessibility-checker-engine](https://github.com/IBMa/equal-access) | 4.0.13 | Apache-2.0 |
| [argon2](https://github.com/ranisalt/node-argon2) | 0.41.x | MIT |
| [@fastify/jwt](https://github.com/fastify/fastify-jwt) | 9.x | MIT |
| [@fastify/cookie](https://github.com/fastify/fastify-cookie) | 11.x | MIT |
| [lucide-react](https://lucide.dev/) | 0.511.x | ISC |
| [Ollama](https://ollama.com/) | 0.6.x | MIT |
| [Gemma 3](https://ai.google.dev/gemma) | 4B | Gemma License |
| [PostgreSQL](https://www.postgresql.org/) | 16 | PostgreSQL License |
| [Valkey](https://valkey.io/) | 8.1 | BSD-3-Clause |
| [Turborepo](https://turbo.build/) | 2.5.4 | MIT |
| [TypeScript](https://www.typescriptlang.org/) | 5.8.3 | Apache-2.0 |
| [pixelmatch](https://github.com/mapbox/pixelmatch) | 6.0.0 | ISC |
| [@playwright/test](https://playwright.dev/) | 1.52.x | Apache-2.0 |

## Beveiliging

- SSRF-bescherming per scanner (blocklist private IP-ranges, metadata endpoints)
- JWT algorithm pinning (HS256), token in HttpOnly cookies
- Argon2id wachtwoord-hashing met account lockout
- Helmet CSP, HSTS preload, Permissions-Policy
- Container hardening: read-only fs, non-root, cap_drop ALL
- Rate limiting op alle auth-endpoints

Zie [SECURITY.md](SECURITY.md) voor beveiligingsbeleid en het melden van kwetsbaarheden.

## Licentie

Copyright (c) 2026 [Athide.nl](https://athide.nl) — [EUPL-1.2](LICENSE)
