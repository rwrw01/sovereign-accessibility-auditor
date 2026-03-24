"use client";

import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { apiClient } from "../../lib/api-client";

interface Audit { id: string; naam: string; doelUrls: string[] | string; status: string; aangemaaktOp: string; }
interface Narrative { watFout: string; impactBlind: string; impactDoof: string; oplossing: string; }
interface AggregatedFinding {
  key: string; wcagCriteria: string; wcagLevel: string; type: string; impact: string;
  count: number; pagesAffected: number; representativeSelector: string;
  representativeMessage: string; narrative: Narrative;
}
interface ScorePage { naam: string; url: string; errors: number; warnings: number; }
interface ReportJson {
  input: { organisatie: string; websiteUrl: string; datum: string; standaard: string; tool: string; pages: string[] };
  siteWideFindings: AggregatedFinding[]; pageSpecificFindings: AggregatedFinding[];
  totalErrors: number; totalWarnings: number; totalNotices: number;
  templateErrors: number; pageErrors: number; scorePerPage: ScorePage[];
}

const IMPACT_CLASS: Record<string, string> = { critical: "badge-critical", serious: "badge-serious", moderate: "badge-moderate", minor: "badge-minor" };
const CARD = { background: "var(--vsc-bg-sidebar)", border: "1px solid var(--vsc-border)", borderRadius: "var(--vsc-radius)" } as const;
const FG_SEC = { color: "var(--vsc-fg-secondary)" } as const;
const FG_ACT = { color: "var(--vsc-fg-active)" } as const;
const H2 = { fontSize: "0.9rem", ...FG_ACT, marginBottom: 10 } as const;

function parseUrls(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}
function typeBadge(t: string) { return t === "error" ? "badge-error" : t === "warning" ? "badge-warning" : "badge-notice"; }

function FindingSection({ f }: { f: AggregatedFinding }) {
  return (
    <details style={{ marginBottom: 8, ...CARD }}>
      <summary style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, listStyle: "none", fontSize: "0.85rem" }}>
        <span className={`badge ${IMPACT_CLASS[f.impact.toLowerCase()] ?? "badge-notice"}`}>{f.impact}</span>
        <span style={{ ...FG_ACT, flex: 1 }}>{f.wcagCriteria}</span>
        <span style={{ ...FG_SEC, fontSize: "0.75rem" }}>{f.count}× | {f.pagesAffected} pag.</span>
        <span className={`badge ${typeBadge(f.type)}`}>{f.wcagLevel}</span>
      </summary>
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--vsc-border)", fontSize: "0.82rem", lineHeight: 1.6 }}>
        {f.representativeSelector && (
          <p style={{ ...FG_SEC, marginBottom: 6 }}>
            <strong style={FG_ACT}>Element:</strong>{" "}
            <code style={{ fontFamily: "var(--vsc-font-mono)", fontSize: "0.78rem" }}>{f.representativeSelector}</code>
          </p>
        )}
        <p style={{ ...FG_SEC, marginBottom: 10 }}><strong style={FG_ACT}>Melding:</strong> {f.representativeMessage}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 12px" }}>
          <dt style={{ ...FG_SEC, fontWeight: 600 }}>Wat is fout:</dt><dd style={FG_ACT}>{f.narrative.watFout}</dd>
          <dt style={{ ...FG_SEC, fontWeight: 600 }}>Impact bij visuele beperking:</dt><dd style={FG_ACT}>{f.narrative.impactBlind}</dd>
          <dt style={{ ...FG_SEC, fontWeight: 600 }}>Impact bij gehoorbeperking:</dt><dd style={FG_ACT}>{f.narrative.impactDoof}</dd>
          <dt style={{ ...FG_SEC, fontWeight: 600 }}>Oplossing:</dt><dd style={FG_ACT}>{f.narrative.oplossing}</dd>
        </dl>
      </div>
    </details>
  );
}

