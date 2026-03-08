import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Rapportage" };

export default function RapportageLayout({ children }: { children: ReactNode }) {
  return children;
}
