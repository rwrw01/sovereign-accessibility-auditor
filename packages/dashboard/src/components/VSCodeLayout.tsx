"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkAuth, logout } from "../lib/api-client";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

interface Props {
  children: ReactNode;
}

export function VSCodeLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const authDisabled = process.env["NEXT_PUBLIC_DISABLE_AUTH"] === "true";

  useEffect(() => {
    if (!authDisabled && !pathname.startsWith("/auth")) {
      checkAuth().then((ok) => { if (!ok) router.replace("/auth/login"); });
    }
  }, [pathname, router, authDisabled]);

  // Auth pages render without the application shell
  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  async function handleLogout() {
    await logout();
    router.replace("/auth/login");
  }

  return (
    <>
      {/* Skip-link: allows keyboard users to jump past navigation */}
      <a className="skip-link" href="#main-content">Ga naar inhoud</a>

      <div className="vsc-shell">
        <div className="vsc-titlebar" role="banner">
          <span className="vsc-titlebar-title">
            Sovereign Accessibility Auditor
          </span>
        </div>

        <ActivityBar currentPath={pathname} onLogout={handleLogout} />
        <Sidebar currentPath={pathname} />

        <main className="vsc-editor" id="main-content">
          {children}
        </main>

        <StatusBar />
      </div>
    </>
  );
}
