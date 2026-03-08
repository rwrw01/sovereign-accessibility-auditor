"use client";

import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api-client";

interface UserInfo {
  id: string;
  email: string;
  naam: string | null;
  rol: string;
  gemeenteId: string;
}

export default function InstellingenPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    apiClient("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data as UserInfo); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Instellingen</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 24, color: "var(--vsc-fg-active)" }}>
          Instellingen
        </h1>

        <div style={{ maxWidth: 500 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Gebruikersprofiel
          </h2>

          {user ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="form-group">
                <label htmlFor="settings-email">E-mailadres</label>
                <input id="settings-email" value={user.email} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="settings-naam">Naam</label>
                <input id="settings-naam" value={user.naam ?? ""} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="settings-rol">Rol</label>
                <input id="settings-rol" value={user.rol} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="settings-gemeente">Gemeente</label>
                <input id="settings-gemeente" value={user.gemeenteId} disabled />
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--vsc-fg-secondary)" }} role="status">Laden...</p>
          )}

          <h2 style={{ fontSize: "0.95rem", marginTop: 32, marginBottom: 12, color: "var(--vsc-fg-active)" }}>
            Over
          </h2>
          <div style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem", lineHeight: 1.8 }}>
            <p>Sovereign Accessibility Auditor v0.1.0</p>
            <p>WCAG 2.2 AA (ISO/IEC 40500:2025)</p>
            <p>Licentie: EUPL-1.2</p>
          </div>
        </div>
      </div>
    </>
  );
}
