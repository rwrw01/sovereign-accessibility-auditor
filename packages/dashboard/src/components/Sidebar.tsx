"use client";

import { useState } from "react";
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

interface CollapsibleSectionProps {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, badge, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginTop: 8 }}>
      <button
        className="vsc-tree-item"
        style={{ fontWeight: 600, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="vsc-tree-chevron" aria-hidden="true">
          <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </span>
        <span className="vsc-tree-label">{title}</span>
        {badge && <span className="vsc-tree-badge">{badge}</span>}
      </button>
      {open && children}
    </div>
  );
}

export function Sidebar({ currentPath }: Props) {
  return (
    <aside className="vsc-sidebar" aria-label="Zijbalk">
      <div className="vsc-sidebar-header">Verkenner</div>
      <nav className="vsc-sidebar-content" aria-label="Navigatie">
        <CollapsibleSection title="Acties">
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
        </CollapsibleSection>

        <CollapsibleSection title="Scanlagen" badge="7">
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
        </CollapsibleSection>

        <CollapsibleSection title="Status">
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
        </CollapsibleSection>
      </nav>
    </aside>
  );
}
