"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CalendarClock, CalendarPlus, Siren, UserCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, UserAvatar } from "@/components/team/shared";
import { PersonLink } from "@/components/team/PersonSheet";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { ROLE_GROUP_LABELS, ROLE_ORDER, primaryRoleId, absenceOn, datesBetween, displayName, isLastMinute, rdvsAtRisk, shortDate, tensionsFor, worksOn } from "@/lib/team";
import { addDays, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

export default function TeamDashboard() {
  const { users, absences, rdvs, profiles, sessionUser, now, hydrated } = useTeam();
  const [declareOpen, setDeclareOpen] = useState(false);
  const today = toISODate(now());
  const in14 = toISODate(addDays(now(), 14));
  const active = users.filter((u) => u.status === "actif");
  const working = active.filter((u) => worksOn(u, today));
  const absentToday = working.filter((u) => absenceOn(u.id, today, absences));
  const risks = rdvsAtRisk(
    rdvs.filter((r) => r.date >= today && r.date <= in14),
    absences,
    profiles
  );
  const pending = absences.filter((a) => a.status === "demandee");
  const lastMinute = absences.filter((a) => a.status !== "refusee" && isLastMinute(a) && a.endDate >= today);
  const tensions = profiles.flatMap((p) => tensionsFor(p, users, absences, datesBetween(today, in14)).map((iso) => ({ p, iso })));
  const upcoming = absences
    .filter((a) => a.status !== "refusee" && a.endDate >= today && a.startDate <= in14)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const kpis = [
    { label: "Présents aujourd'hui", value: `${working.length - absentToday.length}/${working.length}`, icon: UserCheck, href: "/team/planning" },
    { label: "RDV à risque (14 j)", value: risks.length, icon: AlertTriangle, href: "/team/remplacements", alert: risks.length > 0 },
    { label: "Demandes à valider", value: pending.length, icon: CalendarClock, href: "/team/planning?tab=demandes", alert: pending.length > 0 },
    { label: "Utilisateurs actifs", value: active.length, icon: Users, href: "/team/reglages/utilisateurs" },
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <CardTitle>À traiter en priorité</CardTitle>
            <CardDescription>Alertes remontées vers le planning Soins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastMinute.map((a) => {
              const u = users.find((x) => x.id === a.userId);
              const n = risks.filter(
                (r) => r.rdv.date >= a.startDate && r.rdv.date <= a.endDate && (r.rdv.assistantUserId === a.userId || r.rdv.praticienUserId === a.userId)
              ).length;
              const who = u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?";
              // Plus rien à réaffecter : l'absence est gérée, on l'affiche en vert au lieu d'une alerte.
              if (n === 0) {
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-emerald-900">Absence de dernier moment gérée : {who}</p>
                      <p className="text-emerald-800">
                        {shortDate(a.startDate)} → {shortDate(a.endDate)} · tous les RDV sont couverts
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/team/planning?date=${a.startDate}`}>Voir le planning</Link>
                    </Button>
                  </div>
                );
              }
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <Siren className="size-5 text-rose-600" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-rose-900">Absence de dernier moment : {who}</p>
                    <p className="text-rose-800">
                      {shortDate(a.startDate)} → {shortDate(a.endDate)} · {n} RDV à réaffecter
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/team/remplacements?absence=${a.id}`}>Trouver un remplaçant</Link>
                  </Button>
                </div>
              );
            })}
            {tensions.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="size-5 text-amber-600" />
                <div className="flex-1 text-sm text-amber-900">
                  <p className="font-medium">Tension de planning</p>
                  <p className="text-amber-800">
                    {[...new Set(tensions.map((t) => t.p.label))].join(", ")} : aucun assistant rattaché disponible le{" "}
                    {[...new Set(tensions.map((t) => shortDate(t.iso)))].join(", ")}
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/team/planning">Voir</Link>
                </Button>
              </div>
            )}
            {pending.map((a) => {
              const u = users.find((x) => x.id === a.userId);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {u && <UserAvatar user={u} />}
                  <div className="flex-1 text-sm">
                    <p className="font-medium">Demande : {u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?"}</p>
                    <p className="text-slate-500">
                      {shortDate(a.startDate)} → {shortDate(a.endDate)}
                    </p>
                  </div>
                  <AbsenceBadge absence={a} compact />
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/team/planning?tab=demandes">
                      Examiner <ArrowRight />
                    </Link>
                  </Button>
                </div>
              );
            })}
            {lastMinute.length + tensions.length + pending.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Rien à signaler.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qui est là aujourd&apos;hui</CardTitle>
            <CardAction>
              <Badge variant="secondary">{working.length - absentToday.length} présents</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROLE_ORDER.map((p) => {
              const list = working.filter((u) => primaryRoleId(u) === p);
              if (!list.length) return null;
              return (
                <div key={p}>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{ROLE_GROUP_LABELS[p]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((u) => {
                      const abs = absenceOn(u.id, today, absences);
                      const chip = (
                        <span
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs",
                            abs ? "cursor-pointer border-rose-200 bg-rose-50 text-rose-700 line-through hover:bg-rose-100" : "bg-white"
                          )}
                        >
                          <UserAvatar user={u} className="size-5 text-[0.55rem]" />
                          {u.firstName}
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

      <Card>
        <CardHeader>
          <CardTitle>Absences des 14 prochains jours</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/team/planning">
                Calendrier complet <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {upcoming.map((a) => {
              const u = users.find((x) => x.id === a.userId);
              if (!u) return null;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <UserAvatar user={u} className="size-7" />
                  <PersonLink userId={u.id} className="w-48 font-medium">
                    {displayName(u)}
                  </PersonLink>
                  <span className="w-56 text-slate-500">
                    {shortDate(a.startDate)} → {shortDate(a.endDate)}
                  </span>
                  <AbsencePopover absence={a}>
                    <button className="rounded hover:ring-1 hover:ring-slate-300">
                      <AbsenceBadge absence={a} />
                    </button>
                  </AbsencePopover>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} />
    </div>
  );
}
