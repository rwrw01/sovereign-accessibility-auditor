import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sovereign Accessibility Auditor",
  description: "WCAG 2.2 AA audit-platform voor Nederlandse gemeenten",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <a href="#main-content" className="skip-link">
          Ga naar hoofdinhoud
        </a>

        <header className="page-header" role="banner">
          <h1>Sovereign Accessibility Auditor</h1>
          <nav aria-label="Hoofdnavigatie">
            <a href="/">Dashboard</a>
            <a href="/scan">Nieuwe scan</a>
            <a href="/rapportage">Rapportage</a>
          </nav>
        </header>

        <main id="main-content" className="page-main" role="main">
          {children}
        </main>

        <footer className="page-footer" role="contentinfo">
          <p>
            SAA v0.1.0 — WCAG 2.2 AA audit-platform | EUPL-1.2 licentie
          </p>
        </footer>
      </body>
    </html>
  );
}
