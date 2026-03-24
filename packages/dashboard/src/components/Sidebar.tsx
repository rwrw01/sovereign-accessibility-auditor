"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Play,
  Search,
  FileText,
  Settings,
  HelpCircle,
} from "lucide-react";

interface Props {
  currentPath: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Scan starten", path: "/scan", icon: Play },
  { label: "Audits", path: "/audits", icon: Search },
  { label: "Rapportage", path: "/rapportage", icon: FileText },
  { label: "Instellingen", path: "/instellingen", icon: Settings },
  { label: "Help", path: "/help", icon: HelpCircle },
];

export function Sidebar({ currentPath }: Props) {
  return (
    <aside className="vsc-sidebar" aria-label="Zijbalk">
      <div className="vsc-sidebar-header">Menu</div>

      <nav className="vsc-sidebar-content" aria-label="Navigatie">
        {/* Section: Navigatie */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Navigatie</div>
          <ul role="list" style={{ listStyle: "none" }}>
            {NAV_ITEMS.map((item) => (
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

        {/* Section: Informatie — static version info, no fake live status */}
        <div className="sidebar-section sidebar-section--info">
          <div className="sidebar-section-title">Informatie</div>
          <p className="sidebar-info-line">SAA v0.1.0</p>
          <p className="sidebar-info-line">WCAG 2.2 AA</p>
        </div>
      </nav>
    </aside>
  );
}
