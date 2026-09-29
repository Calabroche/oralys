"use client";

import { AccessKey, useAccess } from "@/components/team/Access";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, FileText, FlaskConical, History, Landmark, List, MonitorSmartphone, ShieldCheck, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURES, Feature, useVersion, versionOf } from "@/components/team/Version";

// Même ordre que la barre latérale de la prod ; les entrées marquées "team" sont les ajouts proposés par Oralys Team.
const GROUPS: { label: string; icon: typeof Users; href: string | null; team?: boolean; feature?: Feature; access?: AccessKey }[] = [
  { label: "Fiche du cabinet", icon: Building2, href: null },
  { label: "Équipe", icon: Users, href: null },
  { label: "Utilisateurs", icon: UserCog, href: "/team/reglages/utilisateurs", access: "utilisateurs" },
  { label: "Rôles & droits", icon: ShieldCheck, href: "/team/reglages/roles", team: true, feature: "roles", access: "utilisateurs" },
  { label: "Postes partagés", icon: MonitorSmartphone, href: "/team/reglages/postes", team: true, feature: "postes", access: "utilisateurs" },
  { label: "Journal d'audit", icon: History, href: "/team/reglages/journal", team: true, feature: "journal", access: "audit" },
  { label: "Actes", icon: List, href: null },
  { label: "Motifs de consultation", icon: CalendarDays, href: null },
  { label: "Templates de documents", icon: FileText, href: null },
  { label: "Stérilisation", icon: FlaskConical, href: null },
  { label: "Comptes bancaires", icon: Landmark, href: null },
];

export function ReglagesSidebar() {
  const pathname = usePathname();
  const { has } = useVersion();
  const allowed = useAccess();
  const item = (active: boolean) =>
    cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5", active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50");

  return (
    <aside className="w-64 shrink-0 px-4 py-8 text-sm">
      <ul className="space-y-0.5">
        {GROUPS.filter((g) => !g.access || allowed(g.access)).map((g) => (
          <li key={g.label}>
            {g.feature && !has(g.feature) ? (
              <span className={cn(item(false), "cursor-default text-slate-400 hover:bg-transparent")} title="Pas encore livré dans cette version de la démo">
                <g.icon className="size-4" /> {g.label}
                <span className="ml-auto rounded bg-slate-100 px-1 text-[0.6rem] font-medium text-slate-500">{versionOf(FEATURES[g.feature]).label}</span>
              </span>
            ) : g.href ? (
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
