"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, ListTodo, Siren, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { useAccess } from "@/components/team/Access";
import { Trombinoscope } from "@/components/team/Trombinoscope";
import { ASSIDUITE_NB } from "@/lib/assiduite";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { useToDo } from "@/components/team/planning/ToDo";
import { useVersion } from "@/components/team/Version";
import { absenceOn, isHealthProfessional, worksOn } from "@/lib/team";
import { toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Tableau de bord : un résumé de la journée et le trombinoscope de l'équipe (qui est là aujourd'hui).
 * Gestionnaires et praticiens y voient aussi les compteurs et ce qui est à traiter ; les autres profils
 * (assistants, aides, secrétaires…) n'y voient que l'équipe. Le détail et les actions restent dans le planning.
 */
export default function TeamDashboard() {
  const { users, absences, sessionUser, now, hydrated, can, roles } = useTeam();
  const full = useAccess()("tableau");
  const isManager = can("param.cabinet");
  const sensitive = isManager || can("compta") || (!!sessionUser && isHealthProfessional(sessionUser, roles));
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

  // MVP : présents, absences de dernier moment, utilisateurs actifs. V1 : « À traiter » (manques, RDV à réaffecter).
  const pilotage = has("pilotage");
  const kpis = [
    { label: "Présents aujourd'hui", value: `${presentCount}/${active.length}`, icon: UserCheck, href: "/team/planning" },
    pilotage
      ? { label: "À traiter", value: todo.count, icon: ListTodo, href: "/team/planning?tab=demandes", alert: todo.count > 0 }
      : { label: "Absences de dernier moment", value: openLastMinute, icon: Siren, href: "/team/planning?tab=demandes", alert: openLastMinute > 0 },
    ...(isManager ? [{ label: "Utilisateurs actifs", value: active.length, icon: Users, href: "/team/reglages/utilisateurs" }] : []),
  ];

  // Une ligne par catégorie : le compte et un lien vers l'onglet du planning qui permet d'agir.
  const summary = [
    { label: "Absences de dernier moment", value: openLastMinute, icon: Siren, href: "/team/planning?tab=demandes", tone: "text-rose-600" },
    { label: "Demandes à valider", value: todo.pending.length, icon: CalendarClock, href: "/team/planning?tab=demandes", tone: "text-pink-600" },
    { label: "Manques d'assistant (14 j)", value: todo.gaps.length + todo.coverage.length, icon: UserX, href: "/team/planning?tab=manques", tone: "text-amber-600" },
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
          {isManager && (
            <Button asChild>
              <Link href="/team/reglages/utilisateurs">
                <UserPlus /> Gérer les utilisateurs
              </Link>
            </Button>
          )}
        </div>
      </div>

      {full && (
      <>
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

        {pilotage && (
        <Card>
          <CardHeader>
            <CardTitle>À traiter</CardTitle>
            <CardDescription>Le détail et les actions sont dans le planning, onglets « Demandes à valider » et « Manques à couvrir ».</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" asChild>
                <Link href="/team/planning?tab=demandes">
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
        )}
      </>
      )}

      {/* Le trombinoscope remplace l'ancien « Qui est là » : tout le monde le voit, un clic ouvre le récapitulatif de la personne. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">L&apos;équipe aujourd&apos;hui</h2>
          <Badge variant="secondary">
            {presentCount}/{active.length} présents
          </Badge>
        </div>
        <Trombinoscope />
        {sensitive && (
          <p className="text-[11px] text-slate-400">
            {has("missionsSuivies") && "Pastille sur la photo : la part des missions faites sur les 8 dernières semaines, du vert (toujours faites) au rouge (souvent oubliées). "}
            NB : {ASSIDUITE_NB}
          </p>
        )}
      </section>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} />
    </div>
  );
}
