"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Info, Siren, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { useProfilsPlanning } from "@/components/team/useProfilsPlanning";
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
  const profilsPlanning = useProfilsPlanning();
  const dernierMoment = useVersion().has("dernierMoment");
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
    // Dernier moment : selon la version de la démo.
    const dates = datesBetween(today, until).filter((iso) => fromISODate(iso).getDay() !== 0);
    const staffingOf = new Map(dates.map((iso) => [iso, dayStaffing(iso, profilsPlanning, users, absences, dayOverrides, dayNeeds)]));
    const lastMinute = absences
      .filter((a) => dernierMoment && a.status !== "refusee" && isLastMinute(a) && a.endDate >= today)
      .map((absence) => {
        const u = users.find((x) => x.id === absence.userId);
        const dans = (iso: string) => iso >= absence.startDate && iso <= absence.endDate;
        // Le message dépend du poste : un praticien a des RDV, un assistant ou une aide tient un fauteuil,
        // la secrétaire, le comptable ou le gestionnaire n'ont pas de RDV patients.
        const kind: "praticien" | "fauteuil" | "autre" = u?.roleIds.includes("role-praticien")
          ? "praticien"
          : u?.roleIds.some((r) => r === "role-assistant" || r === "role-aide")
            ? "fauteuil"
            : "autre";
        const open = toReassign.filter((r) => dans(r.date) && r.assistantUserId === absence.userId).length;
        const rdvPraticien = risks.filter((r) => r.reason === "praticien" && r.rdv.praticienUserId === absence.userId && dans(r.rdv.date)).length;
        // Praticiens laissés sans assistant à cause de l'absence : il était prévu avec eux (équipe en V1, placé à la main en MVP).
        const manques = [...staffingOf]
          .filter(([iso]) => dans(iso))
          .flatMap(([iso, st]) =>
            st.praticiens
              .filter(
                (p) =>
                  p.missing > 0 &&
                  (p.absentTitulaires.includes(absence.userId) ||
                    dayOverrides.some((o) => o.date === iso && o.assistantId === absence.userId && o.praticienId === p.praticien.id))
              )
              .map((p) => ({ iso, praticien: p.praticien }))
          );
        // Assistant ou aide absent(e) : un assistant en moins pour chaque praticien touché, avec ses RDV sur la période
        // (ceux où il/elle était prévu(e), et les praticiens laissés sans assistant d'après le planning).
        const rdvsPerdus = rdvs.filter((r) => r.date >= today && dans(r.date) && r.assistantUserId === absence.userId);
        const touches = new Map<string, number>();
        rdvsPerdus.forEach((r) => touches.set(r.praticienUserId, (touches.get(r.praticienUserId) ?? 0) + 1));
        manques.forEach((m) => touches.set(m.praticien.id, touches.get(m.praticien.id) ?? 0));
        const praticiensTouches = [...touches].map(([praticienId, nbRdv]) => ({ praticien: users.find((x) => x.id === praticienId)!, nbRdv })).filter((x) => x.praticien);
        const aTraiter = kind === "praticien" ? rdvPraticien > 0 : kind === "fauteuil" ? praticiensTouches.length > 0 : false;
        return { absence, kind, open, rdvPraticien, manques, praticiensTouches, aTraiter };
      });
    const gaps = dates.flatMap((iso) =>
      staffingOf
        .get(iso)!
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
    const count = pending.length + lastMinute.filter((x) => x.aTraiter).length + gaps.length + coverage.length;
    return { pending, lastMinute, gaps, coverage, toReassign, count };
  }, [absences, rdvs, profiles, profilsPlanning, users, dayOverrides, dayNeeds, today, until, dernierMoment]);
}

function halvesLabel(day: PraticienDay) {
  if (day.missingHalves.length !== 1 || day.halves.length !== 2) return "";
  const h = day.byHalf.find((x) => x.half === day.missingHalves[0])!;
  return ` · ${HALF_DAY_LABELS[h.half]}${h.activities.length ? ` (${h.activities.map(activityName).join(", ").toLowerCase()})` : ""}`;
}

/**
 * Ce qui attend une décision, groupé façon Hub Patient : « Demandes à valider » (dont les absences
 * de dernier moment) et « Manques d'assistant à couvrir » sont deux vues distinctes, pas une liste
 * unique — chacune a sa propre pastille de compteur dans la barre du planning.
 */
