"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
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
  const [url, setUrl] = useState("https://example.com");
  const [selectedLayers, setSelectedLayers] = useState<ScanLayer[]>(["L1", "L6", "L7"]);
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleLayer = (layer: ScanLayer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer],
    );
  };

  const startScans = async () => {
    setError(null);
    setScanning(true);
    const newScans: ScanJob[] = [];

    for (const layer of selectedLayers) {
      try {
        const endpoint = LAYER_ENDPOINTS[layer];
        const body: Record<string, unknown> = {
          url,
          viewport: { name: "desktop", w: 1280, h: 1024 },
        };

        const res = await fetch(`${API_BASE}/api/v1/audits/${AUDIT_ID}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
        if (scan.status === "voltooid" || scan.status === "mislukt" || !scan.scanId) {
          return scan;
        }

        try {
          const endpoint = LAYER_ENDPOINTS[scan.layer];
          const res = await fetch(
            `${API_BASE}/api/v1/audits/${AUDIT_ID}/${endpoint}/${scan.scanId}`,
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

    const allDone = updated.every(
      (s) => s.status === "voltooid" || s.status === "mislukt",
    );
    if (allDone) setScanning(false);
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
      <h2>Dashboard</h2>

      <div className="card">
        <h2>Nieuwe scan starten</h2>

        <div className="form-group">
          <label htmlFor="scan-url">URL om te scannen</label>
          <input
            id="scan-url"
            type="url"
            className="form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.gemeente.nl"
            disabled={scanning}
            required
          />
        </div>

        <fieldset style={{ border: "none", padding: 0, marginBottom: "1rem" }}>
          <legend style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Scan-lagen selecteren
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {(Object.keys(LAYER_LABELS) as ScanLayer[]).map((layer) => (
              <label
                key={layer}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                  background: selectedLayers.includes(layer)
                    ? "rgba(21, 66, 115, 0.1)"
                    : "transparent",
                  borderRadius: "4px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(layer)}
                  onChange={() => toggleLayer(layer)}
                  disabled={scanning}
                />
                <strong>{layer}</strong>: {LAYER_LABELS[layer]}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="btn btn-primary"
          onClick={startScans}
          disabled={scanning || !url || selectedLayers.length === 0}
          type="button"
        >
          {scanning ? "Bezig met scannen..." : "Scan starten"}
        </button>
      </div>

      {scans.length > 0 && (
        <>
          <div className="stats-grid" role="region" aria-label="Scan statistieken">
            <div className="stat-card">
              <div className="stat-value">{totalFindings}</div>
              <div className="stat-label">Bevindingen</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {completedScans}/{scans.length}
              </div>
              <div className="stat-label">Scans voltooid</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {scans
                  .filter((s) => s.status === "voltooid")
                  .reduce((sum, s) => sum + s.duration, 0)}
                ms
              </div>
              <div className="stat-label">Totale duur</div>
            </div>
          </div>

          <div className="card">
            <h2>Scan resultaten</h2>
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
                        <span style={{ fontSize: "0.75rem", color: "var(--nl-color-text-muted)" }}>
                          {LAYER_LABELS[scan.layer]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-status-${scan.status}`}>
                          {scan.status}
                        </span>
                        {scan.error && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--nl-color-error)",
                              marginTop: "0.25rem",
                            }}
                          >
                            {scan.error}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="progress-bar" role="progressbar" aria-valuenow={scan.progress} aria-valuemin={0} aria-valuemax={100}>
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${scan.progress}%` }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem" }}>{scan.progress}%</span>
                      </td>
                      <td>{scan.findings}</td>
                      <td>{scan.duration > 0 ? `${scan.duration}ms` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          className="card"
          role="alert"
          style={{ borderColor: "var(--nl-color-error)" }}
        >
          <p style={{ color: "var(--nl-color-error)" }}>{error}</p>
        </div>
      )}
    </>
  );
}
