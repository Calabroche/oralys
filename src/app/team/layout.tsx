import type { Metadata } from "next";
import { TeamShell } from "@/components/team/TeamShell";

export const metadata: Metadata = {
  title: "Oralys Team",
  description: "Équipe, rôles & droits, planning et remplacements du cabinet",
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <TeamShell>{children}</TeamShell>;
}
