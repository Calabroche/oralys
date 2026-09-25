"use client";

import { formatMinutes } from "@/lib/time";
import { useAccess } from "@/components/team/Access";
import { Suspense, useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { useVersion } from "@/components/team/Version";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, Gate, PageHeader, PillFilter, UserAvatar } from "@/components/team/shared";
import { TeamCalendar } from "@/components/team/planning/TeamCalendar";
import { DeclareAbsenceDialog, DeclarePrefill } from "@/components/team/planning/DeclareAbsenceDialog";
import { PersonLink } from "@/components/team/PersonSheet";
import { AbsencePopover, useAbsenceActions } from "@/components/team/AbsencePopover";
import { ROLE_GROUP_LABELS, ROLE_MIN_COVERAGE, ROLE_ORDER, agendaLoad, datesBetween, dayStaffing, displayName, isAvailable, shortDate, tensionsFor } from "@/lib/team";
import { BinomesCalendar } from "@/components/team/planning/BinomesCalendar";
import { TeamAbsence } from "@/types/team";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

export default function PlanningPage() {
  return (
    <Suspense>
      <Planning />
    </Suspense>
  );
}

function Planning() {
  const params = useSearchParams();
  const { users, absences, profiles, now, dayOverrides, dayNeeds } = useTeam();
  const allowed = useAccess();
  // Sans le droit « Planning d'équipe » (assistants, aides…) : on consulte le planning, sans rien modifier.
  const readOnly = !allowed("planning");
  const [storedTab, setTab] = useState(params.get("tab") ?? "calendrier");
  const tab = readOnly && storedTab === "demandes" ? "calendrier" : storedTab;
  const [mode, setMode] = usePersistentState<"semaine" | "mois">("planning-mode", "semaine");
  const [anchor, setAnchor] = useState(() => params.get("date") ?? toISODate(now()));
  const highlightUserId = params.get("user");
  const [roleFilter, setRoleFilter] = usePersistentState<string>("planning-roles", "tous");
  const { has } = useVersion();
  const [storedView, setView] = usePersistentState<"binomes" | "personnes">(
    "planning-view",
    "binomes",
    params.get("view") === "personnes" || params.get("user") ? "personnes" : params.get("view") === "binomes" ? "binomes" : null
  );
  // Avant la V1, pas de binômes : seule la vue par personne existe.
  const view = has("binomes") ? storedView : "personnes";
  const [declareOpen, setDeclareOpen] = useState(false);
  const [prefill, setPrefill] = useState<DeclarePrefill | undefined>();

  const dates = useMemo(() => {
    const a = fromISODate(anchor);
    if (mode === "semaine") {
      const s = startOfWeek(a);
      return datesBetween(toISODate(s), toISODate(addDays(s, 5)));
    }
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const last = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return datesBetween(toISODate(first), toISODate(last)).filter((iso) => fromISODate(iso).getDay() !== 0);
  }, [anchor, mode]);

  const active = users.filter((u) => u.status === "actif");
  const people = active.filter((u) => roleFilter === "tous" || u.roleIds.includes(roleFilter));

  const staffing = useMemo(() => new Map(dates.map((iso) => [iso, dayStaffing(iso, profiles, users, absences, dayOverrides, dayNeeds)])), [dates, profiles, users, absences, dayOverrides, dayNeeds]);
  // Tension = un praticien qui consulte n'a pas tous les assistants dont il a besoin.
  const tensions = useMemo(
    () =>
      !has("binomes") ? [] : dates.flatMap((iso) =>
        (staffing.get(iso)?.praticiens ?? []).filter((p) => p.missing > 0).map((p) => ({ profile: p.profile, iso, missing: p.missing }))
      ),
    [dates, staffing, has]
  );
  // Rôles hors binômes : au moins N personnes présentes chaque jour ouvré (ex. un(e) secrétaire à l'accueil).
  const coverageGaps = useMemo(
    () =>
      Object.entries(ROLE_MIN_COVERAGE).flatMap(([roleId, rule]) =>
        dates
          .filter((iso) => fromISODate(iso).getDay() !== 6)
          .filter((iso) => active.filter((u) => u.roleIds.includes(roleId) && isAvailable(u, iso, absences)).length < rule.min)
          .map((iso) => ({ roleId, label: rule.label, iso }))
      ),
    [dates, active, absences]
  );
  const pending = absences.filter((a) => a.status === "demandee");

  const shift = (dir: number) => {
    const a = fromISODate(anchor);
    setAnchor(toISODate(mode === "semaine" ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1)));
  };
  const rangeLabel =
    mode === "semaine"
      ? `${shortDate(dates[0])} → ${shortDate(dates[dates.length - 1])}`
      : fromISODate(anchor).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <PageHeader
        title="Planning d'équipe"
        description="Présences et absences de tout le cabinet, en une vue. Distinct de l'agenda des RDV patients (Soins)."
        actions={
          readOnly ? undefined : (
            <Button
              onClick={() => {
                setPrefill(undefined);
                setDeclareOpen(true);
              }}
            >
              <CalendarPlus /> Déclarer une absence
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line">
          <TabsTrigger value="calendrier">Calendrier consolidé</TabsTrigger>
          {!readOnly && (
            <TabsTrigger value="demandes">
              Demandes à valider
              {pending.length > 0 && <Badge className="ml-1 h-4 bg-pink-500 px-1.5 text-[0.65rem]">{pending.length}</Badge>}
            </TabsTrigger>
          )}
          <TabsTrigger value="liste">Toutes les absences</TabsTrigger>
        </TabsList>

        <TabsContent value="calendrier" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Précédent">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(toISODate(now()))}>
                Aujourd&apos;hui
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Suivant">
                <ChevronRight />
              </Button>
              <span className="ml-2 text-sm font-medium capitalize text-slate-800">{rangeLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              {has("binomes") && (
                <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
                  <ToggleGroupItem value="binomes" className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                    Binômes
                  </ToggleGroupItem>
                  <ToggleGroupItem value="personnes" className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                    Par personne
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
              {view === "personnes" && (
                <PillFilter
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: "tous", label: "Tous", count: active.length },
                    ...ROLE_ORDER.map((id) => ({ value: id, label: ROLE_GROUP_LABELS[id], count: active.filter((u) => u.roleIds.includes(id)).length })),
                  ]}
                />
              )}
              <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as typeof mode)}>
                <ToggleGroupItem value="semaine" className="px-3">
                  Semaine
                </ToggleGroupItem>
                <ToggleGroupItem value="mois" className="px-3">
                  Mois
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {!readOnly && (tensions.length > 0 || (view === "personnes" && coverageGaps.length > 0)) && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle />
              <AlertTitle>Tensions de planning sur la période</AlertTitle>
              <AlertDescription className="text-amber-800">
                <ul className="mt-1 space-y-0.5">
                  {groupTensions(tensions).map((t) => (
                    <li key={t.label}>
                      <span className="font-medium">{t.label}</span> : besoin en assistants non couvert le {t.days.map(shortDate).join(", ")}.{" "}
                      <Link href="/team/remplacements" className="underline underline-offset-2">
                        Voir les remplaçants
                      </Link>
                    </li>
                  ))}
                  {view === "personnes" && groupCoverage(coverageGaps).map((g) => (
                    <li key={g.label}>
                      <span className="font-medium">{g.label}</span> le {g.days.map(shortDate).join(", ")}.
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {view === "binomes" ? (
            <>
              <BinomesCalendar
                dates={dates}
                staffing={staffing}
                readOnly={readOnly}
                onDeclare={(userId, date) => {
                  setPrefill({ userId, date });
                  setDeclareOpen(true);
                }}
              />
              <BinomesLegend />
            </>
          ) : (
            <>
              <TeamCalendar
                dates={dates}
                people={people}
                staffing={staffing}
                roleFilter={roleFilter === "tous" ? undefined : roleFilter}
                highlightUserId={highlightUserId}
                tensionDates={new Set([...tensions, ...coverageGaps].map((t) => t.iso))}
                readOnly={readOnly}
                onCellClick={(userId, date) => {
                  setPrefill({ userId, date });
                  setDeclareOpen(true);
                }}
              />
              <Legend />
            </>
          )}
        </TabsContent>

        {!readOnly && (
          <TabsContent value="demandes" className="mt-4">
            <PendingRequests pending={pending} />
          </TabsContent>
        )}

        <TabsContent value="liste" className="mt-4">
          <AllAbsences />
        </TabsContent>
      </Tabs>

      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} prefill={prefill} />
    </div>
  );
}

function groupCoverage(list: { label: string; iso: string }[]) {
  const map = new Map<string, string[]>();
  list.forEach((t) => map.set(t.label, [...(map.get(t.label) ?? []), t.iso]));
  return [...map.entries()].map(([label, days]) => ({ label, days }));
}

function groupTensions(list: { profile: { label: string }; iso: string }[]) {
  const map = new Map<string, string[]>();
  list.forEach((t) => map.set(t.profile.label, [...(map.get(t.profile.label) ?? []), t.iso]));
  return [...map.entries()].map(([label, days]) => ({ label, days }));
}

function BinomesLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="rounded bg-emerald-100 px-1.5 text-emerald-900">Prénom</span> Titulaire
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-dashed border-sky-300 bg-sky-50 px-1.5 text-sky-900">↻ Prénom</span> Back-up (remplace ou complète)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-violet-300 bg-violet-50 px-1.5 text-violet-900">⇄ Prénom</span> Prêté(e) pour la journée
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-dashed border-rose-300 px-1.5 text-rose-700">Manque 1</span> Besoin non couvert
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-[repeating-linear-gradient(135deg,#e2e8f0,#e2e8f0_2px,transparent_2px,transparent_5px)]" /> Ne consulte pas
      </span>
      <span>Le besoin en assistants se règle dans Praticiens & équipes.</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-400" /> Présent (cliquer pour déclarer une absence)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-sky-200 bg-sky-100" /> Congé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-rose-200 bg-rose-100" /> Maladie
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-violet-200 bg-violet-100" /> Formation
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-dashed border-slate-300" /> À valider
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded ring-2 ring-rose-400" /> Dernier moment
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-[repeating-linear-gradient(135deg,#e2e8f0,#e2e8f0_2px,transparent_2px,transparent_5px)]" /> Non travaillé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-amber-500" /> Tension
      </span>
    </div>
  );
}

function PendingRequests({ pending }: { pending: TeamAbsence[] }) {
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

function AllAbsences() {
  const { absences, findUser, can, sessionUserId } = useTeam();
  const { cancelWithUndo } = useAbsenceActions();
  const sorted = [...absences].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-xs uppercase">
          <TableHead>Collaborateur</TableHead>
          <TableHead>Période</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Déclarée</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((a) => {
          const u = findUser(a.userId);
          const by = findUser(a.declaredById);
          return (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{u ? <PersonLink userId={u.id}>{displayName(u)}</PersonLink> : "?"}</TableCell>
              <TableCell>
                {shortDate(a.startDate)} → {shortDate(a.endDate)}
              </TableCell>
              <TableCell>
                <AbsencePopover absence={a}>
                  <button className="rounded hover:ring-1 hover:ring-slate-300">
                    <AbsenceBadge absence={a} compact />
                  </button>
                </AbsencePopover>
              </TableCell>
              <TableCell className="text-sm">{a.status === "validee" ? "Validée" : a.status === "demandee" ? "À valider" : "Refusée"}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {new Date(a.declaredAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                {by ? ` par ${by.firstName}` : ""}
              </TableCell>
              <TableCell>
                {(can("team.planning") || a.userId === sessionUserId) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Annuler l'absence"
                    onClick={() => cancelWithUndo(a.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
