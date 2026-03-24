"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import { ScanProgress, CompletionBanner, TimeoutBanner, LAYER_LABELS, LAYER_ENDPOINTS } from "./ScanProgress";
import type { ScanLayer, LayerState } from "./ScanProgress";
import { FindingsTable } from "./FindingsTable";
import type { Finding } from "./FindingsTable";

type PageStatus = "idle" | "submitting" | "polling" | "done" | "error" | "timeout";

interface ScanSession {
  auditId: string;
  url: string;
  layers: ScanLayer[];
  scanIds: Record<string, string>;
  startTime: number;
}

function saveScanSession(session: ScanSession) {
  try { sessionStorage.setItem("saa-scan-session", JSON.stringify(session)); } catch { /* noop */ }
}

function loadScanSession(): ScanSession | null {
  try {
    const raw = sessionStorage.getItem("saa-scan-session");
    return raw ? JSON.parse(raw) as ScanSession : null;
  } catch { return null; }
}

function clearScanSession() {
  try { sessionStorage.removeItem("saa-scan-session"); } catch { /* noop */ }
}

function initLayerStates(layers: ScanLayer[]): Record<string, LayerState> {
  const states: Record<string, LayerState> = {};
  for (const l of layers) {
    states[l] = { status: "wachtend", scanId: null, findings: 0 };
  }
  return states;
}

