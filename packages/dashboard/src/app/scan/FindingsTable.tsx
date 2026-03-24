"use client";

export interface Finding {
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

interface FindingsTableProps {
  findings: Finding[];
}

/** Summary table of all findings from all scan layers. */
export function FindingsTable({ findings }: FindingsTableProps) {
  if (findings.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }} aria-live="polite">
      <h2 style={{ fontSize: "0.95rem", marginBottom: 12, color: "var(--vsc-fg-active)" }}>
        Bevindingen ({findings.length})
      </h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col">Ernst</th>
              <th scope="col">WCAG</th>
              <th scope="col">Beschrijving</th>
              <th scope="col">Element</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={i}>
                <td>
                  <span className={`badge ${f.type === "error" ? "badge-error" : f.type === "warning" ? "badge-warning" : "badge-notice"}`}>
                    {f.type === "error" ? "Fout" : f.type === "warning" ? "Waarschuwing" : "Opmerking"}
                  </span>
                </td>
                <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                  {f.wcagCriteria.join(", ")}
                </td>
                <td style={{ fontSize: "0.82rem" }}>{f.message}</td>
                <td>
                  <code style={{ fontSize: "0.7rem", color: "var(--vsc-fg-secondary)", wordBreak: "break-all" }}>
                    {f.selector}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
