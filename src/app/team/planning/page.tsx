"use client";

import { useAccess } from "@/components/team/Access";
import { Suspense, useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { useVersion } from "@/components/team/Version";
import { useRouter, useSearchParams } from "next/navigation";
import { ToDoPanel, useToDo } from "@/components/team/planning/ToDo";
import { RemplacementsPanel } from "@/components/team/remplacements/RemplacementsPanel";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, PageHeader, PillFilter } from "@/components/team/shared";
import { TeamCalendar } from "@/components/team/planning/TeamCalendar";
import { DeclareAbsenceDialog, DeclarePrefill } from "@/components/team/planning/DeclareAbsenceDialog";
import { PersonLink } from "@/components/team/PersonSheet";
import { AbsencePopover, useAbsenceActions } from "@/components/team/AbsencePopover";
import { ROLE_GROUP_LABELS, ROLE_MIN_COVERAGE, ROLE_ORDER, collapseRecurring, datesBetween, dayStaffing, displayName, isAvailable, shortDate } from "@/lib/team";
import { BinomesCalendar } from "@/components/team/planning/BinomesCalendar";
import { DayStaffingView } from "@/components/team/planning/DayStaffingView";
import { DayCountPicker } from "@/components/shared/DayCountPicker";
import { DocumentBadge } from "@/components/team/Justificatifs";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/utils/date";

export default function PlanningPage() {
  return (
    <Suspense>
      <Planning />
    </Suspense>
  );
}

