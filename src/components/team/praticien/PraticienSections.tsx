"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Ban, CalendarDays, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SOINS_DEMO_PROFILE_ID, useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { PersonLink } from "@/components/team/PersonSheet";
import { useVersion } from "@/components/team/Version";
import { COLLABORATIONS } from "@/data/teamMockData";
import { activityTypes } from "@/data/mockData";
import { acteLabel, adjustTeamToNeed, displayName, fullName, isChairAssistant, sortCandidates, suggestAssistants, titularCoverage } from "@/lib/team";
import { HALVES, activitiesOf, activityName, dayPlan, needForActivity } from "@/lib/semaine";
import { PraticienProfile, Priority } from "@/types/team";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { WEEKDAYS, WEEKDAY_LABELS, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

function useSave() {
  const { upsertProfile } = useTeam();
  return (next: PraticienProfile, message?: string, description?: string) => {
    const res = upsertProfile(next);
    if (!res.ok) toast.error(res.error);
    else if (message) toast.success(message, description ? { description } : undefined);
  };
}

function renumber(list: PraticienProfile["team"]) {
  const counters: Record<Priority, number> = { titulaire: 0, backup: 0 };
  return [...list]
    .sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1))
    .map((l) => ({ ...l, rank: ++counters[l.priority] }));
}

const colorOf = (activityId: string) => ACTIVITY_COLOR_CLASSES[activityTypes.find((t) => t.id === activityId)?.color ?? "gray"];

/**
 * Semaine type (lue dans l'agenda Soins) et besoin en assistants par type d'activité.
 * Le besoin d'une demi-journée = le plus grand besoin des activités qui s'y trouvent.
 */
