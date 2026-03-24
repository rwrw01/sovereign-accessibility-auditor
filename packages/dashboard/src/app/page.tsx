"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "../lib/api-client";

interface Audit {
  id: string;
  naam: string;
  doelUrls: string[] | string;
  status: string;
  aangemaaktOp: string;
}

function resolveUrl(doelUrls: string[] | string): string {
  if (Array.isArray(doelUrls)) return doelUrls[0] ?? "";
  return doelUrls;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function statusLabel(status: string): string {
  switch (status) {
    case "voltooid": return "Afgerond";
    case "actief": return "Bezig";
    case "mislukt": return "Mislukt";
    default: return status;
  }
}

export default function DashboardPage() {
  const [recentAudits, setRecentAudits] = useState<Audit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);

  useEffect(() => {
    apiClient("/api/v1/audits")
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as Audit[];
          // Show latest 3
          setRecentAudits(data.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAudits(false));
  }, []);

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Welkom</span>
      </div>

      <div className="vsc-editor-content">
        {/* Page heading */}
        <h1 style={{ fontSize: "1.25rem", fontWeight: 400, marginBottom: 6, color: "var(--vsc-fg-active)" }}>
          Welkom bij de Toegankelijkheidsauditor
        </h1>
        <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.9rem", marginBottom: 28, maxWidth: 560 }}>
          Controleer automatisch of uw gemeentewebsite voldoet aan de WCAG 2.2 AA-norm en de
          Europese toegankelijkheidswetgeving (EN 301 549).
        </p>

        {/* Action cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, maxWidth: 680, marginBottom: 32 }}>
          <ActionCard
            href="/scan"
            icon="+"
            title="Nieuwe scan starten"
            description="Voer een toegankelijkheidscontrole uit op een website"
            primary
          />
          <ActionCard
            href="/audits"
            icon="\u2630"
            title="Recente audits bekijken"
            description="Bekijk eerder uitgevoerde controles en resultaten"
          />
          <ActionCard
            href="/rapportage"
            icon="\u2193"
            title="Rapport downloaden"
            description="Exporteer een auditrapport als PDF of JSON"
          />
        </div>

        {/* Recent audits summary */}
        <section aria-labelledby="recente-audits-heading">
          <h2 id="recente-audits-heading" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--vsc-fg-active)", marginBottom: 10 }}>
            Recente audits
          </h2>

          {loadingAudits ? (
            <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem" }} role="status">
              Laden...
            </p>
          ) : recentAudits.length === 0 ? (
            <div style={{ padding: "14px 16px", background: "var(--vsc-bg-sidebar)", border: "1px solid var(--vsc-border)", borderRadius: "var(--vsc-radius)", maxWidth: 480 }}>
              <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem", marginBottom: 6 }}>
                Er zijn nog geen audits uitgevoerd.
              </p>
              <Link href="/scan" style={{ color: "var(--vsc-fg-link)", fontSize: "0.85rem" }}>
                Start uw eerste scan &#8594;
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 640 }}>
              {recentAudits.map((audit) => (
                <Link
                  key={audit.id}
                  href={`/audits/${audit.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--vsc-bg-sidebar)", border: "1px solid var(--vsc-border)", borderRadius: "var(--vsc-radius)", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--vsc-fg-active)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {audit.naam || resolveUrl(audit.doelUrls) || "Naamloos"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--vsc-fg-secondary)", marginTop: 2 }}>
                      {formatDate(audit.aangemaaktOp)}
                      {resolveUrl(audit.doelUrls) && (
                        <span style={{ marginLeft: 8 }}>{resolveUrl(audit.doelUrls)}</span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${audit.status === "mislukt" ? "badge-error" : audit.status === "voltooid" ? "" : "badge-notice"}`} style={{ fontSize: "0.7rem", flexShrink: 0 }}>
                    {statusLabel(audit.status)}
                  </span>
                  <span style={{ color: "var(--vsc-fg-link)", fontSize: "0.8rem", flexShrink: 0 }}>
                    &#8594;
                  </span>
                </Link>
              ))}
              <Link href="/audits" style={{ fontSize: "0.8rem", color: "var(--vsc-fg-link)", marginTop: 4, alignSelf: "flex-start" }}>
                Alle audits bekijken &#8594;
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

interface ActionCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}

function ActionCard({ href, icon, title, description, primary = false }: ActionCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px 16px",
        background: primary ? "var(--vsc-bg-selection)" : "var(--vsc-bg-sidebar)",
        border: `1px solid ${primary ? "var(--vsc-border-active)" : "var(--vsc-border)"}`,
        borderRadius: "var(--vsc-radius)",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "1.2rem", color: primary ? "var(--vsc-fg-active)" : "var(--vsc-fg-link)" }} aria-hidden="true">
        {icon}
      </span>
      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--vsc-fg-active)" }}>
        {title}
      </span>
      <span style={{ fontSize: "0.78rem", color: "var(--vsc-fg-secondary)", lineHeight: 1.4 }}>
        {description}
      </span>
    </Link>
  );
}
