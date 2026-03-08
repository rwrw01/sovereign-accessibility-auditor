"use client";

import { useRouter } from "next/navigation";
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

interface TreeItem {
  label: string;
  path: string;
  icon: typeof Globe;
  badge?: string;
}

const SCAN_LAYERS: TreeItem[] = [
  { label: "L1 — Multi-engine", path: "/scan?layer=L1", icon: FileSearch },
  { label: "L2 — Visuele regressie", path: "/scan?layer=L2", icon: FileSearch },
  { label: "L3 — Gedragstests", path: "/scan?layer=L3", icon: FileSearch },
  { label: "L4 — A11y tree diff", path: "/scan?layer=L4", icon: FileSearch },
  { label: "L5 — Touch targets", path: "/scan?layer=L5", icon: FileSearch },
  { label: "L6 — Screenreader", path: "/scan?layer=L6", icon: FileSearch },
  { label: "L7 — Cognitief", path: "/scan?layer=L7", icon: FileSearch },
];

const QUICK_ACTIONS: TreeItem[] = [
  { label: "Nieuwe scan starten", path: "/scan", icon: Globe },
  { label: "Rapport genereren", path: "/rapportage", icon: FileSearch },
];

export function Sidebar({ currentPath }: Props) {
  const router = useRouter();

  return (
    <aside className="vsc-sidebar" aria-label="Zijbalk">
      <div className="vsc-sidebar-header">Verkenner</div>
      <div className="vsc-sidebar-content" role="tree" aria-label="Navigatie">
        {/* Quick Actions */}
        <div role="treeitem" aria-expanded="true">
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Acties</span>
          </div>
          <div role="group" style={{ paddingLeft: 8 }}>
            {QUICK_ACTIONS.map((item) => (
              <div
                key={item.path}
                className="vsc-tree-item"
                role="treeitem"
                aria-selected={currentPath === item.path}
                onClick={() => router.push(item.path)}
                onKeyDown={(e) => e.key === "Enter" && router.push(item.path)}
                tabIndex={0}
              >
                <span className="vsc-tree-icon">
                  <item.icon size={14} />
                </span>
                <span className="vsc-tree-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Layers */}
        <div role="treeitem" aria-expanded="true" style={{ marginTop: 8 }}>
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Scanlagen</span>
            <span className="vsc-tree-badge">7</span>
          </div>
          <div role="group" style={{ paddingLeft: 8 }}>
            {SCAN_LAYERS.map((layer) => (
              <div
                key={layer.path}
                className="vsc-tree-item"
                role="treeitem"
                onClick={() => router.push(layer.path)}
                onKeyDown={(e) => e.key === "Enter" && router.push(layer.path)}
                tabIndex={0}
              >
                <span className="vsc-tree-icon">
                  <layer.icon size={14} />
                </span>
                <span className="vsc-tree-label">{layer.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div role="treeitem" aria-expanded="true" style={{ marginTop: 8 }}>
          <div className="vsc-tree-item" style={{ fontWeight: 600 }}>
            <span className="vsc-tree-chevron">
              <ChevronRight size={12} style={{ transform: "rotate(90deg)" }} />
            </span>
            <span className="vsc-tree-label">Status</span>
          </div>
          <div role="group" style={{ paddingLeft: 8 }}>
            <div className="vsc-tree-item" role="treeitem" tabIndex={0}>
              <span className="vsc-tree-icon">
                <CheckCircle size={14} color="var(--vsc-success)" />
              </span>
              <span className="vsc-tree-label">API verbonden</span>
            </div>
            <div className="vsc-tree-item" role="treeitem" tabIndex={0}>
              <span className="vsc-tree-icon">
                <AlertTriangle size={14} color="var(--vsc-warning)" />
              </span>
              <span className="vsc-tree-label">Geen actieve scans</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