export function SemaineTypeCard({ profile, canEdit }: { profile: PraticienProfile; canEdit: boolean }) {
  const { findUser, users } = useTeam();
  const save = useSave();
  const praticien = findUser(profile.praticienUserId)!;
  const days = WEEKDAYS.filter((d) => d !== "samedi" || dayPlan(profile, praticien, d).length > 0);
  const activities = activitiesOf(profile);
  const isSoinsDemo = profile.id === SOINS_DEMO_PROFILE_ID;

  function setNeed(activityId: string, need: number) {
    const next = { ...profile, needsByActivity: { ...profile.needsByActivity, [activityId]: need } };
    const { team, changes, stillMissing } = adjustTeamToNeed(next, praticien, users);
    save(
      { ...next, team },
      `${activityName(activityId)} : ${need === 0 ? "sans assistant" : `${need} assistant${need > 1 ? "s" : ""}`}`,
      [changes.join(", "), stillMissing.length ? `Titulaire à pourvoir le ${stillMissing.map((d) => WEEKDAY_LABELS[d].toLowerCase()).join(", ")}` : ""]
        .filter(Boolean)
        .join(". ") || "Équipe déjà dimensionnée."
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jours de travail et besoin en assistants</CardTitle>
        <CardDescription>
          Les jours et demi-journées de travail viennent de la semaine type de l&apos;agenda Soins de {displayName(praticien)} : on les change dans Soins
          {isSoinsDemo ? "" : " (dans la démo, seul l'agenda de Dr Flore Perche est modifiable)"}. Le besoin se règle ici, par type d&apos;activité : une
          demi-journée demande le plus grand besoin de ses activités.
        </CardDescription>
        {isSoinsDemo && (
          <CardAction>
            <Button size="sm" variant="outline" asChild>
              <Link href="/reglages/agenda">
                Modifier dans Soins <ExternalLink />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {!profile.weekSlots?.length ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm text-slate-500">
              Pas encore de semaine type dans l&apos;agenda Soins : le besoin ci-contre s&apos;applique à tous ses jours de travail, réglés plus bas.
            </p>
            <Select
              value={String(profile.assistantsNeeded ?? 1)}
              disabled={!canEdit}
              onValueChange={(v) => {
                const next = { ...profile, assistantsNeeded: Number(v) };
                save({ ...next, team: adjustTeamToNeed(next, praticien, users).team }, "Besoin enregistré");
              }}
            >
              <SelectTrigger size="sm" className="w-44" aria-label="Besoin en assistants">
                <span>{(profile.assistantsNeeded ?? 1) === 0 ? "Aucun assistant" : `${profile.assistantsNeeded ?? 1} assistant${(profile.assistantsNeeded ?? 1) > 1 ? "s" : ""}`}</span>
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "Aucun assistant" : `${n} assistant${n > 1 ? "s" : ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-28" />
                  {days.map((d) => (
                    <th key={d} className="px-1 pb-1.5 text-center text-xs font-medium text-slate-500">
                      {WEEKDAY_LABELS[d]}
                    </th>
                  ))}
                </tr>
                {/* Présence du jour en clair : journée, matin, après-midi ou repos. */}
                <tr>
                  <th className="pr-2 pb-2 text-left text-xs font-normal text-slate-500">Travaille</th>
                  {days.map((d) => {
                    const halves = dayPlan(profile, praticien, d).map((p) => p.half);
                    const label = halves.length === 2 ? "Journée" : halves[0] === "matin" ? "Matin" : halves[0] === "apres_midi" ? "Après-midi" : "Repos";
                    return (
                      <th key={d} className="px-1 pb-2 text-center">
                        <span
                          className={cn(
                            "inline-block w-full rounded-md px-1.5 py-1 text-xs font-medium",
                            label === "Journée" && "bg-pink-100 text-pink-900",
                            (label === "Matin" || label === "Après-midi") && "border border-dashed border-pink-300 bg-pink-50 text-pink-900",
                            label === "Repos" && "bg-slate-50 text-slate-400"
                          )}
                        >
                          {label}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HALVES.map((half) => (
                  <tr key={half}>
                    <td className="pr-2 text-xs text-slate-500">{half === "matin" ? "Matin" : "Après-midi"}</td>
                    {days.map((d) => {
                      const plan = dayPlan(profile, praticien, d).find((p) => p.half === half);
                      return (
                        <td key={d} className="p-0.5 align-top">
                          {plan ? (
                            <div className="min-h-14 rounded-md border bg-white p-1.5">
                              <div className="flex flex-wrap gap-1">
                                {plan.activities.map((a) => (
                                  <span key={a} className={cn("rounded border px-1 text-[0.65rem] font-medium", colorOf(a).chip)}>
                                    {activityName(a)}
                                  </span>
                                ))}
                              </div>
                              <p className={cn("mt-1 text-[0.7rem]", plan.need === 0 ? "text-slate-400" : "font-medium text-slate-700")}>
                                {plan.need === 0 ? "Sans assistant" : `${plan.need} assistant${plan.need > 1 ? "s" : ""}`}
                              </p>
                            </div>
                          ) : (
                            <div className="min-h-14 rounded-md bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_3px,transparent_3px,transparent_7px)]" title="Ne consulte pas" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activities.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">Assistants nécessaires par activité</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {activities.map((a) => {
                const need = needForActivity(profile, a);
                return (
                  <li key={a} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <span className={cn("size-2.5 shrink-0 rounded-full", colorOf(a).dot)} />
                    <span className="flex-1 text-sm">{activityName(a)}</span>
                    <Select value={String(need)} disabled={!canEdit} onValueChange={(v) => setNeed(a, Number(v))}>
                      <SelectTrigger size="sm" className="w-40" aria-label={`Assistants pour ${activityName(a)}`}>
                        <span>{need === 0 ? "Aucun assistant" : `${need} assistant${need > 1 ? "s" : ""}`}</span>
                      </SelectTrigger>
                      <SelectContent position="popper" align="end">
                        {[0, 1, 2, 3].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 0 ? "Aucun assistant" : `${n} assistant${n > 1 ? "s" : ""}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Équipe rattachée : titulaires et back-ups dans l'ordre d'appel, et leurs jours avec le praticien. */
export function EquipeCard({ profile, canEdit }: { profile: PraticienProfile; canEdit: boolean }) {
  const { findUser, users } = useTeam();
  const { has } = useVersion();
  const save = useSave();
  const praticien = findUser(profile.praticienUserId)!;
  const team = renumber(profile.team);
  // Jours proposés : du lundi au vendredi, plus le samedi si le praticien consulte ce jour-là.
  const dayOptions = WEEKDAYS.filter((d) => d !== "samedi" || praticien.workDays.includes(d));
  const workDays = dayOptions.filter((d) => praticien.workDays.includes(d));
  const addable = users.filter((u) => isChairAssistant(u) && u.status !== "archive" && !profile.team.some((l) => l.userId === u.id));

  function move(userId: string, dir: -1 | 1) {
    const idx = team.findIndex((l) => l.userId === userId);
    const swap = team[idx + dir];
    if (!swap || swap.priority !== team[idx].priority) return;
    const next = [...team];
    [next[idx], next[idx + dir]] = [{ ...next[idx + dir], rank: next[idx].rank }, { ...next[idx], rank: next[idx + dir].rank }];
    save({ ...profile, team: renumber(next) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipe rattachée</CardTitle>
        <CardDescription>Qui travaille habituellement avec {displayName(praticien)}, et dans quel ordre on appelle en cas d&apos;absence.</CardDescription>
        {canEdit && addable.length > 0 && (
          <CardAction>
            <Select
              value=""
              onValueChange={(id) => {
                // Tant que le besoin n'est pas couvert, un nouvel assistant rattaché devient titulaire.
                const priority: Priority = titularCoverage(profile, praticien).some((c) => c.count < c.need) ? "titulaire" : "backup";
                save(
                  { ...profile, team: renumber([...team, { userId: id, priority, rank: 99, days: [] }]) },
                  `${fullName(findUser(id)!)} ajouté(e) en ${priority === "titulaire" ? "titulaire" : "back-up"}`
                );
              }}
            >
              <SelectTrigger size="sm" className="w-52">
                <SelectValue placeholder="+ Rattacher un assistant" />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {addable.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {fullName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {team.length === 0 && <p className="text-sm text-slate-400">Aucun assistant rattaché.</p>}
        {team.length > 0 && (
          <div className="mb-1.5 flex items-end justify-end gap-3 pr-3 text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">
            <span className="w-36">Priorité</span>
            <span style={{ width: `${dayOptions.length * 2.6}rem` }}>Jours avec {displayName(praticien)}</span>
            {canEdit && <span className="w-8" />}
          </div>
        )}
        <ul className="divide-y rounded-lg border">
          {team.map((l, i) => {
            const u = findUser(l.userId);
            if (!u) return null;
            const collab = COLLABORATIONS.find((c) => c.praticienUserId === praticien.id && c.assistantUserId === u.id)?.count ?? 0;
            return (
              <li key={l.userId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon-xs" disabled={!canEdit || team[i - 1]?.priority !== l.priority} onClick={() => move(l.userId, -1)} aria-label="Monter">
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-xs" disabled={!canEdit || team[i + 1]?.priority !== l.priority} onClick={() => move(l.userId, 1)} aria-label="Descendre">
                    <ArrowDown />
                  </Button>
                </div>
                <UserAvatar user={u} />
                <div className="min-w-40 flex-1">
                  <PersonLink userId={u.id} className="block text-sm font-medium">
                    {fullName(u)}
                  </PersonLink>
                  {has("affinite") && <div className="text-xs text-slate-500">{collab} RDV ensemble (12 mois, via Soins)</div>}
                </div>
                <Select
                  value={l.priority}
                  disabled={!canEdit}
                  onValueChange={(v) => save({ ...profile, team: renumber(team.map((x) => (x.userId === l.userId ? { ...x, priority: v as Priority, rank: 99 } : x))) })}
                >
                  <SelectTrigger size="sm" className="w-36">
                    <span>
                      {l.priority === "titulaire" ? "Titulaire" : "Back-up"} n°{l.rank}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="titulaire">Titulaire</SelectItem>
                    <SelectItem value="backup">Back-up</SelectItem>
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="multiple"
                  size="sm"
                  variant="outline"
                  disabled={!canEdit}
                  // Ce qui est coché est ce qui compte : « tous ses jours » s'affiche tous cochés (et suit la semaine type du praticien).
                  value={l.days.length ? l.days.filter((d) => workDays.includes(d)) : workDays}
                  onValueChange={(v) => {
                    const days = workDays.filter((d) => v.includes(d));
                    if (days.length === 0) {
                      toast("Au moins un jour", { description: `Pour ne plus rattacher ${fullName(u)}, utilisez la croix à droite.` });
                      return;
                    }
                    save({ ...profile, team: team.map((x) => (x.userId === l.userId ? { ...x, days: days.length === workDays.length ? [] : days } : x)) });
                  }}
                  aria-label="Jours du rattachement"
                >
                  {dayOptions.map((d) => {
                    const off = !praticien.workDays.includes(d);
                    return (
                      <ToggleGroupItem
                        key={d}
                        value={d}
                        disabled={off}
                        title={
                          off
                            ? `${displayName(praticien)} ne consulte pas le ${WEEKDAY_LABELS[d].toLowerCase()}`
                            : `${WEEKDAY_LABELS[d]} avec ${displayName(praticien)} : cliquer pour cocher ou décocher`
                        }
                        className={cn(
                          "w-9 px-0 text-xs text-slate-400 data-[state=on]:border-pink-300 data-[state=on]:bg-pink-100 data-[state=on]:font-medium data-[state=on]:text-pink-900",
                          off && "bg-slate-50 text-slate-300 line-through opacity-100"
                        )}
                      >
                        {WEEKDAY_LABELS[d].slice(0, 2)}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Retirer"
                    onClick={() => save({ ...profile, team: renumber(team.filter((x) => x.userId !== l.userId)) }, `${fullName(u)} retiré(e) de l'équipe`)}
                  >
                    <X />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <TeamCoverage profile={profile} canEdit={canEdit} />
        <p className="mt-2 text-xs text-slate-500">
          <CalendarDays className="mr-1 inline size-3.5" />
          Jours en rose : la personne travaille avec {displayName(praticien)} ce jour-là. Cliquez pour ajouter ou retirer un jour. Jours barrés :{" "}
          {displayName(praticien)} ne consulte pas.
        </p>
      </CardContent>
    </Card>
  );
}

/** Titulaires par jour face au plus grand besoin du jour, avec un emplacement « à pourvoir » quand un jour n'est pas couvert. */
function TeamCoverage({ profile, canEdit }: { profile: PraticienProfile; canEdit: boolean }) {
  const { findUser, users } = useTeam();
  const save = useSave();
  const praticien = findUser(profile.praticienUserId)!;
  const coverage = titularCoverage(profile, praticien).filter((c) => c.need > 0);
  const missing = coverage.filter((c) => c.count < c.need);
  const options = users.filter((u) => isChairAssistant(u) && u.status !== "archive" && profile.team.find((l) => l.userId === u.id)?.priority !== "titulaire");

  function fill(userId: string) {
    const existing = profile.team.find((l) => l.userId === userId);
    const team = existing
      ? profile.team.map((l) => (l.userId === userId ? { ...l, priority: "titulaire" as const, rank: 99 } : l))
      : [...profile.team, { userId, priority: "titulaire" as const, rank: 99, days: [] }];
    save({ ...profile, team: renumber(team) }, `${findUser(userId)?.firstName} devient titulaire`);
  }

  if (coverage.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Travaille sans assistant : aucun manque n&apos;est signalé dans le planning. L&apos;équipe rattachée reste disponible en renfort.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-slate-500">Titulaires prévus / plus grand besoin du jour :</span>
        {coverage.map((c) => (
          <span key={c.day} className={cn("rounded px-1.5 py-0.5 font-medium", c.count >= c.need ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200")}>
            {WEEKDAY_LABELS[c.day].slice(0, 2)} {c.count}/{c.need}
          </span>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-rose-300 bg-rose-50/50 px-3 py-2.5">
          <span className="flex-1 text-sm text-rose-800">
            Titulaire à pourvoir le {missing.map((c) => `${WEEKDAY_LABELS[c.day].toLowerCase()} (${c.need})`).join(", ")}
          </span>
          {canEdit && options.length > 0 && (
            <Select value="" onValueChange={fill}>
              <SelectTrigger size="sm" className="w-56 bg-white">
                <SelectValue placeholder="Choisir un assistant" />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {options.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {fullName(u)}
                    {profile.team.some((l) => l.userId === u.id) ? " (back-up)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

/** Affinités (V1) : score calculé pour l'acte principal du praticien. */
export function AffinitesCard({ profile }: { profile: PraticienProfile }) {
  const { findUser, users, rdvs, absences, profiles, now } = useTeam();
  const praticien = findUser(profile.praticienUserId)!;
  const mainActe = praticien.specialties[0] ?? "soins";
  const affinity = sortCandidates(
    suggestAssistants({ praticienUserId: praticien.id, date: toISODate(now()), acte: mainActe }, { users, profiles, absences, rdvs }),
    "affinite"
  ).sort((a, b) => b.score - a.score);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affinités avec les assistants</CardTitle>
        <CardDescription>Score calculé pour un acte de {acteLabel(mainActe).toLowerCase()}, à partir du déclaratif et de l&apos;historique réel de Soins.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {affinity.map((c) => (
            <li key={c.user.id} className="flex items-center gap-3 text-sm">
              <span className="w-36 truncate">{fullName(c.user)}</span>
              <Progress value={c.score} className="h-2 flex-1" />
              <span className="w-14 text-right font-medium">{c.score}/100</span>
              <span className="w-44 truncate text-xs text-slate-500">
                {c.parts.find((p) => p.label === "Préférences relationnelles" && p.points < 0) ? (
                  <span className="flex items-center gap-1 text-rose-600">
                    <Ban className="size-3" /> Préférence de ne pas travailler ensemble
                  </span>
                ) : (
                  c.tierLabel
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
