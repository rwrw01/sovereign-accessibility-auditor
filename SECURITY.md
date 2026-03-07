# Beveiligingsbeleid

## Ondersteunde versies

| Versie | Ondersteund |
|--------|-------------|
| 0.x    | Ja (development) |

## Kwetsbaarheid melden

Als je een beveiligingskwetsbaarheid hebt gevonden in de Sovereign Accessibility Auditor, neem dan **niet** contact op via een openbaar GitHub Issue.

### Responsible Disclosure

1. **E-mail**: Stuur een beschrijving naar **security@athide.nl**
2. **Verwachte reactietijd**: Binnen 72 uur
3. **Wat te vermelden**:
   - Beschrijving van de kwetsbaarheid
   - Stappen om het probleem te reproduceren
   - Mogelijke impact
   - Eventuele suggesties voor een oplossing

### Wat wij doen

- We bevestigen ontvangst binnen 72 uur
- We beoordelen de ernst en impact
- We werken aan een fix en informeren je over de voortgang
- We vermelden je (met toestemming) in de release notes

### Buiten scope

- Kwetsbaarheden in dependencies die al een upstream fix hebben
- Denial-of-service aanvallen
- Social engineering

## Beveiligingsmaatregelen

Dit project hanteert de volgende beveiligingsstandaarden:

### OWASP/NIST Compliance
- **OWASP Top 10**: Alle code adresseert de OWASP Top 10 risico's
- **NIST SP 800-53**: Relevante controls voor access control (AC), audit (AU), system integrity (SI)

### Netwerksegmentatie
- Elke scanner in eigen geïsoleerd Docker network
- Scanners hebben GEEN directe database-toegang (alleen via API)
- Ollama LLM draait op intern-only network (`cognitive-net`)
- Inter-scanner communicatie is niet mogelijk

### SSRF Bescherming
- Elke scanner heeft een eigen SSRF blocklist (blast radius minimalisatie)
- Geblokkeerd: private ranges (10.x, 172.16.x, 192.168.x), localhost, metadata endpoints
- Alleen HTTP/HTTPS protocollen toegestaan
- Non-standaard poorten geblokkeerd

### Container Hardening
- `read_only: true` — immutable filesystem
- `no-new-privileges: true` — geen privilege escalation
- `cap_drop: ALL` — geen Linux capabilities
- Non-root user (`scanner`)
- Memory limits (2GB per scanner, 8GB voor Ollama)
- CPU limits (2 cores per scanner)

### API Beveiliging
- Helmet.js security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- Permissions-Policy: camera, microphone, geolocation, payment uitgeschakeld
- Rate limiting (100 req/min)
- CORS beperkt tot dashboard origin
- Input validatie met Zod schemas op alle endpoints
- UUID validatie op alle route parameters

### Supply Chain Security
- Exact version pinning in alle package.json bestanden (geen `^`, `~`, `*`)
- `.npmrc` met `save-exact=true`
- `npm audit` in CI pipeline (blokkeert op critical/high)
- CycloneDX SBOM generatie bij elke build
- Dockerfile linting met hadolint
- Lock files gecommit naar git
