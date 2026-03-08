"use client";

import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api-client";

interface Audit {
  id: string;
  naam: string;
  doelUrls: string;
  status: string;
  aangemaaktOp: string;
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient("/api/v1/audits")
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as Audit[];
          setAudits(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Audits</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}>
          Audits
        </h1>

        {loading ? (
          <p style={{ color: "var(--vsc-fg-secondary)" }} role="status">Laden...</p>
        ) : audits.length === 0 ? (
          <p style={{ color: "var(--vsc-fg-secondary)" }}>
            Nog geen audits. Start een scan via het dashboard of de scanpagina.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Naam</th>
                  <th scope="col">Status</th>
                  <th scope="col">URL&apos;s</th>
                  <th scope="col">Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  let urls: string[] = [];
                  try { urls = JSON.parse(audit.doelUrls) as string[]; } catch { /* empty */ }
                  return (
                    <tr key={audit.id}>
                      <td style={{ fontWeight: 500 }}>{audit.naam}</td>
                      <td><span className={`badge badge-status-${audit.status}`}>{audit.status}</span></td>
                      <td style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)" }}>
                        {urls.join(", ")}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)" }}>
                        {new Date(audit.aangemaaktOp).toLocaleString("nl-NL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
