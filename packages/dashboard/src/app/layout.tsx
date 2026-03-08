import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { VSCodeLayout } from "../components/VSCodeLayout";

export const metadata: Metadata = {
  title: {
    template: "%s — SAA",
    default: "Sovereign Accessibility Auditor",
  },
  description: "WCAG 2.2 AA audit-platform voor Nederlandse gemeenten",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <a href="#main-content" className="skip-link">
          Ga naar hoofdinhoud
        </a>
        <VSCodeLayout>{children}</VSCodeLayout>
      </body>
    </html>
  );
}
