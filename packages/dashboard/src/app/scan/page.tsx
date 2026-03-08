"use client";

import { useState } from "react";
import { apiClient } from "../../lib/api-client";

interface Finding {
  check: string;
  type: "error" | "warning" | "notice";
  wcagCriteria: string[];
  wcagLevel: string;
  selector: string;
  context: string;
  message: string;
  impact: string;
  confidence: number;
}

interface ScanResult {
  scanId: string;
  findings: Finding[];
  totalDurationMs: number;
}

type ScanLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
type ScanStatus = "idle" | "submitting" | "polling" | "done" | "error";

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

export default function ScanPage() {
  const [url, setUrl] = useState("https://example.com");
  const [selectedLayers, setSelectedLayers] = useState<ScanLayer[]>(["L1", "L6", "L7"]);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleLayer = (layer: ScanLayer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  };

  const selectAll = () => setSelectedLayers(Object.keys(LAYER_LABELS) as ScanLayer[]);

  const runScan = async () => {
    if (selectedLayers.length === 0) return;
    setStatus("submitting");
    setResult(null);
    setErrorMsg(null);

    try {
      // Create quick audit
      const qsRes = await apiClient("/api/v1/quick-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, layers: selectedLayers }),
      });

      if (!qsRes.ok) {
        const errData = await qsRes.json().catch(() => ({ error: qsRes.statusText }));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${qsRes.status}`);
      }

      const { auditId } = (await qsRes.json()) as { auditId: string };

      // Start first selected layer
      const layer = selectedLayers[0]!;
      const endpoint = LAYER_ENDPOINTS[layer];
      const res = await apiClient(`/api/v1/audits/${auditId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          viewport: { name: "desktop", w: 1280, h: 1024 },
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = (await res.json()) as { scanId: string };
      setStatus("polling");

      let attempts = 0;
      const poll = async () => {
        attempts++;
        if (attempts > 30) {
          setStatus("error");
          setErrorMsg("Scan timeout na 60 seconden");
          return;
        }

        const pollRes = await apiClient(
          `/api/v1/audits/${auditId}/${endpoint}/${data.scanId}`,
        );

        if (!pollRes.ok) { setTimeout(poll, 2000); return; }

        const pollData = (await pollRes.json()) as {
          status: string;
          result?: ScanResult;
          error?: string;
        };

        if (pollData.status === "voltooid" && pollData.result) {
          setResult(pollData.result);
          setStatus("done");
        } else if (pollData.status === "mislukt") {
          setStatus("error");
          setErrorMsg(pollData.error ?? "Scan mislukt");
        } else {
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Scan</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}>
          Nieuwe scan
        </h1>

        <div style={{ maxWidth: 600 }}>
          <div className="form-group">
            <label htmlFor="scan-url">URL</label>
            <input
              id="scan-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://athide.nl"
              disabled={status === "submitting" || status === "polling"}
            />
          </div>

          <fieldset style={{ border: "none", padding: 0, marginBottom: 12 }}>
            <legend style={{ fontSize: "0.85rem", marginBottom: 8, color: "var(--vsc-fg)" }}>
              Scanlagen
              <button
                type="button"
                onClick={selectAll}
                style={{
                  marginLeft: 12,
                  background: "none",
                  border: "1px solid var(--vsc-border)",
                  color: "var(--vsc-link)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: 3,
                }}
              >
                Selecteer alle
              </button>
            </legend>
            <div className="layer-grid">
              {(Object.keys(LAYER_LABELS) as ScanLayer[]).map((layer) => (
                <label key={layer} className="layer-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(layer)}
                    onChange={() => toggleLayer(layer)}
                    disabled={status === "submitting" || status === "polling"}
                  />
                  <strong>{layer}</strong> {LAYER_LABELS[layer]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="btn-primary"
            onClick={runScan}
            disabled={status === "submitting" || status === "polling" || selectedLayers.length === 0}
            type="button"
            style={{ width: "auto" }}
          >
            {status === "submitting"
              ? "Versturen..."
              : status === "polling"
                ? "Wachten op resultaat..."
                : `Scan starten (${selectedLayers.length} ${selectedLayers.length === 1 ? "laag" : "lagen"})`}
          </button>
        </div>

        {errorMsg && (
          <div className="login-error" role="alert" style={{ marginTop: 16, maxWidth: 600 }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 24 }} aria-live="polite">
            <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
              Resultaten ({result.findings.length} bevindingen, {result.totalDurationMs}ms)
            </h2>

            {result.findings.length === 0 ? (
              <p style={{ color: "var(--vsc-fg-secondary)" }}>Geen bevindingen gevonden.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Impact</th>
                      <th scope="col">WCAG</th>
                      <th scope="col">Check</th>
                      <th scope="col">Bericht</th>
                      <th scope="col">Selector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.findings.map((f, i) => (
                      <tr key={i}>
                        <td><span className={`badge badge-${f.type}`}>{f.type}</span></td>
                        <td><span className={`badge badge-${f.impact}`}>{f.impact}</span></td>
                        <td>{f.wcagCriteria.join(", ")}</td>
                        <td>{f.check}</td>
                        <td>{f.message}</td>
                        <td><code style={{ fontSize: "0.7rem", color: "var(--vsc-fg-secondary)" }}>{f.selector}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
