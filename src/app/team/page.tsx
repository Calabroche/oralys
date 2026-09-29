"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, ListTodo, Siren, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { useAccess } from "@/components/team/Access";
import { UserAvatar } from "@/components/team/shared";
import { PersonLink } from "@/components/team/PersonSheet";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { useToDo } from "@/components/team/planning/ToDo";
import { useVersion } from "@/components/team/Version";
import { ABSENCE_TYPE_LABELS, ROLE_GROUP_LABELS, ROLE_ORDER, absenceOn, primaryRoleId, worksOn } from "@/lib/team";
import { toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Tableau de bord du gestionnaire : un résumé de la journée. Le détail (et les actions) est dans le planning,
 * pour ne pas avoir la même information à deux endroits. Les autres profils arrivent directement sur le planning.
 */
export default function TeamDashboard() {
  const allowed = useAccess();
  const router = useRouter();
  const ok = allowed("tableau");
  useEffect(() => {
    if (!ok) router.replace("/team/planning");
  }, [ok, router]);
  return ok ? <Dashboard /> : null;
}

function Dashboard() {
  const { users, absences, sessionUser, now, hydrated } = useTeam();
  const { has } = useVersion();
  const [declareOpen, setDeclareOpen] = useState(false);
  const todo = useToDo();
  const today = toISODate(now());
  const active = users.filter((u) => u.status === "actif");
  const working = active.filter((u) => worksOn(u, today));
  const absentToday = working.filter((u) => absenceOn(u.id, today, absences));
  // Présents sur l'ensemble des collaborateurs actifs : ceux au repos ou absents comptent dans le total.
  const presentCount = working.length - absentToday.length;
  const openLastMinute = todo.lastMinute.filter((x) => x.open > 0).length;

  const kpis = [
    { label: "Présents aujourd'hui", value: `${presentCount}/${active.length}`, icon: UserCheck, href: "/team/planning" },
    { label: "À traiter", value: todo.count, icon: ListTodo, href: "/team/planning?tab=a-traiter", alert: todo.count > 0 },
    { label: "Utilisateurs actifs", value: active.length, icon: Users, href: "/team/reglages/utilisateurs" },
  ];

  // Une ligne par catégorie : le compte et un lien vers l'onglet du planning qui permet d'agir.
  const summary = [
    { label: "Absences de dernier moment", value: openLastMinute, icon: Siren, href: "/team/planning?tab=a-traiter", tone: "text-rose-600" },
    { label: "Demandes à valider", value: todo.pending.length, icon: CalendarClock, href: "/team/planning?tab=a-traiter", tone: "text-pink-600" },
    { label: "Manques d'assistant (14 j)", value: todo.gaps.length + todo.coverage.length, icon: UserX, href: "/team/planning?tab=a-traiter", tone: "text-amber-600" },
    ...(has("remplacements")
      ? [{ label: "RDV patients à réaffecter", value: todo.toReassign.length, icon: CalendarClock, href: "/team/planning?tab=remplacer", tone: "text-slate-700" }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 capitalize">{now().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour {hydrated ? sessionUser?.firstName : ""}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeclareOpen(true)}>
            <CalendarPlus /> Déclarer une absence
          </Button>
          <Button asChild>
            <Link href="/team/reglages/utilisateurs">
              <UserPlus /> Gérer les utilisateurs
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{k.label}</p>
                  <p className={cn("mt-1 text-3xl font-semibold", k.alert && "text-pink-600")}>{k.value}</p>
                </div>
                <k.icon className={cn("size-6", k.alert ? "text-pink-500" : "text-slate-300")} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>À traiter</CardTitle>
            <CardDescription>Le détail et les actions sont dans le planning, onglet « À traiter ».</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" asChild>
                <Link href="/team/planning?tab=a-traiter">
                  Ouvrir <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {todo.count === 0 && todo.toReassign.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> Rien à traiter sur les 14 prochains jours.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="flex items-center gap-3 py-2.5 text-sm hover:text-pink-700">
                      <s.icon className={cn("size-4", s.value > 0 ? s.tone : "text-slate-300")} />
                      <span className={cn("flex-1", s.value === 0 && "text-slate-400")}>{s.label}</span>
                      <span className={cn("font-semibold", s.value > 0 ? "text-slate-900" : "text-slate-300")}>{s.value}</span>
                      <ArrowRight className="size-3.5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qui est là aujourd&apos;hui</CardTitle>
            <CardAction>
              <Badge variant="secondary">
                {presentCount}/{active.length} présents
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROLE_ORDER.map((p) => {
              // Tout le monde, présents d'abord ; les personnes au repos ou absentes restent visibles, barrées, avec la raison.
              const list = active
                .filter((u) => primaryRoleId(u) === p)
                .sort((a, b) => Number(!worksOn(a, today) || Boolean(absenceOn(a.id, today, absences))) - Number(!worksOn(b, today) || Boolean(absenceOn(b.id, today, absences))));
              if (!list.length) return null;
              return (
                <div key={p}>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{ROLE_GROUP_LABELS[p]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((u) => {
                      const abs = absenceOn(u.id, today, absences);
                      const off = !abs && !worksOn(u, today);
                      const chip = (
                        <span
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs",
                            abs ? "cursor-pointer border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : off ? "border-slate-200 bg-slate-50 text-slate-400" : "bg-white"
                          )}
                        >
                          <UserAvatar user={u} className={cn("size-5 text-[0.55rem]", off && "opacity-50")} />
                          <span className={cn((abs || off) && "line-through")}>{u.firstName}</span>
                          {abs && <span className="text-[0.65rem] font-medium">{ABSENCE_TYPE_LABELS[abs.type].toLowerCase()}</span>}
                          {off && <span className="text-[0.65rem]">repos</span>}
                        </span>
                      );
                      return abs ? (
                        <AbsencePopover key={u.id} absence={abs} date={today}>
                          <button title="Absent(e) aujourd'hui. Cliquer pour annuler l'absence.">{chip}</button>
                        </AbsencePopover>
                      ) : (
                        <PersonLink key={u.id} userId={u.id} className="no-underline hover:no-underline">
                          {chip}
                        </PersonLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} />
    </div>
  );
}
