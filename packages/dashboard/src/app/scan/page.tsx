"use client";

import { useState } from "react";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
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
      const res = await fetch(`${API_BASE}/api/v1/audits/${AUDIT_ID}/${endpoint}`, {
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

      // Poll for results
      const scanId = data.scanId;
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          setStatus("error");
          setErrorMsg("Scan timeout na 60 seconden");
          return;
        }

        const pollRes = await fetch(
          `${API_BASE}/api/v1/audits/${AUDIT_ID}/${endpoint}/${scanId}`,
        );

        if (!pollRes.ok) {
          setTimeout(poll, 2000);
          return;
        }

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
      <h2>Nieuwe scan</h2>

      <div className="card">
        <div className="form-group">
          <label htmlFor="scan-url">URL</label>
          <input
            id="scan-url"
            type="url"
            className="form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === "submitting" || status === "polling"}
          />
        </div>

        <div className="form-group">
          <label htmlFor="scan-layer">Scanner</label>
          <select
            id="scan-layer"
            className="form-input"
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
          className="btn btn-primary"
          onClick={runScan}
          disabled={status === "submitting" || status === "polling"}
          type="button"
        >
          {status === "submitting"
            ? "Versturen..."
            : status === "polling"
              ? "Wachten op resultaat..."
              : "Scan starten"}
        </button>
      </div>

      {errorMsg && (
        <div className="card" role="alert" style={{ borderColor: "var(--nl-color-error)" }}>
          <p style={{ color: "var(--nl-color-error)" }}>{errorMsg}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <h2>
            Resultaten ({result.findings.length} bevindingen, {result.totalDurationMs}ms)
          </h2>

          {result.findings.length === 0 ? (
            <p>Geen bevindingen gevonden.</p>
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
                  {result.findings.map((finding, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge badge-${finding.type}`}>{finding.type}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${finding.impact}`}>{finding.impact}</span>
                      </td>
                      <td>
                        {finding.wcagCriteria.map((c) => (
                          <span key={c} style={{ marginRight: "4px" }}>
                            {c} ({finding.wcagLevel})
                          </span>
                        ))}
                      </td>
                      <td>{finding.check}</td>
                      <td>{finding.message}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem" }}>{finding.selector}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
