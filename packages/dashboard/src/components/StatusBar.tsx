"use client";

import { Shield, GitBranch } from "lucide-react";

export function StatusBar() {
  return (
    <footer className="vsc-statusbar" aria-label="Statusbalk">
      <div className="vsc-statusbar-left">
        <span className="vsc-statusbar-item">
          <Shield size={12} aria-hidden="true" />
          WCAG 2.2 AA
        </span>
        <span className="vsc-statusbar-item">
          <GitBranch size={12} aria-hidden="true" />
          v0.1.0
        </span>
      </div>
      <div className="vsc-statusbar-right">
        <span className="vsc-statusbar-item">7 scanlagen</span>
        <span className="vsc-statusbar-item">SAA</span>
      </div>
    </footer>
  );
}