export default function ScanPage() {
  const [url, setUrl] = useState("");
  const [selectedLayers, setSelectedLayers] = useState<ScanLayer[]>(["L1", "L6", "L7"]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("idle");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>({});
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const isRunning = pageStatus === "submitting" || pageStatus === "polling";

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  }, []);

  const resetScan = () => {
    stopTimers();
    clearScanSession();
    setPageStatus("idle");
    setAuditId(null);
    setLayerStates({});
    setAllFindings([]);
    setErrorMsg(null);
    setElapsedSec(0);
    setUrl("");
  };

  // Resume a scan session after page refresh
  const startPolling = useCallback((aid: string, layers: ScanLayer[], scanIds: Record<string, string>, startTime: number) => {
    setAuditId(aid);
    setPageStatus("polling");
    const initialStates: Record<string, LayerState> = {};
    for (const l of layers) {
      initialStates[l] = { status: scanIds[l] ? "bezig" : "wachtend", scanId: scanIds[l] ?? null, findings: 0 };
    }
    setLayerStates(initialStates);
    startTimeRef.current = startTime;

    elapsedRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      stopTimers();
      clearScanSession();
      setPageStatus("timeout");
    }, Math.max(180_000 - (Date.now() - startTime), 10_000));

    const activeLayers = layers.filter((l) => scanIds[l]);
    const collected: Record<string, Finding[]> = {};

    pollRef.current = setInterval(async () => {
      const newStates: Record<string, LayerState> = {};
      await Promise.all(
        activeLayers.map(async (layer) => {
          const sid = scanIds[layer];
          if (!sid) return;
          setLayerStates((prev) => {
            const cur = prev[layer];
            if (cur?.status === "voltooid" || cur?.status === "mislukt") newStates[layer] = cur;
            return prev;
          });
          if (newStates[layer]) return;
          try {
            const pollRes = await apiClient(`/api/v1/audits/${aid}/${LAYER_ENDPOINTS[layer]}/${sid}`);
            if (!pollRes.ok) return;
            const pollData = (await pollRes.json()) as { status: string; result?: { findings: Finding[] } };
            const mapped: LayerState["status"] = pollData.status === "voltooid" ? "voltooid" : pollData.status === "mislukt" ? "mislukt" : "bezig";
            newStates[layer] = { status: mapped, scanId: sid, findings: pollData.result?.findings?.length ?? 0 };
            if (mapped === "voltooid" && pollData.result?.findings) collected[layer] = pollData.result.findings;
          } catch { /* transient */ }
        }),
      );
      setLayerStates((prev) => {
        const next = { ...prev, ...newStates };
        const done = activeLayers.every((l) => next[l]?.status === "voltooid" || next[l]?.status === "mislukt");
        if (done) {
          stopTimers();
          clearScanSession();
          setAllFindings(Object.values(collected).flat());
          setPageStatus("done");
        }
        return next;
      });
    }, 3000);
  }, [stopTimers]);

  // On mount: resume existing scan session
  useEffect(() => {
    const session = loadScanSession();
    if (!session) return;
    const elapsed = Date.now() - session.startTime;
    if (elapsed > 180_000) { clearScanSession(); return; } // expired
    setUrl(session.url);
    setSelectedLayers(session.layers);
    startPolling(session.auditId, session.layers, session.scanIds, session.startTime);
  }, [startPolling]);

  const toggleLayer = (layer: ScanLayer) => {
    if (isRunning) return;
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  };

  const runScan = async () => {
    if (selectedLayers.length === 0 || !url) return;

    setPageStatus("submitting");
    setErrorMsg(null);
    setAuditId(null);
    setAllFindings([]);
    setElapsedSec(0);
    startTimeRef.current = Date.now();

    try {
      const qsRes = await apiClient("/api/v1/quick-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, layers: selectedLayers }),
      });
      if (!qsRes.ok) {
        const errData = await qsRes.json().catch(() => ({ error: qsRes.statusText }));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${qsRes.status}`);
      }
      const { auditId: aid } = (await qsRes.json()) as { auditId: string };
      setAuditId(aid);
      setLayerStates(initLayerStates(selectedLayers));

      // Start each layer scan
      const scanIds: Record<string, string> = {};
      for (const layer of selectedLayers) {
        try {
          const res = await apiClient(`/api/v1/audits/${aid}/${LAYER_ENDPOINTS[layer]}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, viewport: { name: "desktop", w: 1280, h: 1024 } }),
          });
          if (!res.ok) {
            setLayerStates((p) => ({ ...p, [layer]: { ...p[layer]!, status: "mislukt" } }));
            continue;
          }
          const { scanId } = (await res.json()) as { scanId: string };
          scanIds[layer] = scanId;
          setLayerStates((p) => ({ ...p, [layer]: { status: "bezig", scanId, findings: 0 } }));
        } catch {
          setLayerStates((p) => ({ ...p, [layer]: { ...p[layer]!, status: "mislukt" } }));
        }
      }

      const activeLayers = selectedLayers.filter((l) => scanIds[l]);
      if (activeLayers.length === 0) {
        stopTimers();
        setPageStatus("error");
        setErrorMsg("Geen enkele controle kon worden gestart. Controleer of de server bereikbaar is.");
        return;
      }

      // Persist session so page refresh can resume polling
      saveScanSession({ auditId: aid, url, layers: selectedLayers, scanIds, startTime: startTimeRef.current });

      // Start polling all layers
      startPolling(aid, selectedLayers, scanIds, startTimeRef.current);
    } catch (err) {
      stopTimers();
      setPageStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const completedCount = Object.values(layerStates).filter(
    (s) => s.status === "voltooid" || s.status === "mislukt",
  ).length;

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Scan</span>
      </div>

      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 6, color: "var(--vsc-fg-active)" }}>
          Nieuwe toegankelijkheidsscan
        </h1>
        <p style={{ color: "var(--vsc-fg-secondary)", fontSize: "0.85rem", marginBottom: 20 }}>
          Vul het adres van de website in en kies welke controles u wilt uitvoeren.
        </p>

        <div style={{ maxWidth: 640 }}>
          <div className="form-group">
            <label htmlFor="scan-url">Website-adres</label>
            <input
              id="scan-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.uwgemeente.nl"
              disabled={isRunning}
              aria-describedby="url-hint"
            />
            <span id="url-hint" style={{ fontSize: "0.75rem", color: "var(--vsc-fg-secondary)", marginTop: 4, display: "block" }}>
              Voer het volledige adres in, inclusief https://
            </span>
          </div>

          <fieldset style={{ border: "none", padding: 0, marginBottom: 16 }}>
            <legend style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4, color: "var(--vsc-fg-active)", display: "flex", alignItems: "center", gap: 8 }}>
              Controles
              <button
                type="button"
                onClick={() => { if (!isRunning) setSelectedLayers(Object.keys(LAYER_LABELS) as ScanLayer[]); }}
                disabled={isRunning}
                style={{ background: "none", border: "1px solid var(--vsc-border)", color: "var(--vsc-fg-link)", cursor: "pointer", fontSize: "0.75rem", padding: "2px 8px", borderRadius: 3 }}
              >
                Alle selecteren
              </button>
            </legend>
            <p style={{ fontSize: "0.75rem", color: "var(--vsc-fg-secondary)", marginBottom: 10 }}>
              Aanbevolen: selecteer minimaal Automatische controle, Voorleessoftware en Leesbaarheid.
            </p>
            <div className="layer-grid">
              {(Object.keys(LAYER_LABELS) as ScanLayer[]).map((layer) => (
                <label key={layer} className="layer-checkbox" title={LAYER_LABELS[layer].beschrijving}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(layer)}
                    onChange={() => toggleLayer(layer)}
                    disabled={isRunning}
                  />
                  <span>
                    <strong style={{ color: "var(--vsc-fg-active)" }}>{LAYER_LABELS[layer].naam}</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--vsc-fg-secondary)", marginTop: 2 }}>
                      {LAYER_LABELS[layer].beschrijving}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {pageStatus === "done"
            ? <button className="btn-primary" onClick={resetScan} type="button">Nieuwe scan starten</button>
            : <button className="btn-primary" onClick={runScan} disabled={isRunning || selectedLayers.length === 0 || !url} type="button">
                {pageStatus === "submitting" ? "Scan voorbereiden..."
                  : pageStatus === "polling" ? "Bezig met scannen..."
                    : `Scan starten (${selectedLayers.length} ${selectedLayers.length === 1 ? "controle" : "controles"})`}
              </button>
          }
        </div>

        {/* Progress + banners */}
        {(pageStatus === "polling" || pageStatus === "done" || pageStatus === "timeout") && Object.keys(layerStates).length > 0 && (
          <div style={{ marginTop: 24, maxWidth: 640 }}>
            <ScanProgress
              selectedLayers={selectedLayers}
              layerStates={layerStates}
              completedCount={completedCount}
              elapsedSec={elapsedSec}
              polling={pageStatus === "polling"}
            />
            {pageStatus === "done" && (
              <CompletionBanner findingCount={allFindings.length} totalCount={selectedLayers.length} auditId={auditId} />
            )}
            {pageStatus === "timeout" && <TimeoutBanner auditId={auditId} />}
          </div>
        )}

        {pageStatus === "error" && errorMsg && (
          <div className="login-error" role="alert" style={{ marginTop: 16, maxWidth: 640 }}>
            <strong>Er is iets misgegaan</strong>
            <p style={{ marginTop: 4, fontSize: "0.82rem" }}>{errorMsg}</p>
            <button type="button" onClick={resetScan} style={{ marginTop: 8, background: "none", border: "1px solid var(--vsc-error)", color: "var(--vsc-error)", cursor: "pointer", padding: "4px 12px", borderRadius: 3, fontSize: "0.8rem" }}>
              Probeer opnieuw
            </button>
          </div>
        )}

        <FindingsTable findings={allFindings} />
      </div>
    </>
  );
}
