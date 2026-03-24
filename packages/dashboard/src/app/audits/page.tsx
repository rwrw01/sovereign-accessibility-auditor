"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client";

interface Audit {
  id: string;
  naam: string;
  doelUrls: string[] | string;
  status: string;
  aangemaaktOp: string;
}

function parseUrls(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

const STATUS_LABEL: Record<string, string> = {
  wachtend: "Wachtend",
  actief: "Bezig",
  voltooid: "Voltooid",
  mislukt: "Mislukt",
};

export default function AuditsPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadAudits() {
    setLoading(true);
    setError("");
    apiClient("/api/v1/audits")
      .then(async (res) => {
        if (!res.ok) { setError("Kon audits niet laden"); return; }
        const data = (await res.json()) as Audit[];
        setAudits(data);
      })
      .catch(() => setError("Kon audits niet laden — controleer de verbinding"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAudits(); }, []);

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Audits</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}>
          Audits
        </h1>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <div className="login-error" role="alert" style={{ marginBottom: 8 }}>
              {error}
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "auto" }}
              onClick={loadAudits}
            >
              Probeer opnieuw
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--vsc-fg-secondary)" }} role="status">Laden…</p>
        ) : !error && audits.length === 0 ? (
          <div
            style={{
              padding: 20,
              background: "var(--vsc-bg-secondary)",
              border: "1px solid var(--vsc-border)",
              borderRadius: "var(--vsc-radius)",
              maxWidth: 480,
            }}
          >
            <p style={{ color: "var(--vsc-fg-active)", marginBottom: 8, fontWeight: 500 }}>
              Nog geen audits
            </p>
            <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
              Er zijn nog geen scans uitgevoerd. Start een eerste scan om hier uw auditoverzicht te
              zien.
            </p>
            <Link href="/scan" className="btn-primary" style={{ display: "inline-block", width: "auto", textDecoration: "none" }}>
              Nieuwe scan starten
            </Link>
          </div>
        ) : !error && audits.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Website</th>
                  <th scope="col">Status</th>
                  <th scope="col">URL&apos;s</th>
                  <th scope="col">Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const urls = parseUrls(audit.doelUrls);
                  const displayName = urls.length > 0 && urls[0] ? getHostname(urls[0]) : audit.naam;

                  return (
                    <tr
                      key={audit.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/audits/${audit.id}`)}
                    >
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          href={`/audits/${audit.id}`}
                          style={{ color: "var(--vsc-link)", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge badge-status-${audit.status}`}>
                          {STATUS_LABEL[audit.status] ?? audit.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)" }}>
                        {urls.length}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)" }}>
                        {new Date(audit.aangemaaktOp).toLocaleString("nl-NL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
