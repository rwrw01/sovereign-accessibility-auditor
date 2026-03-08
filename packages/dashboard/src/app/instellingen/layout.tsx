import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Instellingen" };

export default function InstellingenLayout({ children }: { children: ReactNode }) {
  return children;
}
