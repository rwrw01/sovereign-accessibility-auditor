"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";

interface Audit {
  id: string;
  naam: string;
  doelUrls: string[] | string;
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
          <div style={{ padding: "16px", background: "var(--vsc-bg-sidebar)", border: "1px solid var(--vsc-border)", borderRadius: "var(--vsc-radius)" }}>
            <p style={{ color: "var(--vsc-fg-secondary)", marginBottom: 8 }}>
              Nog geen audits gevonden.
            </p>
            <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.8rem" }}>
              Start een scan via het <Link href="/" style={{ color: "var(--vsc-fg-link)" }}>dashboard</Link> of
              de <Link href="/scan" style={{ color: "var(--vsc-fg-link)" }}>scanpagina</Link>.
            </p>
          </div>
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
                  const urls = Array.isArray(audit.doelUrls)
                    ? audit.doelUrls
                    : (() => { try { return JSON.parse(audit.doelUrls as string) as string[]; } catch { return []; } })();
                  return (
                    <tr key={audit.id} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          href={`/audits/${audit.id}`}
                          style={{ color: "var(--vsc-link)", textDecoration: "none" }}
                        >
                          {audit.naam}
                        </Link>
                      </td>
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
