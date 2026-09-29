"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Siren, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, Gate, UserAvatar } from "@/components/team/shared";
import { PersonLink } from "@/components/team/PersonSheet";
import { useVersion } from "@/components/team/Version";
import { formatMinutes } from "@/lib/time";
import { HALF_DAY_LABELS, PraticienDay, ROLE_MIN_COVERAGE, agendaLoad, datesBetween, dayStaffing, displayName, isAvailable, isLastMinute, rdvsAtRisk, shortDate, tensionsFor } from "@/lib/team";
import { activityName } from "@/lib/semaine";
import { TeamAbsence } from "@/types/team";
import { addDays, fromISODate, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/** Horizon de ce qui est « à traiter » : les 14 prochains jours. */
const HORIZON = 14;

/** Tout ce qui demande une action sur les absences, calculé une fois pour le planning et le tableau de bord. */
export function useToDo() {
  const { absences, rdvs, profiles, users, dayOverrides, dayNeeds, now } = useTeam();
  const today = toISODate(now());
  const until = toISODate(addDays(now(), HORIZON));
  return useMemo(() => {
    // Tous les RDV à venir, comme l'onglet « À remplacer » (le compteur doit dire la même chose).
    const risks = rdvsAtRisk(
      rdvs.filter((r) => r.date >= today),
      absences,
      profiles
    );
    const toReassign = risks.filter((r) => r.reason !== "praticien").map((r) => r.rdv);
    const pending = absences.filter((a) => a.status === "demandee");
    const lastMinute = absences
      .filter((a) => a.status !== "refusee" && isLastMinute(a) && a.endDate >= today)
      .map((absence) => ({
        absence,
        open: toReassign.filter((r) => r.date >= absence.startDate && r.date <= absence.endDate && r.assistantUserId === absence.userId).length,
      }));
    const dates = datesBetween(today, until).filter((iso) => fromISODate(iso).getDay() !== 0);
    const gaps = dates.flatMap((iso) =>
      dayStaffing(iso, profiles, users, absences, dayOverrides, dayNeeds)
        .praticiens.filter((p) => p.missing > 0)
        .map((day) => ({ iso, day }))
    );
    const active = users.filter((u) => u.status === "actif");
    const coverage = Object.entries(ROLE_MIN_COVERAGE).flatMap(([roleId, rule]) =>
      dates
        .filter((iso) => fromISODate(iso).getDay() !== 6)
        .filter((iso) => active.filter((u) => u.roleIds.includes(roleId) && isAvailable(u, iso, absences)).length < rule.min)
        .map((iso) => ({ label: rule.label, iso }))
    );
    const count = pending.length + lastMinute.filter((x) => x.open > 0).length + gaps.length + coverage.length;
    return { pending, lastMinute, gaps, coverage, toReassign, count };
  }, [absences, rdvs, profiles, users, dayOverrides, dayNeeds, today, until]);
}

function halvesLabel(day: PraticienDay) {
  if (day.missingHalves.length !== 1 || day.halves.length !== 2) return "";
  const h = day.byHalf.find((x) => x.half === day.missingHalves[0])!;
  return ` · ${HALF_DAY_LABELS[h.half]}${h.activities.length ? ` (${h.activities.map(activityName).join(", ").toLowerCase()})` : ""}`;
}

/** Onglet « À traiter » du planning : une seule liste pour tout ce qui attend une décision. */
export function ToDoPanel({ onShowDay, onReplace }: { onShowDay: (iso: string) => void; onReplace: (absenceId?: string) => void }) {
  const { findUser } = useTeam();
  const { has } = useVersion();
  const todo = useToDo();
  const openLastMinute = todo.lastMinute.filter((x) => x.open > 0);
  const handledLastMinute = todo.lastMinute.filter((x) => x.open === 0);

  if (todo.count === 0 && todo.toReassign.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="font-medium text-slate-900">Rien à traiter</p>
        <p className="text-sm text-slate-500">Pas de demande en attente ni de manque sur les {HORIZON} prochains jours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(openLastMinute.length > 0 || handledLastMinute.length > 0) && (
        <Section title="Absences de dernier moment" count={openLastMinute.length}>
          {openLastMinute.map(({ absence: a, open }) => {
            const u = findUser(a.userId);
            return (
              <Row key={a.id} tone="rose" icon={<Siren className="size-5 text-rose-600" />}>
                <p className="font-medium text-rose-900">{u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?"}</p>
                <p className="text-rose-800">
                  {shortDate(a.startDate)} → {shortDate(a.endDate)} · {open} RDV à réaffecter
                </p>
                <Button size="sm" onClick={() => onReplace(a.id)} className="ml-auto">
                  Trouver un remplaçant
                </Button>
              </Row>
            );
          })}
          {handledLastMinute.map(({ absence: a }) => {
            const u = findUser(a.userId);
            return (
              <Row key={a.id} tone="emerald" icon={<CheckCircle2 className="size-5 text-emerald-600" />}>
                <p className="font-medium text-emerald-900">Gérée : {u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?"}</p>
                <p className="text-emerald-800">
                  {shortDate(a.startDate)} → {shortDate(a.endDate)} · tous les RDV sont couverts
                </p>
              </Row>
            );
          })}
        </Section>
      )}

      {todo.pending.length > 0 && (
        <Section title="Demandes à valider" count={todo.pending.length}>
          <PendingRequests pending={todo.pending} />
        </Section>
      )}

      {todo.gaps.length > 0 && (
        <Section title="Manques d'assistant à couvrir" count={todo.gaps.length} hint={`Sur les ${HORIZON} prochains jours. Ouvrez la journée pour affecter quelqu'un, récupérer un prêt ou confirmer un assistant de moins.`}>
          {todo.gaps.map(({ iso, day }) => (
            <Row key={iso + day.praticien.id} tone="amber" icon={<UserX className="size-5 text-amber-600" />}>
              <p className="font-medium text-amber-900">{displayName(day.praticien)}</p>
              <p className="text-amber-800">
                {fromISODate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                {halvesLabel(day)} · manque {day.missing}
              </p>
              <Button size="sm" variant="outline" className="ml-auto bg-white" onClick={() => onShowDay(iso)}>
                Voir la journée <ArrowRight />
              </Button>
            </Row>
          ))}
        </Section>
      )}

      {todo.coverage.length > 0 && (
        <Section title="Postes non couverts" count={todo.coverage.length}>
          {todo.coverage.map((c) => (
            <Row key={c.label + c.iso} tone="amber" icon={<AlertTriangle className="size-5 text-amber-600" />}>
              <p className="font-medium text-amber-900">{c.label}</p>
              <p className="text-amber-800">{shortDate(c.iso)}</p>
              <Button size="sm" variant="outline" className="ml-auto bg-white" onClick={() => onShowDay(c.iso)}>
                Voir la journée <ArrowRight />
              </Button>
            </Row>
          ))}
        </Section>
      )}

      {has("remplacements") && todo.toReassign.length > 0 && (
        <Row tone="slate" icon={<CalendarClock className="size-5 text-slate-500" />}>
          <p className="font-medium text-slate-900">{todo.toReassign.length} RDV patients à réaffecter</p>
          <p className="text-slate-500">Leur assistant est absent.</p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => onReplace()}>
            Ouvrir « À remplacer » <ArrowRight />
          </Button>
        </Row>
      )}
    </div>
  );
}

function Section({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {title}
        {count > 0 && <span className="rounded-full bg-pink-500 px-1.5 text-[0.65rem] font-semibold text-white">{count}</span>}
      </h2>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const TONES = {
  rose: "border-rose-200 bg-rose-50",
  emerald: "border-emerald-200 bg-emerald-50",
  amber: "border-amber-200 bg-amber-50",
  slate: "bg-white",
} as const;

function Row({ tone, icon, children }: { tone: keyof typeof TONES; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm", TONES[tone])}>
      {icon}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">{children}</div>
    </div>
  );
}

export function PendingRequests({ pending }: { pending: TeamAbsence[] }) {
  const { findUser, rdvs, profiles, users, absences, validateAbsence, refuseAbsence } = useTeam();
  const { has } = useVersion();
  if (pending.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-400">Aucune demande en attente.</p>;
  }
  return (
    <div className="grid gap-4">
      {pending.map((a) => {
        const u = findUser(a.userId);
        if (!u) return null;
        const load = u.poste === "praticien" ? agendaLoad(u, a.startDate, a.endDate, rdvs) : null;
        const days = datesBetween(a.startDate, a.endDate);
        // Simule l'impact : tensions créées si on valide cette demande.
        const simulated = [...absences.filter((x) => x.id !== a.id), { ...a, status: "validee" as const }];
        const newTensions = profiles.flatMap((p) => {
          const before = new Set(tensionsFor(p, users, absences.filter((x) => x.id !== a.id), days));
          return tensionsFor(p, users, simulated, days)
            .filter((iso) => !before.has(iso))
            .map((iso) => `${p.label} le ${shortDate(iso)}`);
        });
        const assistantRdvs = rdvs.filter((r) => r.assistantUserId === u.id && r.date >= a.startDate && r.date <= a.endDate);
        return (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-start gap-6">
              <div className="flex min-w-64 items-start gap-3">
                <UserAvatar user={u} className="size-10" />
                <div>
                  <PersonLink userId={u.id} className="font-medium text-slate-900">
                    {displayName(u)}
                  </PersonLink>
                  <p className="text-sm text-slate-500">
                    {shortDate(a.startDate)} → {shortDate(a.endDate)} · {days.length} jour(s)
                  </p>
                  <div className="mt-1.5">
                    <AbsenceBadge absence={a} />
                  </div>
                  {a.motif && <p className="mt-1 text-xs text-slate-500">« {a.motif} »</p>}
                </div>
              </div>

              <div className="min-w-72 flex-1 space-y-2 text-sm">
                {load ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">Charge d&apos;agenda sur la période</span>
                      <span className={cn("font-medium", load.ratio > 0.6 ? "text-rose-600" : "text-slate-700")}>
                        {Math.round(load.ratio * 100)} %
                      </span>
                    </div>
                    <Progress value={load.ratio * 100} className={cn(load.ratio > 0.6 && "[&>[data-slot=progress-indicator]]:bg-rose-500")} />
                    <p className="text-xs text-slate-500">
                      {load.booked} RDV patients déjà posés, soit {formatMinutes(load.bookedMinutes)} sur {formatMinutes(load.openMinutes)} d&apos;ouverture. En cas de validation, l&apos;agenda Soins est fermé sur la période et ces RDV
                      sont signalés pour report.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    {assistantRdvs.length} RDV au fauteuil prévus avec {u.firstName} sur la période
                    {assistantRdvs.length > 0 && has("remplacements") && " : des remplaçants seront proposés."}
                  </p>
                )}
                {!has("binomes") ? null : newTensions.length > 0 ? (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Créerait une tension : {newTensions.join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700">Aucune tension de planning créée.</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Gate perm="team.planning">
                  <Button
                    variant="outline"
                    onClick={() => {
                      refuseAbsence(a.id);
                      toast(`Demande de ${u.firstName} refusée`);
                    }}
                  >
                    Refuser
                  </Button>
                </Gate>
                <Gate perm="team.planning">
                  <Button
                    onClick={() => {
                      validateAbsence(a.id);
                      toast.success(`Absence de ${u.firstName} validée`, {
                        description: u.poste === "praticien" ? "Agenda Soins fermé sur la période." : undefined,
                      });
                    }}
                  >
                    Valider
                  </Button>
                </Gate>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

