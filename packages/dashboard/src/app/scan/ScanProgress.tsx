"use client";

import Link from "next/link";

export type LayerStatus = "wachtend" | "bezig" | "voltooid" | "mislukt";

export interface LayerState {
  status: LayerStatus;
  scanId: string | null;
  findings: number;
}

export type ScanLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export const LAYER_LABELS: Record<ScanLayer, { naam: string; beschrijving: string }> = {
  L1: { naam: "Automatische controle", beschrijving: "Controleert HTML-structuur, contrast, labels en alt-teksten" },
  L2: { naam: "Weergave & zoom", beschrijving: "Test of de site leesbaar blijft bij inzoomen en op kleine schermen" },
  L3: { naam: "Toetsenbord & interactie", beschrijving: "Controleert of alles bedienbaar is zonder muis" },
  L4: { naam: "Structuurvergelijking", beschrijving: "Vergelijkt de opbouw op desktop en mobiel" },
  L5: { naam: "Aanraakgebieden", beschrijving: "Controleert of knoppen en links groot genoeg zijn op mobiel" },
  L6: { naam: "Voorleessoftware", beschrijving: "Simuleert hoe een screenreader de pagina ervaart" },
  L7: { naam: "Leesbaarheid", beschrijving: "Analyseert of teksten begrijpelijk zijn geschreven" },
};

export const LAYER_ENDPOINTS: Record<ScanLayer, string> = {
  L1: "scan",
  L2: "visual-regression",
  L3: "behavioral",
  L4: "a11y-tree",
  L5: "touch-targets",
  L6: "screenreader",
  L7: "cognitive",
};

const STATUS_ICON: Record<LayerStatus, string> = {
  wachtend: "\u23F3",
  bezig: "\u{1F504}",
  voltooid: "\u2705",
  mislukt: "\u274C",
};

interface ScanProgressProps {
  selectedLayers: ScanLayer[];
  layerStates: Record<string, LayerState>;
  completedCount: number;
  elapsedSec: number;
  polling: boolean;
}

/** Per-layer status list with overall progress bar. */
export function ScanProgress({ selectedLayers, layerStates, completedCount, elapsedSec, polling }: ScanProgressProps) {
  const totalCount = selectedLayers.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Overall progress bar */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--vsc-fg-secondary)", marginBottom: 4 }}>
        <span>{completedCount} van {totalCount} controles afgerond</span>
        {polling && <span>{elapsedSec} seconden bezig</span>}
      </div>
      <div
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label="Voortgang scan"
        style={{ height: 6, background: "var(--vsc-bg-badge)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}
      >
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--vsc-success)", transition: "width 0.4s ease" }} />
      </div>

      {/* Per-layer rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {selectedLayers.map((layer) => {
          const state = layerStates[layer] ?? { status: "wachtend" as LayerStatus, scanId: null, findings: 0 };
          const badgeClass = state.status === "mislukt" ? "badge-error" : state.status === "voltooid" ? "" : "badge-notice";
          const statusText = state.status === "wachtend" ? "Wachtend"
            : state.status === "bezig" ? "Bezig"
              : state.status === "voltooid" ? "Voltooid"
                : "Mislukt";
          return (
            <div key={layer} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "var(--vsc-bg-sidebar)", border: "1px solid var(--vsc-border)", borderRadius: "var(--vsc-radius)" }}>
              <span aria-hidden="true" style={{ fontSize: "1rem", minWidth: 20, textAlign: "center" }}>{STATUS_ICON[state.status]}</span>
              <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--vsc-fg-active)" }}>{LAYER_LABELS[layer].naam}</span>
              {state.status === "voltooid" && (
                <span style={{ fontSize: "0.75rem", color: "var(--vsc-fg-secondary)" }}>
                  {state.findings} bevinding{state.findings !== 1 ? "en" : ""}
                </span>
              )}
              <span className={`badge ${badgeClass}`} style={{ fontSize: "0.7rem" }}>{statusText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CompletionBannerProps {
  findingCount: number;
  totalCount: number;
  auditId: string | null;
}

/** Green success banner shown after all layers finish. */
export function CompletionBanner({ findingCount, totalCount, auditId }: CompletionBannerProps) {
  return (
    <div role="status" aria-live="polite" style={{ padding: "14px 16px", background: "rgba(137,209,133,0.1)", border: "1px solid var(--vsc-success)", borderRadius: "var(--vsc-radius)", marginBottom: 16 }}>
      <p style={{ color: "var(--vsc-success)", fontWeight: 600, marginBottom: 6 }}>
        Scan afgerond — {findingCount} bevindingen op {totalCount} controles
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {auditId && (
          <Link href={`/audits/${auditId}`} style={{ color: "var(--vsc-fg-link)", fontSize: "0.85rem" }}>
            Bekijk volledig rapport &#8594;
          </Link>
        )}
        <Link href="/rapportage" style={{ color: "var(--vsc-fg-link)", fontSize: "0.85rem" }}>
          Download rapport
        </Link>
      </div>
    </div>
  );
}

interface TimeoutBannerProps {
  auditId: string | null;
}

/** Warning banner after 3-minute timeout. */
export function TimeoutBanner({ auditId }: TimeoutBannerProps) {
  return (
    <div role="alert" style={{ padding: "12px 16px", background: "var(--vsc-warning-bg)", border: "1px solid var(--vsc-warning)", borderRadius: "var(--vsc-radius)", marginBottom: 16 }}>
      <p style={{ color: "var(--vsc-warning)", marginBottom: 6, fontWeight: 600 }}>De scan duurt langer dan verwacht.</p>
      <p style={{ fontSize: "0.82rem", color: "var(--vsc-fg-secondary)", marginBottom: 8 }}>
        U kunt wachten of later terugkomen bij Audits om de resultaten te bekijken.
      </p>
      {auditId && (
        <Link href={`/audits/${auditId}`} style={{ color: "var(--vsc-fg-link)", fontSize: "0.85rem" }}>
          Ga naar Audits &#8594;
        </Link>
      )}
    </div>
  );
}
