"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, FileText, FlaskConical, History, Landmark, List, MonitorSmartphone, ShieldCheck, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Même ordre que la barre latérale de la prod ; les entrées marquées "team" sont les ajouts proposés par Oralys Team.
const GROUPS: { label: string; icon: typeof Users; href: string | null; team?: boolean }[] = [
  { label: "Fiche du cabinet", icon: Building2, href: null },
  { label: "Équipe", icon: Users, href: "/team/equipes" },
  { label: "Utilisateurs", icon: UserCog, href: "/team/reglages/utilisateurs" },
  { label: "Rôles & droits", icon: ShieldCheck, href: "/team/reglages/roles", team: true },
  { label: "Postes partagés", icon: MonitorSmartphone, href: "/team/reglages/postes", team: true },
  { label: "Journal d'audit", icon: History, href: "/team/reglages/journal", team: true },
  { label: "Actes", icon: List, href: null },
  { label: "Motifs de consultation", icon: CalendarDays, href: null },
  { label: "Templates de documents", icon: FileText, href: null },
  { label: "Stérilisation", icon: FlaskConical, href: null },
  { label: "Comptes bancaires", icon: Landmark, href: null },
];

export function ReglagesSidebar() {
  const pathname = usePathname();
  const item = (active: boolean) =>
    cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5", active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50");

  return (
    <aside className="w-64 shrink-0 px-4 py-8 text-sm">
      <ul className="space-y-0.5">
        {GROUPS.map((g) => (
          <li key={g.label}>
            {g.href ? (
              <Link href={g.href} className={item(pathname.startsWith(g.href))}>
                <g.icon className="size-4 text-slate-500" /> {g.label}
                {g.team && <span className="ml-auto rounded bg-pink-100 px-1 text-[0.6rem] font-medium text-pink-700">Team</span>}
              </Link>
            ) : (
              <span className={cn(item(false), "cursor-not-allowed text-slate-400 hover:bg-transparent")} title="Hors périmètre du prototype">
                <g.icon className="size-4" /> {g.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
