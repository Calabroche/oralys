"use client";

import { useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, CalendarX2, CheckCircle2, Info, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RebookDialog } from "@/components/team/RebookDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeam } from "@/context/TeamDataContext";
import { CandidateList } from "@/components/team/CandidateList";
import { PersonLink } from "@/components/team/PersonSheet";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import Link from "next/link";
import {
  absenceOn,
  acteLabel,
  displayName,
  fullName,
  isChairAssistant,
  isLastMinute,
  rdvsAtRisk,
  shortDate,
  sortCandidates,
  suggestAssistants,
} from "@/lib/team";
import { SoinsRdv } from "@/types/team";
import { toISODate } from "@/utils/date";
import { DayGapPanel } from "@/components/team/DayGapPanel";
import { useVersion } from "@/components/team/Version";
import { cn } from "@/lib/utils";

/**
 * Onglet « À remplacer » du planning : les RDV d'un assistant absent, avec les remplaçants admissibles classés,
 * et les RDV d'un praticien absent à reporter. Les liens directs gardent leurs paramètres (?absence, ?user, ?date & praticien).
 */
export function RemplacementsPanel() {
  const params = useSearchParams();
  const { rdvs, absences, users, profiles, findUser, now, assignRdv, can, keepRdvWithoutAssistant, restoreRdv } = useTeam();
  // Laisser le RDV tel quel : le praticien l'assure sans assistant, sans forcément le reprogrammer.
  const canKeep = can("team.planning") || can("rdv");
  function keepWithout(rdv: SoinsRdv) {
    const before = keepRdvWithoutAssistant(rdv.id);
    const p = findUser(rdv.praticienUserId);
    setSelectedId(null);
    toast.success("RDV maintenu sans assistant", {
      description: `${p ? displayName(p) : "Le praticien"} assure seul(e) le RDV du ${shortDate(rdv.date)} à ${rdv.start}.`,
      duration: 10000,
      action: before ? { label: "Annuler", onClick: () => restoreRdv(before) } : undefined,
    });
  }
  const today = toISODate(now());
  // Liens directs : ?absence=<id>, ?user=<id> (sa prochaine absence), ?date=<iso>&praticien=<id> (un RDV précis).
  const [absenceFilter, setAbsenceFilter] = useState(() => {
    const fromUser = absences
      .filter((a) => a.userId === params.get("user") && a.status !== "refusee" && a.endDate >= toISODate(now()))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    return params.get("absence") ?? fromUser?.id ?? "all";
  });
  const { has } = useVersion();
  const [storedMode, setMode] = usePersistentState<"regles" | "affinite">("remplacements-mode", "regles");
  // La Brique 2 (score d'affinité) arrive en V1.
  const mode = has("affinite") ? storedMode : "regles";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // RDV traités : on les garde visibles (avec le remplaçant choisi) au lieu de les faire disparaître, même après rechargement.
  const [handled, setHandled] = usePersistentState<string[]>("remplacements-traites", []);
  const [rebooking, setRebooking] = useState<SoinsRdv | null>(null);

  const upcoming = rdvs.filter((r) => r.date >= today);
  const risks = useMemo(() => rdvsAtRisk(upcoming, absences, profiles), [upcoming, absences, profiles]);
  const toReassign = risks.filter((r) => r.reason !== "praticien").map((r) => r.rdv);
  const toPostponeAll = risks.filter((r) => r.reason === "praticien").map((r) => r.rdv);
  const handledRdvs = rdvs.filter((r) => handled.includes(r.id) && !toReassign.some((x) => x.id === r.id));

  const relatedAbsences = absences.filter((a) => a.status !== "refusee" && a.endDate >= today);
  const matchesAbsence = (r: SoinsRdv) => {
    if (absenceFilter === "all") return true;
    const a = absences.find((x) => x.id === absenceFilter);
    return Boolean(a && r.date >= a.startDate && r.date <= a.endDate && (r.assistantUserId === a.userId || handled.includes(r.id)));
  };
  // Lien « Manque » du planning : on se limite à ce praticien, ce jour-là.
  const [dayFilter, setDayFilter] = useState(() =>
    params.get("date") && params.get("praticien") ? { date: params.get("date")!, praticien: params.get("praticien")! } : null
  );
  const inDay = (r: SoinsRdv) => !dayFilter || (r.date === dayFilter.date && r.praticienUserId === dayFilter.praticien);
  const list = [...toReassign, ...handledRdvs]
    .filter(matchesAbsence)
    .filter(inDay)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;
  const toPostpone = toPostponeAll.filter(inDay);

  const candidates = selected
    ? sortCandidates(
        suggestAssistants(
          { praticienUserId: selected.praticienUserId, date: selected.date, start: selected.start, acte: selected.acte, excludeRdvId: selected.id },
          { users, profiles, absences, rdvs }
        ),
        mode
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Quand un assistant attitré est absent, Oralys propose les remplaçants admissibles et les classe.</p>
        {has("affinite") && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList>
              <TabsTrigger value="regles">Brique 1 · Règles & priorités</TabsTrigger>
              <TabsTrigger value="affinite">Brique 2 · Score d&apos;affinité</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
        {mode === "regles" ? (
          <p>
            <span className="font-medium text-slate-800">Règles :</span> on écarte les absents, les personnes qui ne travaillent pas ce jour-là, sans
            l&apos;habilitation requise ou déjà au fauteuil. Puis on classe par priorité déclarée (titulaire, back-up n°1, n°2…) avant tout calcul.
          </p>
        ) : (
          <p>
            <span className="font-medium text-slate-800">Affinité :</span> mêmes règles d&apos;admissibilité, puis classement par un score 0-100 qui combine le
            rattachement, l&apos;historique réel de Soins (qui a travaillé avec qui), les actes préférés, les retours du cabinet et les préférences déclarées.
          </p>
        )}
      </div>

      {dayFilter && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm">
          <span className="text-pink-900">
            Filtré sur{" "}
            <PersonLink userId={dayFilter.praticien} className="font-medium">
              {findUser(dayFilter.praticien) ? displayName(findUser(dayFilter.praticien)!) : "?"}
            </PersonLink>
            , le {shortDate(dayFilter.date)} (depuis le planning)
          </span>
          <Button variant="outline" size="xs" className="ml-auto bg-white" onClick={() => setDayFilter(null)}>
            Voir tous les RDV à réaffecter
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={absenceFilter} onValueChange={(v) => v && setAbsenceFilter(v)} className="flex-wrap">
              <ToggleGroupItem value="all" className="px-3">
                Toutes les absences
              </ToggleGroupItem>
              {relatedAbsences
                .filter((a) => { const u = findUser(a.userId); return Boolean(u && isChairAssistant(u)); })
                .map((a) => (
                  <ToggleGroupItem key={a.id} value={a.id} className="px-3">
                    {isLastMinute(a) && <Siren className="text-rose-500" />}
                    {findUser(a.userId)?.firstName} · {shortDate(a.startDate)}
                  </ToggleGroupItem>
                ))}
            </ToggleGroup>
          </div>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">
                RDV à réaffecter <Badge variant="secondary">{toReassign.filter(matchesAbsence).filter(inDay).length}</Badge>
              </CardTitle>
            </CardHeader>
            <ul className="max-h-[32rem] divide-y overflow-y-auto">
              {list.length === 0 && (
                <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
                  <CheckCircle2 className="size-6 text-emerald-500" />
                  {dayFilter ? "Aucun RDV patient posé ou à risque ce jour-là pour ce praticien." : "Tout est couvert."}
                </li>
              )}
              {list.map((r) => {
                const p = findUser(r.praticienUserId);
                const usual = findUser(r.assistantUserId);
                const done = handled.includes(r.id) && usual && !absenceOn(usual.id, r.date, absences);
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50", selected?.id === r.id && "bg-pink-50/60")}
                    >
                      <div className="w-20 shrink-0 text-xs">
                        <div className="font-medium text-slate-800">{shortDate(r.date)}</div>
                        <div className="text-slate-500">
                          {r.start}–{r.end}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {p ? displayName(p) : "?"} · {acteLabel(r.acte)}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {r.patient} · {r.room}
                        </div>
                      </div>
                      {done ? (
                        <Badge className="bg-emerald-100 text-emerald-800">{usual.firstName}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-200 text-rose-700">
                          {usual ? `${usual.firstName} absent(e)` : "Sans assistant"}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {toPostpone.length > 0 && (
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarX2 className="size-4 text-rose-500" /> {toPostpone.length} RDV à reporter (praticien absent)
                </CardTitle>
                <CardDescription>Un praticien ne se remplace pas par un assistant : ces patients sont à recontacter.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-slate-600">
                <ul className="max-h-72 divide-y overflow-y-auto">
                  {toPostpone.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1">
                        {shortDate(r.date)} {r.start} · {displayName(findUser(r.praticienUserId)!)} · {r.patient}
                      </span>
                      <Button variant="outline" size="xs" onClick={() => setRebooking(r)}>
                        <CalendarClock /> Reprogrammer
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {dayFilter && selected && <DayGapPanel date={dayFilter.date} praticienId={dayFilter.praticien} hasRdvs />}
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {shortDate(selected.date)}, {selected.start} · {acteLabel(selected.acte)}
                </CardTitle>
                <CardDescription>
                  <PersonLink userId={selected.praticienUserId}>{displayName(findUser(selected.praticienUserId)!)}</PersonLink> · {selected.patient} · {selected.room}
                  {findUser(selected.assistantUserId) && (
                    <>
                      {" "}· assistant(e) prévu(e) :{" "}
                      <PersonLink userId={selected.assistantUserId!}>{fullName(findUser(selected.assistantUserId)!)}</PersonLink>
                      {(() => {
                        const abs = absenceOn(selected.assistantUserId!, selected.date, absences);
                        return abs ? (
                          <AbsencePopover absence={abs} date={selected.date}>
                            <button className="ml-2 rounded border border-rose-200 bg-rose-50 px-1.5 text-xs text-rose-700 hover:bg-rose-100">
                              absent(e) · retirer l&apos;absence ?
                            </button>
                          </AbsencePopover>
                        ) : null;
                      })()}
                    </>
                  )}
                  <br />
                  <Link href={`/team/planning?date=${selected.date}`} className="text-xs text-pink-700 hover:underline">
                    Voir cette journée dans le planning →
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CandidateList
                    emptyAction={
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button onClick={() => setRebooking(selected)}>
                          <CalendarClock /> Reprogrammer le RDV
                        </Button>
                        {canKeep && (
                          <Button variant="outline" onClick={() => keepWithout(selected)}>
                            <CheckCircle2 /> Maintenir sans assistant
                          </Button>
                        )}
                      </div>
                    }
                    candidates={candidates}
                    mode={mode}
                    currentId={selected.assistantUserId}
                    onAssign={!(can("team.planning") || can("rdv")) ? undefined : (c) => {
                      assignRdv(selected.id, c.user.id);
                      setHandled((h) => [...h, selected.id]);
                      toast.success(`${fullName(c.user)} affecté(e)`, { description: "Le RDV est mis à jour dans Soins." });
                    }}
                  />
                {candidates.some((c) => c.eligible) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4">
                    <Button variant="link" size="sm" className="px-0" onClick={() => setRebooking(selected)}>
                      <CalendarClock /> Aucun ne convient ? Reprogrammer le RDV
                    </Button>
                    {canKeep && (
                      <Button variant="link" size="sm" className="px-0 text-slate-600" onClick={() => keepWithout(selected)}>
                        <CheckCircle2 /> Maintenir le RDV sans assistant
                      </Button>
                    )}
                  </div>
                )}
                {!(can("team.planning") || can("rdv")) && <p className="mt-3 text-xs text-slate-500">Lecture seule : l&apos;affectation nécessite le droit « Gérer le planning d&apos;équipe ».</p>}
              </CardContent>
            </Card>
          ) : dayFilter ? (
            <DayGapPanel date={dayFilter.date} praticienId={dayFilter.praticien} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Sélectionnez un RDV.</p>
          )}
        </div>
      </div>
      <RebookDialog
        key={rebooking?.id ?? "none"}
        rdv={rebooking}
        onClose={() => setRebooking(null)}
        onDone={(id) => {
          setHandled((h) => h.filter((x) => x !== id));
          setSelectedId(null);
        }}
      />
    </div>
  );
}
