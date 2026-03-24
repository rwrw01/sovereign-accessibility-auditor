"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";

interface Scan {
  id: string;
  url: string;
  paginaNaam: string | null;
  viewport: string;
  scannerLaag: string;
  status: string;
  foutmelding: string | null;
  gestartOp: string | null;
  voltooidOp: string | null;
}

interface Issue {
  id: string;
  type: string;
  wcagCriterium: string;
  wcagNiveau: string;
  bronEngine: string;
  selector: string;
  context: string;
  boodschap: string;
  paginaUrl: string;
  viewport: string;
  ernst: string;
}

interface AuditDetail {
  id: string;
  naam: string;
  doelUrls: string[] | string;
  status: string;
  aangemaaktOp: string;
  voltooidOp: string | null;
  scans: Scan[];
  issues: Issue[];
}

const ERNST_ORDER: Record<string, number> = {
  critical: 0, serious: 1, moderate: 2, minor: 3,
};

const STATUS_LABELS: Record<string, string> = {
  wachtend: "In wachtrij",
  actief: "Bezig met scannen",
  voltooid: "Voltooid",
  mislukt: "Mislukt",
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAudit = useCallback(async () => {
    try {
      const res = await apiClient(`/api/v1/audits/${id}`);
      if (res.ok) {
        const data = (await res.json()) as AuditDetail;
        setAudit(data);
        setError(null);
      } else {
        setError("Audit niet gevonden");
      }
    } catch {
      setError("Kan audit niet laden");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Auto-poll every 3s while scans are still pending/active
  const hasActiveScans = audit?.scans.some(
    (s) => s.status === "wachtend" || s.status === "actief",
  ) ?? false;
  const isAuditActive = audit?.status === "actief";

  useEffect(() => {
    if (!hasActiveScans && !isAuditActive) return;
    const interval = setInterval(fetchAudit, 3000);
    return () => clearInterval(interval);
  }, [hasActiveScans, isAuditActive, fetchAudit]);

  if (loading) {
    return (
      <div className="vsc-editor-content">
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--vsc-fg-secondary)" }}>
          Audit laden...
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="vsc-editor-content">
        <p style={{ color: "var(--vsc-error)" }}>{error ?? "Onbekende fout"}</p>
        <Link href="/audits" style={{ color: "var(--vsc-link)", display: "inline-block", marginTop: 8 }}>
          ← Terug naar audits
        </Link>
      </div>
    );
  }

  const urls = Array.isArray(audit.doelUrls)
    ? audit.doelUrls
    : (() => { try { return JSON.parse(audit.doelUrls as string) as string[]; } catch { return [String(audit.doelUrls)]; } })();

  const sortedIssues = [...audit.issues].sort(
    (a, b) => (ERNST_ORDER[a.ernst] ?? 9) - (ERNST_ORDER[b.ernst] ?? 9),
  );

  const completedScans = audit.scans.filter((s) => s.status === "voltooid").length;
  const failedScans = audit.scans.filter((s) => s.status === "mislukt").length;
  const pendingScans = audit.scans.filter((s) => s.status === "wachtend" || s.status === "actief").length;

  const criticalCount = audit.issues.filter((i) => i.ernst === "critical" || i.ernst === "serious").length;
  const warningCount = audit.issues.filter((i) => i.ernst === "moderate").length;

  return (
    <>
      <div className="vsc-tabbar">
        <Link href="/audits" className="vsc-tab" style={{ textDecoration: "none" }}>Audits</Link>
        <span className="vsc-tab" aria-current="true">{audit.naam}</span>
      </div>

      <div className="vsc-editor-content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: "1.1rem", marginBottom: 4, color: "var(--vsc-fg-active)" }}>
              {audit.naam}
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)" }}>
              {urls.join(", ")} — {new Date(audit.aangemaaktOp).toLocaleString("nl-NL")}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`badge badge-status-${audit.status}`}>
              {STATUS_LABELS[audit.status] ?? audit.status}
            </span>
            {(hasActiveScans || isAuditActive) && (
              <span style={{ fontSize: "0.75rem", color: "var(--vsc-info)" }} role="status">
                ● Automatisch verversend...
              </span>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="stats-grid" role="region" aria-label="Audit statistieken">
          <div className="stat-card">
            <div className="stat-value">{audit.scans.length}</div>
            <div className="stat-label">Scans totaal</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: pendingScans > 0 ? "var(--vsc-warning)" : "var(--vsc-success)" }}>
              {completedScans}/{audit.scans.length}
            </div>
            <div className="stat-label">
              {pendingScans > 0 ? `${pendingScans} in wachtrij` : "Voltooid"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: criticalCount > 0 ? "var(--vsc-error)" : "var(--vsc-fg-active)" }}>
              {audit.issues.length}
            </div>
            <div className="stat-label">
              Bevindingen{criticalCount > 0 ? ` (${criticalCount} ernstig)` : ""}
            </div>
          </div>
          {failedScans > 0 && (
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--vsc-error)" }}>{failedScans}</div>
              <div className="stat-label">Mislukt</div>
            </div>
          )}
        </div>

        {/* Progress bar when scans are active */}
        {audit.scans.length > 0 && pendingScans > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--vsc-fg-secondary)", marginBottom: 4 }}>
              <span>Voortgang</span>
              <span>{Math.round((completedScans / audit.scans.length) * 100)}%</span>
            </div>
            <div className="progress-bar" role="progressbar" aria-valuenow={completedScans} aria-valuemin={0} aria-valuemax={audit.scans.length} aria-label="Scan voortgang" style={{ height: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${(completedScans / audit.scans.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Scans table */}
        <h2 style={{ fontSize: "0.95rem", marginBottom: 8, color: "var(--vsc-fg-active)" }}>
          Scans ({audit.scans.length})
        </h2>

        {audit.scans.length === 0 ? (
          <div style={{ color: "var(--vsc-fg-secondary)", marginBottom: 20, fontSize: "0.85rem", padding: "12px 16px", background: "var(--vsc-bg-sidebar)", borderRadius: "var(--vsc-radius)", border: "1px solid var(--vsc-border)" }}>
            <strong style={{ color: "var(--vsc-fg)" }}>Geen scans gevonden</strong>
            <br />
            De scan-jobs staan mogelijk in de wachtrij. Controleer of de scanner workers draaien
            (<code style={{ fontSize: "0.75rem" }}>npm run dev</code> start alles automatisch).
          </div>
        ) : (
          <div className="table-container" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Laag</th>
                  <th scope="col">URL</th>
                  <th scope="col">Viewport</th>
                  <th scope="col">Status</th>
                  <th scope="col">Duur</th>
                </tr>
              </thead>
              <tbody>
                {audit.scans.map((scan) => {
                  const duration = scan.gestartOp && scan.voltooidOp
                    ? `${((new Date(scan.voltooidOp).getTime() - new Date(scan.gestartOp).getTime()) / 1000).toFixed(1)}s`
                    : scan.gestartOp
                      ? "bezig..."
                      : "—";
                  return (
                    <tr key={scan.id}>
                      <td><strong>{scan.scannerLaag}</strong></td>
                      <td style={{ fontSize: "0.8rem" }}>{scan.url}</td>
                      <td>{scan.viewport}</td>
                      <td>
                        <span className={`badge badge-status-${scan.status}`}>
                          {STATUS_LABELS[scan.status] ?? scan.status}
                        </span>
                        {scan.foutmelding && (
                          <div style={{ fontSize: "0.75rem", color: "var(--vsc-error)", marginTop: 4, maxWidth: 300 }}>
                            {scan.foutmelding}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem" }}>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Issues table */}
        <h2 style={{ fontSize: "0.95rem", marginBottom: 8, color: "var(--vsc-fg-active)" }}>
          Bevindingen ({audit.issues.length})
          {warningCount > 0 && <span style={{ fontSize: "0.8rem", color: "var(--vsc-fg-secondary)", marginLeft: 8 }}>
            {criticalCount} ernstig, {warningCount} matig
          </span>}
        </h2>

        {audit.issues.length === 0 ? (
          <div style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem", padding: "12px 16px", background: "var(--vsc-bg-sidebar)", borderRadius: "var(--vsc-radius)", border: "1px solid var(--vsc-border)" }}>
            {pendingScans > 0 ? (
              <>
                <strong style={{ color: "var(--vsc-info)" }}>Scans worden uitgevoerd...</strong>
                <br />
                Resultaten verschijnen hier automatisch zodra scans klaar zijn. Deze pagina ververst elke 3 seconden.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--vsc-success)" }}>Geen bevindingen</strong>
                <br />
                Alle scans zijn voltooid zonder bevindingen.
              </>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Ernst</th>
                  <th scope="col">Type</th>
                  <th scope="col">WCAG</th>
                  <th scope="col">Niveau</th>
                  <th scope="col">Engine</th>
                  <th scope="col">Bericht</th>
                  <th scope="col">Selector</th>
                </tr>
              </thead>
              <tbody>
                {sortedIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td><span className={`badge badge-${issue.ernst}`}>{issue.ernst}</span></td>
                    <td><span className={`badge badge-${issue.type}`}>{issue.type}</span></td>
                    <td>{issue.wcagCriterium}</td>
                    <td>{issue.wcagNiveau}</td>
                    <td style={{ fontSize: "0.75rem" }}>{issue.bronEngine}</td>
                    <td>{issue.boodschap}</td>
                    <td><code style={{ fontSize: "0.7rem", color: "var(--vsc-fg-secondary)" }}>{issue.selector}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Last refresh indicator */}
        <div style={{ marginTop: 16, fontSize: "0.75rem", color: "var(--vsc-fg-muted)", textAlign: "right" }}>
          Laatst ververst: {lastRefresh.toLocaleTimeString("nl-NL")}
          {!hasActiveScans && !isAuditActive && (
            <button
              type="button"
              onClick={fetchAudit}
              style={{ marginLeft: 8, background: "none", border: "1px solid var(--vsc-border)", color: "var(--vsc-link)", cursor: "pointer", padding: "1px 8px", borderRadius: 3, fontSize: "0.75rem" }}
            >
              Ververs
            </button>
          )}
        </div>
      </div>
    </>
  );
}
