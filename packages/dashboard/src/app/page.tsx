"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, FileText, Settings } from "lucide-react";
import { apiClient } from "../lib/api-client";

const AUDIT_ID = "00000000-0000-0000-0000-000000000001";

type ScanLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

interface ScanJob {
  layer: ScanLayer;
  scanId: string;
  status: "wachtend" | "actief" | "voltooid" | "mislukt";
  progress: number;
  findings: number;
  duration: number;
  error?: string;
}

const LAYER_ENDPOINTS: Record<ScanLayer, string> = {
  L1: "scan",
  L2: "visual-regression",
  L3: "behavioral",
  L4: "a11y-tree",
  L5: "touch-targets",
  L6: "screenreader",
  L7: "cognitive",
};

const LAYER_LABELS: Record<ScanLayer, string> = {
  L1: "Multi-engine (axe + IBM)",
  L2: "Visuele regressie",
  L3: "Gedragstests",
  L4: "A11y tree diff",
  L5: "Touch targets",
  L6: "Screenreader simulatie",
  L7: "Cognitieve analyse",
};

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("https://example.com");
  const [selectedLayers, setSelectedLayers] = useState<ScanLayer[]>(["L1", "L6", "L7"]);
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<ScanJob[]>([]);

  const toggleLayer = (layer: ScanLayer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  };

  const startScans = async () => {
    setScanning(true);
    const newScans: ScanJob[] = [];

    for (const layer of selectedLayers) {
      try {
        const endpoint = LAYER_ENDPOINTS[layer];
        const res = await apiClient(`/api/v1/audits/${AUDIT_ID}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            viewport: { name: "desktop", w: 1280, h: 1024 },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { scanId: string };
        newScans.push({
          layer,
          scanId: data.scanId,
          status: "wachtend",
          progress: 0,
          findings: 0,
          duration: 0,
        });
      } catch (err) {
        newScans.push({
          layer,
          scanId: "",
          status: "mislukt",
          progress: 0,
          findings: 0,
          duration: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setScans(newScans);
  };

  const pollScans = useCallback(async () => {
    const updated = await Promise.all(
      scans.map(async (scan) => {
        if (scan.status === "voltooid" || scan.status === "mislukt" || !scan.scanId) return scan;

        try {
          const endpoint = LAYER_ENDPOINTS[scan.layer];
          const res = await apiClient(
            `/api/v1/audits/${AUDIT_ID}/${endpoint}/${scan.scanId}`,
          );
          if (!res.ok) return scan;

          const data = (await res.json()) as {
            status: string;
            progress: number;
            result?: { findings: unknown[]; totalDurationMs: number };
            error?: string;
          };

          return {
            ...scan,
            status: data.status as ScanJob["status"],
            progress: typeof data.progress === "number" ? data.progress : scan.progress,
            findings: data.result?.findings?.length ?? scan.findings,
            duration: data.result?.totalDurationMs ?? scan.duration,
            error: data.error ?? scan.error,
          };
        } catch {
          return scan;
        }
      }),
    );

    setScans(updated);
    if (updated.every((s) => s.status === "voltooid" || s.status === "mislukt")) {
      setScanning(false);
    }
  }, [scans]);

  useEffect(() => {
    if (!scanning || scans.length === 0) return;
    const interval = setInterval(pollScans, 2000);
    return () => clearInterval(interval);
  }, [scanning, scans, pollScans]);

  const totalFindings = scans.reduce((sum, s) => sum + s.findings, 0);
  const completedScans = scans.filter((s) => s.status === "voltooid").length;

  return (
    <>
      {/* Tab Bar */}
      <div className="vsc-tabbar" role="tablist">
        <button className="vsc-tab" role="tab" aria-selected="true">
          Welkom
        </button>
      </div>

      {/* Editor Content */}
      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 300, marginBottom: 24, color: "var(--vsc-fg-active)" }}>
          Sovereign Accessibility Auditor
        </h1>

        {scans.length === 0 ? (
          /* Welcome view */
          <div className="welcome-grid">
            <div className="welcome-section">
              <h2>Beginnen</h2>
              <button className="welcome-link" onClick={() => router.push("/scan")}>
                <Play size={14} /> Nieuwe scan starten
              </button>
              <button className="welcome-link" onClick={() => router.push("/rapportage")}>
                <FileText size={14} /> Rapport genereren
              </button>
              <button className="welcome-link" onClick={() => router.push("/instellingen")}>
                <Settings size={14} /> Instellingen
              </button>
            </div>
            <div className="welcome-section">
              <h2>Snelle scan</h2>
              <div className="form-group">
                <label htmlFor="quick-url">URL</label>
                <input
                  id="quick-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.gemeente.nl"
                />
              </div>
              <fieldset style={{ border: "none", padding: 0, marginBottom: 12 }}>
                <legend style={{ fontSize: "0.85rem", marginBottom: 8, color: "var(--vsc-fg)" }}>
                  Scanlagen
                </legend>
                <div className="layer-grid">
                  {(Object.keys(LAYER_LABELS) as ScanLayer[]).map((layer) => (
                    <label key={layer} className="layer-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedLayers.includes(layer)}
                        onChange={() => toggleLayer(layer)}
                      />
                      <strong>{layer}</strong> {LAYER_LABELS[layer]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                className="btn-primary"
                onClick={startScans}
                disabled={scanning || !url || selectedLayers.length === 0}
                type="button"
                style={{ width: "auto" }}
              >
                {scanning ? "Bezig..." : "Scan starten"}
              </button>
            </div>
          </div>
        ) : (
          /* Scan results view */
          <>
            <div className="stats-grid" role="region" aria-label="Scan statistieken">
              <div className="stat-card">
                <div className="stat-value">{totalFindings}</div>
                <div className="stat-label">Bevindingen</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{completedScans}/{scans.length}</div>
                <div className="stat-label">Scans voltooid</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {scans.filter((s) => s.status === "voltooid").reduce((sum, s) => sum + s.duration, 0)}ms
                </div>
                <div className="stat-label">Totale duur</div>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Laag</th>
                    <th scope="col">Status</th>
                    <th scope="col">Voortgang</th>
                    <th scope="col">Bevindingen</th>
                    <th scope="col">Duur</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.layer}>
                      <td>
                        <strong>{scan.layer}</strong>
                        <br />
                        <span style={{ fontSize: "0.75rem", color: "var(--vsc-fg-secondary)" }}>
                          {LAYER_LABELS[scan.layer]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-status-${scan.status}`}>{scan.status}</span>
                        {scan.error && (
                          <div style={{ fontSize: "0.75rem", color: "var(--vsc-error)", marginTop: 4 }}>
                            {scan.error}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="progress-bar" role="progressbar" aria-valuenow={scan.progress} aria-valuemin={0} aria-valuemax={100}>
                          <div className="progress-bar-fill" style={{ width: `${scan.progress}%` }} />
                        </div>
                      </td>
                      <td>{scan.findings}</td>
                      <td>{scan.duration > 0 ? `${scan.duration}ms` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Bottom Panel */}
      {scans.length > 0 && (
        <div className="vsc-panel" style={{ height: "var(--vsc-panel-h)" }}>
          <div className="vsc-panel-tabs" role="tablist">
            <button className="vsc-panel-tab" role="tab" aria-selected="true">
              Bevindingen
            </button>
          </div>
          <div className="vsc-panel-content" role="tabpanel">
            {scans
              .filter((s) => s.status === "voltooid")
              .map((s) => (
                <div key={s.layer} className="log-line">
                  <span className="log-success">[{s.layer}]</span>{" "}
                  {s.findings} bevindingen gevonden in {s.duration}ms
                </div>
              ))}
            {scans
              .filter((s) => s.status === "mislukt")
              .map((s) => (
                <div key={s.layer} className="log-line">
                  <span className="log-error">[{s.layer}]</span> {s.error ?? "Mislukt"}
                </div>
              ))}
            {scanning && (
              <div className="log-line">
                <span className="log-info">[scan]</span> Bezig met scannen...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
