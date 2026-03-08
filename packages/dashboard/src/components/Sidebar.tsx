"use client";

import Link from "next/link";
import {
  ChevronRight,
  Globe,
  FileSearch,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Props {
  currentPath: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof Globe;
}

const SCAN_LAYERS: NavItem[] = [
  { label: "L1 — Multi-engine", path: "/scan?layer=L1", icon: FileSearch },
  { label: "L2 — Visuele regressie", path: "/scan?layer=L2", icon: FileSearch },
  { label: "L3 — Gedragstests", path: "/scan?layer=L3", icon: FileSearch },
  { label: "L4 — A11y tree diff", path: "/scan?layer=L4", icon: FileSearch },
  { label: "L5 — Touch targets", path: "/scan?layer=L5", icon: FileSearch },
  { label: "L6 — Screenreader", path: "/scan?layer=L6", icon: FileSearch },
  { label: "L7 — Cognitief", path: "/scan?layer=L7", icon: FileSearch },
];

const QUICK_ACTIONS: NavItem[] = [
  { label: "Nieuwe scan starten", path: "/scan", icon: Globe },
  { label: "Rapport genereren", path: "/rapportage", icon: FileSearch },
];

export function Sidebar({ currentPath }: Props) {
  return (
    <aside className="vsc-sidebar" aria-label="Zijbalk">
      <div className="vsc-sidebar-header">Verkenner</div>
      <nav className="vsc-sidebar-content" aria-label="Navigatie">
        {/* Quick Actions */}
        <div>
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron" aria-hidden="true">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Acties</span>
          </div>
          <ul role="list" style={{ listStyle: "none", paddingLeft: 8 }}>
            {QUICK_ACTIONS.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className="vsc-tree-item"
                  aria-current={currentPath === item.path ? "page" : undefined}
                >
                  <span className="vsc-tree-icon" aria-hidden="true">
                    <item.icon size={14} />
                  </span>
                  <span className="vsc-tree-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Scan Layers */}
        <div style={{ marginTop: 8 }}>
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron" aria-hidden="true">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Scanlagen</span>
            <span className="vsc-tree-badge">7</span>
          </div>
          <ul role="list" style={{ listStyle: "none", paddingLeft: 8 }}>
            {SCAN_LAYERS.map((layer) => (
              <li key={layer.path}>
                <Link
                  href={layer.path}
                  className="vsc-tree-item"
                  aria-current={currentPath === layer.path ? "page" : undefined}
                >
                  <span className="vsc-tree-icon" aria-hidden="true">
                    <layer.icon size={14} />
                  </span>
                  <span className="vsc-tree-label">{layer.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Status */}
        <div style={{ marginTop: 8 }}>
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron" aria-hidden="true">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Status</span>
          </div>
          <ul role="list" style={{ listStyle: "none", paddingLeft: 8 }}>
            <li className="vsc-tree-item" aria-label="API status: verbonden">
              <span className="vsc-tree-icon" aria-hidden="true">
                <CheckCircle size={14} color="var(--vsc-success)" />
              </span>
              <span className="vsc-tree-label">API verbonden</span>
            </li>
            <li className="vsc-tree-item" aria-label="Scan status: geen actieve scans">
              <span className="vsc-tree-icon" aria-hidden="true">
                <AlertTriangle size={14} color="var(--vsc-warning)" />
              </span>
              <span className="vsc-tree-label">Geen actieve scans</span>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