export function ToDoPanel({
  only,
  onShowDay,
  onReplace,
}: {
  /** Ne montre que cette section (sinon tout, pour la carte du tableau de bord). */
  only?: "demandes" | "manques";
  onShowDay: (iso: string) => void;
  onReplace: (absenceId?: string) => void;
}) {
  const { findUser } = useTeam();
  const { has } = useVersion();
  const todo = useToDo();
  const openLastMinute = todo.lastMinute.filter((x) => x.aTraiter);
  const handledLastMinute = todo.lastMinute.filter((x) => !x.aTraiter);
  const showDemandes = only !== "manques";
  const showManques = only !== "demandes";

  const demandesCount = todo.pending.length + openLastMinute.length;
  const manquesCount = todo.gaps.length + todo.coverage.length;
  const empty = only === "demandes" ? demandesCount === 0 : only === "manques" ? manquesCount === 0 : todo.count === 0 && todo.toReassign.length === 0;

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="font-medium text-slate-900">{only === "manques" ? "Aucun manque" : "Rien à traiter"}</p>
        <p className="text-sm text-slate-500">
          {only === "manques" ? `Pas de manque sur les ${HORIZON} prochains jours.` : `Pas de demande en attente ni de manque sur les ${HORIZON} prochains jours.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDemandes && (openLastMinute.length > 0 || handledLastMinute.length > 0) && (
        <Section title="Absences de dernier moment" count={openLastMinute.length}>
          {openLastMinute.map(({ absence: a, kind, open, rdvPraticien, praticiensTouches }) => {
            const u = findUser(a.userId);
            // « un assistant en moins pour Dr Sophie Martin (5 RDV sur la période) ».
            const parPraticien = praticiensTouches.map(
              ({ praticien, nbRdv }) => `${displayName(praticien)} (${nbRdv ? `${nbRdv} RDV sur la période` : "pas de RDV sur la période"})`
            );
            return (
              <Row key={a.id} tone="rose" icon={<Siren className="size-5 text-rose-600" />}>
                <p className="font-medium text-rose-900">
                  {u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?"} absent(e)
                </p>
                <p className="text-rose-800">
                  {shortDate(a.startDate)} → {shortDate(a.endDate)}
                  {kind === "praticien" && ` · ${rdvPraticien} RDV patient${rdvPraticien > 1 ? "s" : ""} à reporter (agenda Soins fermé)`}
                  {kind === "fauteuil" && parPraticien.length > 0 && ` · un assistant en moins pour ${parPraticien.join(", ")}`}
                </p>
                {kind === "fauteuil" && open > 0 && has("remplacements") && (
                  <Button size="sm" onClick={() => onReplace(a.id)} className="ml-auto">
                    Trouver un remplaçant
                  </Button>
                )}
              </Row>
            );
          })}
          {handledLastMinute.map(({ absence: a, kind }) => {
            const u = findUser(a.userId);
            const nom = u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?";
            // Secrétaire, comptable, gestionnaire : pas de RDV patients, on informe sans parler de couverture.
            if (kind === "autre") {
              return (
                <Row key={a.id} tone="slate" icon={<Info className="size-5 text-slate-400" />}>
                  <p className="font-medium text-slate-800">{nom} absent(e)</p>
                  <p className="text-slate-500">
                    {shortDate(a.startDate)} → {shortDate(a.endDate)} · pas de RDV patients
                  </p>
                </Row>
              );
            }
            return (
              <Row key={a.id} tone="emerald" icon={<CheckCircle2 className="size-5 text-emerald-600" />}>
                <p className="font-medium text-emerald-900">{nom} absent(e)</p>
                <p className="text-emerald-800">
                  {shortDate(a.startDate)} → {shortDate(a.endDate)} · {kind === "praticien" ? "tous les RDV sont couverts" : "aucun praticien sans assistant"}
                </p>
              </Row>
            );
          })}
        </Section>
      )}

      {showDemandes && todo.pending.length > 0 && (
        <Section title="Demandes à valider" count={todo.pending.length}>
          <PendingRequests pending={todo.pending} />
        </Section>
      )}

      {showManques && todo.gaps.length > 0 && (
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

      {showManques && todo.coverage.length > 0 && (
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

      {!only && has("remplacements") && todo.toReassign.length > 0 && (
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

