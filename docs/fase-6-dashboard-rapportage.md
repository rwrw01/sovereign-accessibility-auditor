# Fase 6 — Dashboard + Rapportage

## Overzicht

Next.js 15 dashboard met NL Design System-compatible styling. Biedt een gebruikersinterface voor het starten van scans, real-time voortgang, resultatenweergave en rapportage-export.

## Pagina's

### Dashboard (`/`)
- URL invoerveld voor te scannen website
- Selectie van scan-lagen (L1-L7) via checkboxes
- Start scans parallel op alle geselecteerde lagen
- Real-time polling (2s interval) voor voortgang en resultaten
- Statistieken: totaal bevindingen, voltooide scans, totale duur
- Resultaattabel met laag, status, voortgang, bevindingen, duur

### Nieuwe scan (`/scan`)
- Enkelvoudige scan op een specifieke laag
- Scanner selectie via dropdown (L1 t/m L7)
- Polling met timeout (max 60s)
- Gedetailleerde bevindingentabel: type, impact, WCAG criteria, check, bericht, selector

### Rapportage (`/rapportage`)
- WCAG 2.2 AA conformiteitsrapport genereren
- Download als Markdown bestand
- Rapport structuur: samenvatting, resultaten per laag, WCAG criteria overzicht, detail, aanbevelingen
- Vermelding dat handmatige expert-beoordeling aanbevolen is

## Toegankelijkheid

- Skip-link ("Ga naar hoofdinhoud")
- Semantische landmarks: `<header role="banner">`, `<main role="main">`, `<footer role="contentinfo">`
- `<nav aria-label="Hoofdnavigatie">`
- Taal: `lang="nl"`
- Formuliervelden met `<label for="...">` associatie
- Progress bars met `role="progressbar"` en `aria-valuenow`
- Tabellen met `scope="col"` op headers
- `prefers-reduced-motion` respecteert
- `prefers-contrast: more` ondersteuning
- Focus-visible styling op alle interactieve elementen (3px outline)

## Styling

NL Design System-compatible CSS variabelen:
- Kleuren: Rijksoverheid primair blauw (`#154273`), succes groen, error rood
- Typography: RijksoverheidSansText fallback naar systeem sans-serif
- Spacing: 8px grid (xs/sm/md/lg/xl/xxl)
- Componenten: cards, buttons, badges, progress bars, stats grid
- Status badges: wachtend, actief, voltooid, mislukt
- Impact badges: critical, serious, moderate, minor
- Type badges: error, warning, notice

## Technische Details

- Next.js 15.5.12 met App Router
- React 19.1.0
- Client-side rendering (`"use client"`) voor interactieve pagina's
- Fetch API voor communicatie met backend (CORS via Fastify)
- `NEXT_PUBLIC_API_URL` configureerbaar (default: `http://localhost:3001`)
- Static export mogelijk voor productie

## Bestanden

```
packages/dashboard/
  src/app/
    globals.css         — NL Design System tokens + componenten
    layout.tsx          — Root layout met skip-link, header, nav, footer
    page.tsx            — Dashboard met multi-laag scan
    scan/page.tsx       — Enkelvoudige scan met detail resultaten
    rapportage/page.tsx — Rapport generatie en download
```