export default function RapportagePage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [organisatie, setOrganisatie] = useState("");
  const [report, setReport] = useState<ReportJson | null>(null);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient("/api/v1/audits")
      .then(async (res) => {
        if (!res.ok) { setError("Kon audits niet laden"); return; }
        const data = (await res.json()) as Audit[];
        const done = data.filter((a) => a.status === "voltooid" || a.status === "actief");
        setAudits(done);
        if (done.length > 0 && done[0]) setSelectedId(done[0].id);
      })
      .catch(() => setError("Kon audits niet laden"))
      .finally(() => setLoadingAudits(false));
  }, []);

  const loadReport = useCallback((id: string) => {
    if (!id) { setReport(null); return; }
    setLoadingReport(true);
    setError("");
    apiClient(`/api/v1/audits/${id}/report/json`)
      .then(async (res) => {
        if (!res.ok) { setError("Kon rapportdata niet ophalen"); return; }
        setReport((await res.json()) as ReportJson);
      })
      .catch(() => setError("Fout bij ophalen van rapportdata"))
      .finally(() => setLoadingReport(false));
  }, []);

  useEffect(() => { loadReport(selectedId); }, [selectedId, loadReport]);

  async function handleDownload() {
    if (!selectedId) return;
    setDownloading(true);
    setError("");
    try {
      const qs = organisatie ? `?organisatie=${encodeURIComponent(organisatie)}` : "";
      const res = await apiClient(`/api/v1/audits/${selectedId}/report${qs}`);
      if (!res.ok) { setError("Download mislukt — controleer of de audit voltooid is"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const audit = audits.find((x) => x.id === selectedId);
      const urls = audit ? parseUrls(audit.doelUrls) : [];
      const slug = urls.length > 0 && urls[0] ? getHostname(urls[0]).replace(/\./g, "-") : (audit?.naam ?? "rapport").toLowerCase().replace(/\s+/g, "-");
      a.download = `saa-${slug}-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Fout bij downloaden van rapport"); }
    finally { setDownloading(false); }
  }

  const sitePct = report && report.totalErrors > 0 ? Math.round((report.templateErrors / report.totalErrors) * 100) : 0;

  return (
    <>
      <div className="vsc-tabbar">
        <span className="vsc-tab" aria-current="true">Rapportage</span>
      </div>
      <div className="vsc-editor-content">
        <h1 style={{ fontSize: "1.1rem", marginBottom: 16, ...FG_ACT }}>Rapport genereren</h1>

        {error && <div className="login-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ maxWidth: 560 }}>
          <div className="form-group">
            <label htmlFor="audit-select">Audit selecteren</label>
            {loadingAudits ? (
              <p style={FG_SEC} role="status">Audits laden…</p>
            ) : audits.length === 0 ? (
              <p style={FG_SEC}>Geen voltooide audits gevonden.</p>
            ) : (
              <select id="audit-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {audits.map((a) => {
                  const urls = parseUrls(a.doelUrls);
                  const host = urls.length > 0 && urls[0] ? getHostname(urls[0]) : a.naam;
                  return (
                    <option key={a.id} value={a.id}>
                      {host} — {new Date(a.aangemaaktOp).toLocaleDateString("nl-NL")}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="org-input">Organisatienaam (optioneel)</label>
            <input id="org-input" type="text" placeholder="bijv. Gemeente Amsterdam" value={organisatie} onChange={(e) => setOrganisatie(e.target.value)} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <button className="btn-primary" type="button" onClick={handleDownload} disabled={!selectedId || downloading} aria-busy={downloading} style={{ width: "auto" }}>
              <Download size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "middle" }} />
              {downloading ? "Bezig met downloaden…" : "Download DOCX rapport"}
            </button>
          </div>
        </div>

        {loadingReport && <p style={FG_SEC} role="status">Rapportdata laden…</p>}

        {report && !loadingReport && (
          <div style={{ maxWidth: 860 }}>
            <section aria-labelledby="kb-head" style={{ marginBottom: 24, padding: 14, ...CARD }}>
              <h2 id="kb-head" style={{ fontSize: "0.9rem", ...FG_ACT, marginBottom: 8 }}>Kernboodschap</h2>
              <p style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
                <strong>{report.totalErrors}</strong> fouten op <strong>{report.input.pages.length}</strong> pagina&apos;s.{" "}
                <strong>{report.templateErrors}</strong> ({sitePct}%) zijn site-breed.{" "}
                Daarnaast <strong>{report.totalWarnings}</strong> waarschuwingen en <strong>{report.totalNotices}</strong> meldingen.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span className="badge badge-error">{report.totalErrors} fouten</span>
                <span className="badge badge-warning">{report.totalWarnings} waarschuwingen</span>
                <span className="badge badge-notice">{report.totalNotices} meldingen</span>
              </div>
            </section>

            <section aria-labelledby="score-head" style={{ marginBottom: 24 }}>
              <h2 id="score-head" style={H2}>Score per pagina</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pagina</th>
                      <th scope="col">URL</th>
                      <th scope="col">Fouten</th>
                      <th scope="col">Waarschuwingen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.scorePerPage.map((p) => (
                      <tr key={p.url}>
                        <td style={{ fontWeight: 500 }}>{p.naam}</td>
                        <td style={{ fontSize: "0.78rem", ...FG_SEC, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url}</td>
                        <td>{p.errors > 0 ? <span className="badge badge-error">{p.errors}</span> : <span style={FG_SEC}>0</span>}</td>
                        <td>{p.warnings > 0 ? <span className="badge badge-warning">{p.warnings}</span> : <span style={FG_SEC}>0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {report.siteWideFindings.length > 0 && (
              <section aria-labelledby="sw-head" style={{ marginBottom: 24 }}>
                <h2 id="sw-head" style={H2}>Site-brede bevindingen ({report.siteWideFindings.length})</h2>
                {report.siteWideFindings.map((f) => <FindingSection key={f.key} f={f} />)}
              </section>
            )}

            {report.pageSpecificFindings.length > 0 && (
              <section aria-labelledby="ps-head" style={{ marginBottom: 24 }}>
                <h2 id="ps-head" style={H2}>Pagina-specifieke bevindingen ({report.pageSpecificFindings.length})</h2>
                {report.pageSpecificFindings.map((f) => <FindingSection key={f.key} f={f} />)}
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
