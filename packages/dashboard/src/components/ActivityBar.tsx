"use client";

import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Play,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

interface Props {
  currentPath: string;
  onLogout: () => void;
}

const ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/scan", icon: Play, label: "Nieuwe scan" },
  { path: "/audits", icon: Search, label: "Audits" },
  { path: "/rapportage", icon: FileText, label: "Rapportage" },
  { path: "/instellingen", icon: Settings, label: "Instellingen" },
  { path: "/help", icon: HelpCircle, label: "Help" },
];

export function ActivityBar({ currentPath, onLogout }: Props) {
  const router = useRouter();

  return (
    <nav className="vsc-activitybar" aria-label="Hoofdnavigatie">
      <div className="vsc-activitybar-top">
        {ITEMS.map((item) => (
          <button
            key={item.path}
            className="vsc-activity-btn"
            aria-current={currentPath === item.path ? "true" : undefined}
            aria-label={item.label}
            title={item.label}
            onClick={() => router.push(item.path)}
          >
            <item.icon size={22} />
          </button>
        ))}
      </div>
      <div className="vsc-activitybar-bottom">
        <button
          className="vsc-activity-btn"
          aria-label="Uitloggen"
          title="Uitloggen"
          onClick={onLogout}
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