function Planning() {
  const params = useSearchParams();
  const { users, absences, profiles, now, dayOverrides, dayNeeds, sessionUserId } = useTeam();
  const allowed = useAccess();
  const { has } = useVersion();
  // Sans le droit « Planning d'équipe » (assistants, aides…) : on consulte le planning, sans rien modifier.
  const readOnly = !allowed("planning");
  const router = useRouter();
  const canReplace = allowed("remplacements") && has("remplacements");
  // Onglets, façon Hub Patient : des pastilles groupées avec compteur plutôt qu'un seul "À traiter".
  // Demandes à valider (dont dernier moment), Manques à couvrir, Calendrier, À remplacer (RDV), Toutes les absences.
  const [storedTab, setTab] = useState(() => params.get("tab") ?? "calendrier");
  const tab = (readOnly && (storedTab === "demandes" || storedTab === "manques")) || (!canReplace && storedTab === "remplacer") ? "calendrier" : storedTab;
  const todo = useToDo();
  const demandesCount = todo.pending.length + todo.lastMinute.filter((x) => x.open > 0).length;
  const manquesCount = todo.gaps.length + todo.coverage.length;
  const [mode, setMode] = usePersistentState<"jour" | "semaine" | "jours" | "mois">("planning-mode", "semaine");
  const [customDays, setCustomDays] = usePersistentState("planning-custom-days", 5);
  const [anchor, setAnchor] = useState(() => params.get("date") ?? toISODate(now()));
  const highlightUserId = params.get("user");
  const [roleFilter, setRoleFilter] = usePersistentState<string>("planning-roles", "tous");
  const [storedView, setView] = usePersistentState<"binomes" | "personnes">(
    "planning-view",
    "binomes",
    params.get("view") === "personnes" || params.get("user") ? "personnes" : params.get("view") === "binomes" ? "binomes" : null
  );
  // La vue Binômes existe dès le MVP (drapeau gardé pour pouvoir la décaler).
  const view = has("binomes") ? storedView : "personnes";
  const [declareOpen, setDeclareOpen] = useState(false);
  const [prefill, setPrefill] = useState<DeclarePrefill | undefined>();

  // Le cabinet ne travaille pas le week-end (toujours "Repos" dans la semaine type) : une fenêtre de
  // N jours saute samedi et dimanche plutôt que de les compter pour rien.
  function workingDaysFrom(start: Date, count: number, dir: 1 | -1 = 1): Date[] {
    const out: Date[] = [];
    let d = start;
    while (out.length < count) {
      if (![0, 6].includes(d.getDay())) out.push(d);
      d = addDays(d, dir);
    }
    return dir === 1 ? out : out.reverse();
  }

  const dates = useMemo(() => {
    const a = fromISODate(anchor);
    if (mode === "jour") return [anchor];
    // Le cabinet ne travaille pas le samedi (toujours "Repos" dans la semaine type) : l'enlever
    // laisse plus de place aux jours vraiment travaillés dans la grille.
    if (mode === "semaine") {
      const s = startOfWeek(a);
      return datesBetween(toISODate(s), toISODate(addDays(s, 4)));
    }
    if (mode === "jours") return workingDaysFrom(a, customDays).map(toISODate);
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const last = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return datesBetween(toISODate(first), toISODate(last)).filter((iso) => ![0, 6].includes(fromISODate(iso).getDay()));
  }, [anchor, mode, customDays]);

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

  const shift = (dir: number) => {
    const a = fromISODate(anchor);
    if (mode === "jours") {
      const next = dir > 0 ? addDays(workingDaysFrom(a, customDays)[customDays - 1], 1) : workingDaysFrom(addDays(a, -1), customDays, -1)[0];
      setAnchor(toISODate(next));
      return;
    }
    setAnchor(
      toISODate(
        mode === "jour" ? addDays(a, dir) : mode === "semaine" ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1)
      )
    );
  };
  const rangeLabel =
    mode === "jour"
      ? fromISODate(anchor).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
      : mode === "semaine" || mode === "jours"
        ? `${shortDate(dates[0])} → ${shortDate(dates[dates.length - 1])}`
        : fromISODate(anchor).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <PageHeader
        title="Planning d'équipe"
        description="Présences et absences de tout le cabinet, en une vue. Distinct de l'agenda des RDV patients (Soins)."
        // Tout le monde déclare ses absences depuis le planning (pour soi ; pour un tiers avec le droit planning).
        actions={
          <Button
            onClick={() => {
              setPrefill(undefined);
              setDeclareOpen(true);
            }}
          >
            <CalendarPlus /> Déclarer une absence
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="h-auto gap-0.5 rounded-full bg-slate-100 p-0.5">
            <TabsTrigger value="calendrier" className="rounded-full px-3 py-1.5 data-active:bg-pink-100 data-active:text-pink-900 data-active:shadow-none">
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="liste" className="rounded-full px-3 py-1.5 data-active:bg-pink-100 data-active:text-pink-900 data-active:shadow-none">
              Toutes les absences
            </TabsTrigger>
          </TabsList>
          {!readOnly && (
            <TabsList className="h-auto gap-0.5 rounded-full bg-slate-100 p-0.5">
              <TabsTrigger value="demandes" className="rounded-full px-3 py-1.5 data-active:bg-pink-100 data-active:text-pink-900 data-active:shadow-none">
                Demandes à valider
                {demandesCount > 0 && <Badge className="ml-1 h-4 bg-pink-500 px-1.5 text-[0.65rem]">{demandesCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="manques" className="rounded-full px-3 py-1.5 data-active:bg-pink-100 data-active:text-pink-900 data-active:shadow-none">
                Manques à couvrir
                {manquesCount > 0 && <Badge className="ml-1 h-4 bg-amber-500 px-1.5 text-[0.65rem]">{manquesCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          )}
          {canReplace && (
            <TabsList className="h-auto gap-0.5 rounded-full bg-slate-100 p-0.5">
              <TabsTrigger value="remplacer" className="rounded-full px-3 py-1.5 data-active:bg-pink-100 data-active:text-pink-900 data-active:shadow-none">
                À remplacer
                {todo.toReassign.length > 0 && <Badge className="ml-1 h-4 bg-slate-700 px-1.5 text-[0.65rem]">{todo.toReassign.length}</Badge>}
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {!readOnly && (
          <TabsContent value="demandes" className="mt-4">
            <ToDoPanel
              only="demandes"
              onShowDay={(iso) => {
                setAnchor(iso);
                setMode("semaine");
                setView("binomes");
                setTab("calendrier");
              }}
              onReplace={(absenceId) => {
                router.replace(absenceId ? `/team/planning?tab=remplacer&absence=${absenceId}` : "/team/planning?tab=remplacer");
                setTab("remplacer");
              }}
            />
          </TabsContent>
        )}

        {!readOnly && (
          <TabsContent value="manques" className="mt-4">
            <ToDoPanel
              only="manques"
              onShowDay={(iso) => {
                setAnchor(iso);
                setMode("semaine");
                setView("binomes");
                setTab("calendrier");
              }}
              onReplace={(absenceId) => {
                router.replace(absenceId ? `/team/planning?tab=remplacer&absence=${absenceId}` : "/team/planning?tab=remplacer");
                setTab("remplacer");
              }}
            />
          </TabsContent>
        )}

        <TabsContent value="calendrier" className="mt-4 space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Précédent">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(toISODate(now()))}>
                Aujourd&apos;hui
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Suivant">
                <ChevronRight />
              </Button>
              <div className="ml-1 flex items-center gap-1">
                <ToggleGroup type="single" variant="outline" size="sm" value={mode === "mois" ? undefined : mode} onValueChange={(v) => v && setMode(v as typeof mode)}>
                  <ToggleGroupItem value="jour" className="px-3">
                    Jour
                  </ToggleGroupItem>
                  <ToggleGroupItem value="semaine" className="px-3">
                    Semaine
                  </ToggleGroupItem>
                </ToggleGroup>
                <DayCountPicker
                  value={customDays}
                  active={mode === "jours"}
                  onChange={(days) => {
                    setCustomDays(days);
                    setMode("jours");
                  }}
                  activeClassName="h-7 rounded-[min(var(--radius-md),12px)] border border-input bg-muted"
                />
                <ToggleGroup type="single" variant="outline" size="sm" value={mode === "mois" ? "mois" : undefined} onValueChange={(v) => v && setMode(v as typeof mode)}>
                  <ToggleGroupItem value="mois" className="px-3">
                    Mois
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <span className="justify-self-center whitespace-nowrap text-sm font-medium capitalize text-slate-800">{rangeLabel}</span>

            <div className="flex items-center justify-end gap-3">
              {has("binomes") && (
                <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
                  <ToggleGroupItem value="binomes" className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                    Équipes
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
            </div>
          </div>

          {view === "binomes" ? (
            <>
              {mode === "jour" ? (
                <DayStaffingView date={dates[0]} staffing={staffing.get(dates[0])!} readOnly={readOnly} />
              ) : (
                <BinomesCalendar
                  dates={dates}
                  staffing={staffing}
                  readOnly={readOnly}
                  editablePraticienId={profiles.some((p) => p.praticienUserId === sessionUserId) ? sessionUserId : undefined}
                  onDeclare={(userId, date) => {
                    setPrefill({ userId, date });
                    setDeclareOpen(true);
                  }}
                />
              )}
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

        {canReplace && (
          <TabsContent value="remplacer" className="mt-4">
            <RemplacementsPanel key={params.toString()} />
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
      <span>Le besoin en assistants vient de Soins : semaine type du praticien et assistants par type d&apos;activité.</span>
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

function AllAbsences() {
  const { absences, findUser, can, sessionUserId, now } = useTeam();
  const { cancelWithUndo } = useAbsenceActions();
  const sorted = collapseRecurring(absences, toISODate(now())).sort((a, b) => b.startDate.localeCompare(a.startDate));
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
                {a.recurrence && <span className="ml-1.5 text-xs text-slate-500">{a.recurrence.toLowerCase()}</span>}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <AbsencePopover absence={a}>
                    <button className="rounded hover:ring-1 hover:ring-slate-300">
                      <AbsenceBadge absence={a} compact />
                    </button>
                  </AbsencePopover>
                  {(can("team.planning") || a.userId === sessionUserId) && <DocumentBadge absence={a} />}
                </span>
              </TableCell>
              <TableCell className="text-sm">{a.status === "validee" ? "Validée" : a.status === "demandee" ? "À valider" : "Refusée"}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {a.source === "soins" ? (
                  "Agenda Soins"
                ) : (
                  <>
                    {new Date(a.declaredAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    {by ? ` par ${by.firstName}` : ""}
                  </>
                )}
              </TableCell>
              <TableCell>
                {a.source !== "soins" && (can("team.planning") || a.userId === sessionUserId) && (
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
