# Fase 4 — L4 A11y Tree Diff + L5 Touch Targets

**Versie**: 0.1.0
**Datum**: 2026-03-07

## Overzicht

Fase 4 voegt twee scanners toe aan het SAA-platform:

1. **L4 A11y Tree Diff** — Vergelijkt de accessibility tree tussen viewports
2. **L5 Touch Targets** — Meet interactieve elementen op minimale aanraakgrootte

---

## L4: A11y Tree Diff Scanner

### Wat doet het?

De L4 scanner maakt snapshots van de accessibility tree op verschillende viewports en vergelijkt deze. Hiermee worden structurele verschillen gedetecteerd die erop wijzen dat content of navigatie in bepaalde viewports ontbreekt.

### WCAG-criteria

| Criterium | Naam | Niveau |
|-----------|------|--------|
| 1.3.1 | Info and Relationships | A |
| 1.3.4 | Orientation | AA |
| 4.1.2 | Name, Role, Value | A |

### Vergelijkingen

1. **Desktop vs Mobiel** — Detecteert landmarks, rollen en namen die in mobiel ontbreken
2. **Portrait vs Landscape** — Detecteert oriëntatie-afhankelijke issues (WCAG 1.3.4)

### Technische implementatie

- **CDP (Chrome DevTools Protocol)** via `Accessibility.getFullAXTree` — Playwright 1.58+ verwijderde `page.accessibility.snapshot()`, dus we gebruiken CDP direct
- Ignored nodes worden als transparant behandeld (hun kinderen worden alsnog opgenomen)
- "Uninteresting" rollen (none, presentation, generic, StaticText) worden overgeslagen maar hun kinderen doorlopen
- Vergelijking op: landmarks, important roles, accessible names, totaal knooppunten

### API

```
POST /api/v1/audits/:auditId/a11y-tree
Body: {
  "url": "https://example.com",
  "desktopViewport": { "name": "desktop", "w": 1280, "h": 1024 },
  "mobileViewport": { "name": "mobile", "w": 375, "h": 667 }
}
→ 202 { scanId, jobId, status: "wachtend" }

GET /api/v1/audits/:auditId/a11y-tree/:scanId
→ { scanId, status, result: { findings, comparisons } }
```

### Bevindingstypen

| Type | Beschrijving | Impact |
|------|-------------|--------|
| `missing-landmark` | Landmark aanwezig in desktop, afwezig in mobiel | Serious |
| `missing-role` | Belangrijke rol ontbreekt in vergelijkingsviewport | Moderate |
| `missing-name` | Element verliest accessible name in ander viewport | Serious |
| `structural-change` | Significant minder nodes in vergelijkingsviewport | Moderate |
| `orientation-issue` | Verschil tussen portrait en landscape | Moderate |

---

## L5: Touch Targets Scanner

### Wat doet het?

De L5 scanner meet alle interactieve elementen op de pagina en controleert of ze voldoen aan de minimale aanraakgrootte. Standaard wordt WCAG 2.5.8 AA (24x24 CSS pixels) gebruikt, maar dit is configureerbaar tot 44x44px (WCAG 2.5.5 AAA).

### WCAG-criteria

| Criterium | Naam | Niveau |
|-----------|------|--------|
| 2.5.8 | Target Size (Minimum) | AA |
| 2.5.5 | Target Size (Enhanced) | AAA |

### Uitzonderingen

Per WCAG 2.5.8 worden de volgende elementen uitgezonderd:

- **Inline links** — Links met `display: inline` binnen een zin
- **Visually-hidden elements** — Screenreader-only elementen (rect ≤ 2px, clip:rect, absolute+1px)
- **Disabled elements** — Uitgeschakelde elementen
- **Hidden elements** — Onzichtbare elementen (display:none, visibility:hidden)

### Spacing-analyse

Naast de grootte wordt ook de afstand tussen kleine aanraakdoelen gecontroleerd. Twee kleine targets die minder dan 4px uit elkaar staan worden als compound issue gerapporteerd.

### API

```
POST /api/v1/audits/:auditId/touch-targets
Body: {
  "url": "https://example.com",
  "viewport": { "name": "mobile", "w": 375, "h": 667 },
  "minTargetSize": 24
}
→ 202 { scanId, jobId, status: "wachtend" }

GET /api/v1/audits/:auditId/touch-targets/:scanId
→ { scanId, status, result: { findings, totalElements, failingElements } }
```

---

## Beveiliging

Beide scanners volgen dezelfde security baseline als L1-L3:

- **Container**: read_only, no-new-privileges, cap_drop ALL, non-root user
- **Netwerk**: redis-net (internal) + scanner-net (internet), geen db-net toegang
- **SSRF-bescherming**: Blocklist voor private ranges, localhost, metadata endpoints
- **Resource limits**: 2GB geheugen, 2 CPU cores
- **BullMQ**: Rate limiter max 4 jobs / 10 seconden

## Smoke test resultaten

- **L4 op example.com**: 5 nodes desktop, 5 nodes mobiel, 0 findings (identieke structuur — correct)
- **L5 op example.com**: 1 element gemeten, inline link "Learn more" (80x21px) correct als uitzondering gemarkeerd

## Configuratie

### Omgevingsvariabelen

| Variabele | Standaard | Beschrijving |
|-----------|-----------|-------------|
| `REDIS_HOST` | 127.0.0.1 | Valkey/Redis host |
| `REDIS_PORT` | 6379 | Valkey/Redis poort |
| `SCAN_CONCURRENCY` | 2 | Aantal gelijktijdige scans |
| `NODE_ENV` | development | Omgeving (production voor Docker) |

### Docker Compose

```yaml
scanner-l4:
  build:
    dockerfile: packages/scanners/a11y-tree/Dockerfile
  networks: [redis-net, scanner-net]

scanner-l5:
  build:
    dockerfile: packages/scanners/touch-targets/Dockerfile
  networks: [redis-net, scanner-net]
```
