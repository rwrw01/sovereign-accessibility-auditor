# Fase 7 — Hardening + Haven

## Overzicht

Fase 7 versterkt de beveiligingsposture van het platform met aanvullende headers, supply chain beveiliging, SBOM generatie en CI/CD verbeteringen.

## Security Headers (API)

### Bestaand (Fase 0)
- Content-Security-Policy (strikte directives)
- X-Frame-Options (via frameAncestors: none)
- Rate limiting (100 req/min)
- CORS restricties

### Toegevoegd (Fase 7)
- `Strict-Transport-Security`: max-age=63072000, includeSubDomains, preload
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: camera=(), microphone=(), geolocation=(), payment=()
- `X-Permitted-Cross-Domain-Policies`: none
- `upgrade-insecure-requests` in CSP
- HSTS preload-ready

## .dockerignore

Root-level `.dockerignore` voorkomt dat gevoelige bestanden in Docker images terechtkomen:
- `.git`, `.env`, `.claude/` — configuratie en secrets
- `node_modules`, `dist`, `.turbo` — build artifacts
- `docs/`, `*.md` — documentatie
- `__tests__/`, `coverage/` — test bestanden
- `.github/` — CI configuratie

## CI/CD Verbeteringen

### Nieuwe jobs

| Job | Beschrijving |
|-----|-------------|
| `sbom` | CycloneDX SBOM generatie, uploaded als artifact (90 dagen retentie) |
| `docker-lint` | Hadolint check op alle Dockerfiles |
| Version pin check | Detecteert `^` en `~` prefixes in package.json bestanden |

### Pipeline volgorde
```
lint-and-typecheck ──┐
                     ├── test ──┐
security-audit ──────┘          ├── build
                     ├── sbom   │
docker-lint ─────────┘          │
                                │
```

## SBOM (Software Bill of Materials)

- Formaat: CycloneDX JSON
- Generator: `@cyclonedx/cyclonedx-npm`
- Dekt alle directe en transitieve dependencies
- Geüpload als GitHub Actions artifact
- Retentie: 90 dagen
- Ondersteunt: NIST SSDF, EU Cyber Resilience Act

## Container Security Checklist

Alle scanner Dockerfiles voldoen aan:

| Controle | Status |
|----------|--------|
| Non-root user | scanner:scanner |
| read_only filesystem | Ja |
| no-new-privileges | Ja |
| cap_drop ALL | Ja |
| Memory limits | 2GB (scanners), 8GB (Ollama) |
| CPU limits | 2 cores (scanners), 4 cores (Ollama) |
| Healthcheck | Ja |
| Multi-stage build | Ja |
| --ignore-scripts | Ja (npm ci) |
| .dockerignore | Ja (root-level) |

## SECURITY.md Updates

Uitgebreid met:
- OWASP/NIST compliance targets
- Gedetailleerde netwerksegmentatie beschrijving
- API beveiliging details (Permissions-Policy, upgrade-insecure-requests)
- Supply chain security procedures
