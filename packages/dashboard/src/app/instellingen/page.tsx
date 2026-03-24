"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient, logout } from "../../lib/api-client";

interface UserInfo {
  id: string;
  email: string;
  naam: string | null;
  rol: string;
  gemeenteId: string;
  gemeenteNaam?: string | null;
}

const ROL_LABEL: Record<string, string> = {
  admin: "Beheerder",
  auditor: "Auditor",
  viewer: "Lezer",
};

export default function InstellingenPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    apiClient("/api/v1/auth/me")
      .then(async (res) => {
        if (!res.ok) { setLoadError(true); return; }
        const data = (await res.json()) as UserInfo;
        setUser(data);
      })
      .catch(() => setLoadError(true));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    window.location.href = "/auth/login";
  }

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Profiel</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 24, color: "var(--vsc-fg-active)" }}>
          Uw profiel
        </h1>

        <div style={{ maxWidth: 500 }}>
          {/* Profile section */}
          <section aria-labelledby="profiel-head" style={{ marginBottom: 32 }}>
            <h2
              id="profiel-head"
              style={{ fontSize: "0.95rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}
            >
              Gebruikersgegevens
            </h2>

            {loadError && (
              <p
                className="login-error"
                role="alert"
                style={{ marginBottom: 16 }}
              >
                Profielgegevens konden niet worden geladen.
              </p>
            )}

            {!loadError && !user && (
              <p style={{ color: "var(--vsc-fg-secondary)" }} role="status">
                Laden…
              </p>
            )}

            {user && (
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: "10px 16px",
                  fontSize: "0.88rem",
                }}
              >
                <dt style={{ color: "var(--vsc-fg-secondary)", alignSelf: "center" }}>E-mailadres</dt>
                <dd style={{ color: "var(--vsc-fg-active)" }}>{user.email}</dd>

                <dt style={{ color: "var(--vsc-fg-secondary)", alignSelf: "center" }}>Naam</dt>
                <dd style={{ color: "var(--vsc-fg-active)" }}>
                  {user.naam ?? <em style={{ color: "var(--vsc-fg-secondary)" }}>Niet ingesteld</em>}
                </dd>

                <dt style={{ color: "var(--vsc-fg-secondary)", alignSelf: "center" }}>Rol</dt>
                <dd>
                  <span
                    className="badge"
                    style={{ background: "var(--vsc-bg-badge)", color: "var(--vsc-fg-active)" }}
                  >
                    {ROL_LABEL[user.rol] ?? user.rol}
                  </span>
                </dd>

                <dt style={{ color: "var(--vsc-fg-secondary)", alignSelf: "center" }}>Gemeente</dt>
                <dd style={{ color: "var(--vsc-fg-active)", fontSize: "0.82rem" }}>
                  {user.gemeenteNaam ?? user.gemeenteId}
                </dd>
              </dl>
            )}
          </section>

          {/* About section */}
          <section aria-labelledby="over-head" style={{ marginBottom: 32 }}>
            <h2
              id="over-head"
              style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}
            >
              Over deze applicatie
            </h2>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: "8px 16px",
                fontSize: "0.85rem",
                color: "var(--vsc-fg-secondary)",
                lineHeight: 1.8,
              }}
            >
              <dt>Versie</dt>
              <dd>v0.1.0</dd>
              <dt>Standaard</dt>
              <dd>WCAG 2.2 AA (ISO/IEC 40500:2025)</dd>
              <dt>Licentie</dt>
              <dd>EUPL-1.2</dd>
            </dl>
            <p style={{ marginTop: 12, fontSize: "0.82rem" }}>
              <Link href="/help" style={{ color: "var(--vsc-link)" }}>
                Naar Help &amp; Documentatie
              </Link>
            </p>
          </section>

          {/* Logout */}
          <div style={{ borderTop: "1px solid var(--vsc-border)", paddingTop: 20 }}>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "auto", background: "var(--vsc-error-bg)", borderColor: "var(--vsc-error)" }}
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
            >
              {loggingOut ? "Uitloggen…" : "Uitloggen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
