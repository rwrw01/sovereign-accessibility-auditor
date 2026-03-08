"use client";

import { useState } from "react";
import { apiClient } from "../../lib/api-client";

const AUDIT_ID = "00000000-0000-0000-0000-000000000001";

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

type ScanStatus = "idle" | "submitting" | "polling" | "done" | "error";

export default function ScanPage() {
  const [url, setUrl] = useState("https://example.com");
  const [layer, setLayer] = useState("screenreader");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ENDPOINTS: Record<string, string> = {
    scan: "scan",
    "visual-regression": "visual-regression",
    behavioral: "behavioral",
    "a11y-tree": "a11y-tree",
    "touch-targets": "touch-targets",
    screenreader: "screenreader",
    cognitive: "cognitive",
  };

  const runScan = async () => {
    setStatus("submitting");
    setResult(null);
    setErrorMsg(null);

    try {
      const endpoint = ENDPOINTS[layer] ?? layer;
      const res = await apiClient(`/api/v1/audits/${AUDIT_ID}/${endpoint}`, {
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
          `/api/v1/audits/${AUDIT_ID}/${endpoint}/${data.scanId}`,
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
      <div className="vsc-tabbar" role="tablist">
        <button className="vsc-tab" role="tab" aria-selected="true">Scan</button>
      </div>

      <div className="vsc-editor-content">
        <h2 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--vsc-fg-active)" }}>
          Nieuwe scan
        </h2>

        <div style={{ maxWidth: 500 }}>
          <div className="form-group">
            <label htmlFor="scan-url">URL</label>
            <input
              id="scan-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === "submitting" || status === "polling"}
            />
          </div>

          <div className="form-group">
            <label htmlFor="scan-layer">Scanner</label>
            <select
              id="scan-layer"
              value={layer}
              onChange={(e) => setLayer(e.target.value)}
              disabled={status === "submitting" || status === "polling"}
            >
              <option value="scan">L1 Multi-engine (axe + IBM)</option>
              <option value="visual-regression">L2 Visuele regressie</option>
              <option value="behavioral">L3 Gedragstests</option>
              <option value="a11y-tree">L4 A11y tree diff</option>
              <option value="touch-targets">L5 Touch targets</option>
              <option value="screenreader">L6 Screenreader simulatie</option>
              <option value="cognitive">L7 Cognitieve analyse</option>
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={runScan}
            disabled={status === "submitting" || status === "polling"}
            type="button"
            style={{ width: "auto" }}
          >
            {status === "submitting"
              ? "Versturen..."
              : status === "polling"
                ? "Wachten op resultaat..."
                : "Scan starten"}
          </button>
        </div>

        {errorMsg && (
          <div className="login-error" role="alert" style={{ marginTop: 16, maxWidth: 500 }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
              Resultaten ({result.findings.length} bevindingen, {result.totalDurationMs}ms)
            </h3>

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
