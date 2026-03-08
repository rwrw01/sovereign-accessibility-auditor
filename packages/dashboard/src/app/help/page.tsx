"use client";

import { ExternalLink } from "lucide-react";

const SCAN_LAYERS = [
  { id: "L1", naam: "Multi-engine", beschrijving: "Combineert axe-core en IBM Accessibility Checker voor brede WCAG-dekking." },
  { id: "L2", naam: "Visuele regressie", beschrijving: "Test reflow (320px), zoom (200%), en tekst-spacing aanpassingen." },
  { id: "L3", naam: "Gedragstests", beschrijving: "Controleert toetsenbordnavigatie, focus-volgorde en skip-links." },
  { id: "L4", naam: "A11y tree diff", beschrijving: "Vergelijkt de accessibility tree vóór en na interactie op afwijkingen." },
  { id: "L5", naam: "Touch targets", beschrijving: "Verifieert minimale aanraakdoel-afmetingen (24×24px WCAG 2.2)." },
  { id: "L6", naam: "Screenreader simulatie", beschrijving: "Simuleert hoe een screenreader de pagina voorleest en navigeert." },
  { id: "L7", naam: "Cognitieve analyse", beschrijving: "Beoordeelt leesbaarheid, complexiteit en begrijpelijkheid met AI." },
];

const FAQ = [
  {
    vraag: "Hoe start ik een nieuwe scan?",
    antwoord: "Ga naar \"Nieuwe scan\" via de zijbalk of het dashboard. Voer de URL in van de pagina die je wilt testen, selecteer de gewenste scanlagen en klik op \"Scan starten\".",
  },
  {
    vraag: "Wat betekenen de ernstniveaus?",
    antwoord: "KRITIEK: Blokkeert gebruikers volledig. HOOG: Ernstige barrière voor bepaalde gebruikersgroepen. GEMIDDELD: Belemmert de gebruikservaring. LAAG: Kleine verbetering mogelijk.",
  },
  {
    vraag: "Hoe exporteer ik een rapport?",
    antwoord: "Ga naar \"Rapportage\" in de zijbalk. Selecteer de gewenste audit en klik op \"Exporteer als JSON\" of gebruik de downloadknop voor een volledig rapport.",
  },
  {
    vraag: "Welke WCAG-versie wordt getest?",
    antwoord: "SAA test tegen WCAG 2.2 niveau AA conform ISO/IEC 40500:2025, de huidige Nederlandse standaard voor digitale toegankelijkheid.",
  },
  {
    vraag: "Kan ik meerdere pagina's tegelijk scannen?",
    antwoord: "Ja. Maak een audit aan met meerdere doel-URL's. Elke URL wordt door alle geselecteerde scanlagen verwerkt.",
  },
  {
    vraag: "Wat is het verschil tussen een scan en een audit?",
    antwoord: "Een audit is een verzameling van meerdere scans voor dezelfde website. Een scan is één test van één pagina met één specifieke scanlaag.",
  },
  {
    vraag: "Hoe werkt de rolgebaseerde toegang?",
    antwoord: "Er zijn drie rollen: Admin (volledige toegang en gebruikersbeheer), Auditor (scans starten en resultaten bekijken) en Viewer (alleen resultaten inzien).",
  },
];

export default function HelpPage() {
  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Help</span>
      </div>

      <div className="vsc-editor-content" style={{ maxWidth: 740, lineHeight: 1.7 }}>
        <h1 style={{ fontSize: "1.1rem", marginBottom: 8, color: "var(--vsc-fg-active)" }}>
          Help &amp; Documentatie
        </h1>
        <p style={{ color: "var(--vsc-fg-secondary)", marginBottom: 24, fontSize: "0.9rem" }}>
          Welkom bij de Sovereign Accessibility Auditor (SAA). Hieronder vind je uitleg over de
          functies, scanlagen en veelgestelde vragen.
        </p>

        {/* Aan de slag */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Aan de slag
          </h2>
          <ol style={{ paddingLeft: 20, color: "var(--vsc-fg)", fontSize: "0.85rem", lineHeight: 2 }}>
            <li>Log in met je e-mailadres en wachtwoord, of via je organisatie-account (OIDC).</li>
            <li>Ga naar <strong>Nieuwe scan</strong> in de zijbalk.</li>
            <li>Voer de URL in van de webpagina die je wilt controleren.</li>
            <li>Selecteer de scanlagen die je wilt uitvoeren (standaard: alle 7).</li>
            <li>Klik op <strong>Scan starten</strong> en wacht op de resultaten.</li>
            <li>Bekijk de bevindingen per ernst-niveau en exporteer als rapport.</li>
          </ol>
        </section>

        {/* Scanlagen */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            De 7 scanlagen
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {SCAN_LAYERS.map((layer) => (
              <div
                key={layer.id}
                style={{
                  background: "var(--vsc-bg-secondary)",
                  borderRadius: 4,
                  padding: "10px 14px",
                }}
              >
                <strong style={{ color: "var(--vsc-fg-active)", fontSize: "0.85rem" }}>
                  {layer.id} — {layer.naam}
                </strong>
                <p style={{ margin: "4px 0 0", color: "var(--vsc-fg-secondary)", fontSize: "0.82rem" }}>
                  {layer.beschrijving}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Veelgestelde vragen
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {FAQ.map((item, i) => (
              <details
                key={i}
                style={{
                  background: "var(--vsc-bg-secondary)",
                  borderRadius: 4,
                  padding: "10px 14px",
                }}
              >
                <summary style={{ cursor: "pointer", color: "var(--vsc-fg-active)", fontSize: "0.85rem", fontWeight: 600 }}>
                  {item.vraag}
                </summary>
                <p style={{ margin: "8px 0 0", color: "var(--vsc-fg-secondary)", fontSize: "0.82rem" }}>
                  {item.antwoord}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Sneltoetsen */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Sneltoetsen
          </h2>
          <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--vsc-border)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--vsc-fg-active)" }}>Toets</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--vsc-fg-active)" }}>Actie</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--vsc-fg-secondary)" }}>
              <tr><td style={{ padding: "4px 8px" }}><kbd>Tab</kbd></td><td style={{ padding: "4px 8px" }}>Navigeer naar volgend element</td></tr>
              <tr><td style={{ padding: "4px 8px" }}><kbd>Shift + Tab</kbd></td><td style={{ padding: "4px 8px" }}>Navigeer naar vorig element</td></tr>
              <tr><td style={{ padding: "4px 8px" }}><kbd>Enter</kbd></td><td style={{ padding: "4px 8px" }}>Activeer knop of link</td></tr>
              <tr><td style={{ padding: "4px 8px" }}><kbd>Escape</kbd></td><td style={{ padding: "4px 8px" }}>Sluit dialoog of paneel</td></tr>
            </tbody>
          </table>
        </section>

        {/* Links */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Meer informatie
          </h2>
          <ul style={{ listStyle: "none", padding: 0, fontSize: "0.85rem" }}>
            <li style={{ marginBottom: 8 }}>
              <a
                href="https://www.w3.org/TR/WCAG22/"
                target="_blank"
                rel="noopener noreferrer"
                className="welcome-link"
                style={{ color: "var(--vsc-link)" }}
              >
                WCAG 2.2 specificatie
                <ExternalLink size={12} aria-hidden="true" style={{ marginLeft: 4, verticalAlign: "middle" }} />
              </a>
            </li>
            <li style={{ marginBottom: 8 }}>
              <a
                href="https://www.digitoegankelijk.nl/"
                target="_blank"
                rel="noopener noreferrer"
                className="welcome-link"
                style={{ color: "var(--vsc-link)" }}
              >
                DigiToegankelijk.nl
                <ExternalLink size={12} aria-hidden="true" style={{ marginLeft: 4, verticalAlign: "middle" }} />
              </a>
            </li>
            <li>
              <a
                href="https://www.w3.org/WAI/WCAG22/quickref/"
                target="_blank"
                rel="noopener noreferrer"
                className="welcome-link"
                style={{ color: "var(--vsc-link)" }}
              >
                WCAG 2.2 snelreferentie
                <ExternalLink size={12} aria-hidden="true" style={{ marginLeft: 4, verticalAlign: "middle" }} />
              </a>
            </li>
          </ul>
        </section>

        <div style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.8rem", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--vsc-border)" }}>
          <p>Sovereign Accessibility Auditor v0.1.0 — EUPL-1.2</p>
          <p>WCAG 2.2 AA (ISO/IEC 40500:2025)</p>
        </div>
      </div>
    </>
  );
}
