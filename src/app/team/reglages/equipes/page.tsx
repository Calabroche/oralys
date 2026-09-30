"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Pencil, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessGate } from "@/components/team/Access";
import { PageHeader, UserAvatar } from "@/components/team/shared";
import { PersonLink } from "@/components/team/PersonSheet";
import { EquipeCard } from "@/components/team/praticien/PraticienSections";
import { ContractHoursField, HoursEditor } from "@/components/team/WorkSchedule";
import { useTeam } from "@/context/TeamDataContext";
import { displayName, fullName, isChairAssistant, primaryRoleId, ROLE_GROUP_LABELS, ROLE_ORDER, titularCoverage } from "@/lib/team";
import { dayPlan, needSummary } from "@/lib/semaine";
import { daysFromHours, dayMinutes, effectiveHours, hoursLabel, rangesError, weekMinutes } from "@/lib/horaires";
import { PraticienProfile, TeamUser, WeekHours } from "@/types/team";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Vue d'ensemble pour la gestionnaire : les équipes de tous les praticiens et les disponibilités
 * de tous les collaborateurs, modifiables sur place (sans ouvrir chaque profil un par un).
 */
export default function EquipesEtDisposPage() {
  return (
    <AccessGate access="planning">
      <EquipesEtDispos />
    </AccessGate>
  );
}

function EquipesEtDispos() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipes et disponibilités"
        description="Les équipes de chaque praticien et les horaires de chaque collaborateur, au même endroit. Tout se modifie ici."
      />
      <Tabs defaultValue="equipes">
        <TabsList variant="line">
          <TabsTrigger value="equipes">Équipes des praticiens</TabsTrigger>
          <TabsTrigger value="dispos">Disponibilités des collaborateurs</TabsTrigger>
        </TabsList>
        <TabsContent value="equipes" className="mt-4">
          <TeamsOverview />
        </TabsContent>
        <TabsContent value="dispos" className="mt-4">
          <AvailabilityOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamsOverview() {
  const { profiles, users, findUser } = useTeam();
  const [editing, setEditing] = useState<string | null>(null);
  const active = profiles.filter((p) => findUser(p.praticienUserId)?.status === "actif");
  const current = active.find((p) => p.id === editing);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {active.map((p) => (
          <TeamCard key={p.id} profile={p} users={users} onEdit={() => setEditing(p.id)} />
        ))}
      </div>
      <Dialog open={Boolean(current)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>Équipe de {displayName(findUser(current.praticienUserId)!)}</DialogTitle>
                <DialogDescription>Titulaires et back-ups, dans l&apos;ordre d&apos;appel, et leurs jours avec le praticien. Les changements sont enregistrés au fur et à mesure.</DialogDescription>
              </DialogHeader>
              <EquipeCard profile={current} canEdit />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamCard({ profile, users, onEdit }: { profile: PraticienProfile; users: TeamUser[]; onEdit: () => void }) {
  const praticien = users.find((u) => u.id === profile.praticienUserId)!;
  const byRank = (a: { rank: number }, b: { rank: number }) => a.rank - b.rank;
  const chair = profile.team.filter((l) => users.some((u) => u.id === l.userId && u.status === "actif" && isChairAssistant(u)));
  const titulaires = chair.filter((l) => l.priority === "titulaire").sort(byRank);
  const backups = chair.filter((l) => l.priority === "backup").sort(byRank);
  const missing = titularCoverage(profile, praticien, users).filter((c) => c.count < c.need);
  const name = (id: string) => users.find((u) => u.id === id)?.firstName ?? "?";
  const days = (d: string[]) => (d.length ? ` (${d.map((x) => x.slice(0, 3)).join(", ")})` : "");
  const presence = WEEKDAYS.map((d) => {
    const halves = dayPlan(profile, praticien, d).map((p) => p.half);
    return halves.length === 2 ? WEEKDAY_LABELS[d].slice(0, 3) : halves.length === 1 ? `${WEEKDAY_LABELS[d].slice(0, 3)} ${halves[0] === "matin" ? "matin" : "aprèm"}` : null;
  }).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserAvatar user={praticien} className="size-7 text-[0.65rem]" />
          <PersonLink userId={praticien.id}>{displayName(praticien)}</PersonLink>
        </CardTitle>
        <CardDescription>
          {needSummary(profile)} · consulte {presence.join(", ") || "pas de semaine type"}
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={onEdit}>
            <Users /> Gérer l&apos;équipe
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-emerald-700">Titulaires : </span>
          {titulaires.map((l) => `${name(l.userId)}${days(l.days)}`).join(", ") || "aucun"}
        </p>
        <p>
          <span className="font-medium text-sky-700">Back-ups : </span>
          {backups.map((l) => name(l.userId)).join(", ") || "aucun"}
        </p>
        {missing.length > 0 ? (
          <p className="flex items-start gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-rose-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Titulaire à pourvoir le {missing.map((c) => `${WEEKDAY_LABELS[c.day].toLowerCase()} (${c.count}/${c.need})`).join(", ")}
          </p>
        ) : (
          <p className="text-emerald-700">Chaque jour de consultation a assez de titulaires.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AvailabilityOverview() {
  const { users, profiles, findUser } = useTeam();
  const [editing, setEditing] = useState<string | null>(null);
  const active = users.filter((u) => u.status === "actif");
  const collaborators = active
    .filter((u) => !u.roleIds.includes("role-praticien"))
    .sort((a, b) => ROLE_ORDER.indexOf(primaryRoleId(a)) - ROLE_ORDER.indexOf(primaryRoleId(b)) || a.lastName.localeCompare(b.lastName));
  const praticiens = active.filter((u) => u.roleIds.includes("role-praticien"));
  const current = users.find((u) => u.id === editing);
  const rattachement = (u: TeamUser) => {
    const p = profiles.find((x) => x.id === u.defaultEnvironmentId);
    return p ? displayName(findUser(p.praticienUserId)!) : "—";
  };

  return (
    <div className="space-y-6">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Collaborateurs</CardTitle>
          <CardDescription>Horaires habituels de chacun. Ils disent au planning qui est là, et quand.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs uppercase">
                <TableHead>Collaborateur</TableHead>
                <TableHead>Praticien de rattachement</TableHead>
                {WEEKDAYS.map((d) => (
                  <TableHead key={d} className="text-center">
                    {WEEKDAY_LABELS[d].slice(0, 3)}
                  </TableHead>
                ))}
                <TableHead className="text-right">Semaine</TableHead>
                <TableHead className="text-right">Contrat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map((u) => {
                const hours = effectiveHours(u);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar user={u} className="size-7 text-[0.65rem]" />
                        <div className="min-w-0">
                          <PersonLink userId={u.id} className="block font-medium">
                            {fullName(u)}
                          </PersonLink>
                          <span className="text-xs text-slate-500">{ROLE_GROUP_LABELS[primaryRoleId(u)]}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{rattachement(u)}</TableCell>
                    {WEEKDAYS.map((d) => {
                      const ranges = hours[d] ?? [];
                      return (
                        <TableCell key={d} className="px-1 text-center">
                          {ranges.length ? (
                            <span className="inline-block rounded-md bg-pink-50 px-1.5 py-1 text-[0.7rem] leading-tight text-pink-900 tabular-nums" title={`${hoursLabel(dayMinutes(ranges))}`}>
                              {ranges.map((r) => (
                                <span key={r.start} className="block whitespace-nowrap">
                                  {r.start}–{r.end}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">Repos</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium tabular-nums">
                      {hoursLabel(weekMinutes(hours))}
                      {!u.schedule && <span className="block text-[0.65rem] font-normal text-amber-700">par défaut</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.weeklyHours !== undefined ? (
                        <span className={cn(weekMinutes(hours) === u.weeklyHours * 60 ? "text-emerald-700" : "text-amber-700")}>{u.weeklyHours} h</span>
                      ) : (
                        <span className="text-xs text-slate-400">à saisir</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditing(u.id)}>
                        <Pencil /> Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Praticiens</CardTitle>
          <CardDescription>Libéraux : pas d&apos;horaires. Leurs demi-journées de consultation viennent de leur semaine type Soins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {praticiens.map((u) => {
            const p = profiles.find((x) => x.praticienUserId === u.id);
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 text-sm">
                <UserAvatar user={u} className="size-7 text-[0.65rem]" />
                <PersonLink userId={u.id} className="w-40 font-medium">
                  {displayName(u)}
                </PersonLink>
                <div className="flex flex-1 flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const halves = p ? dayPlan(p, u, d).map((x) => x.half) : [];
                    const label = halves.length === 2 ? "Journée" : halves[0] === "matin" ? "Matin" : halves[0] === "apres_midi" ? "Aprèm" : null;
                    return (
                      <span key={d} className={cn("rounded-md px-2 py-0.5 text-xs", label ? "bg-pink-50 text-pink-900" : "bg-slate-50 text-slate-300")}>
                        {WEEKDAY_LABELS[d].slice(0, 3)} {label ?? "repos"}
                      </span>
                    );
                  })}
                </div>
                {p && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/reglages/agenda?praticien=${p.id}&nom=${encodeURIComponent(displayName(u))}`}>
                      Modifier dans Soins <ExternalLink />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {current && <HoursDialog key={current.id} user={current} onClose={() => setEditing(null)} />}
    </div>
  );
}

function HoursDialog({ user, onClose }: { user: TeamUser; onClose: () => void }) {
  const { updateUser } = useTeam();
  const [hours, setHours] = useState<WeekHours>(() => user.schedule ?? effectiveHours(user));
  const [contract, setContract] = useState<number | undefined>(user.weeklyHours);
  const invalid = WEEKDAYS.some((d) => rangesError(hours[d]));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Horaires de {fullName(user)}</DialogTitle>
          <DialogDescription>Plages de travail habituelles, jour par jour. Le planning en déduit qui est là le matin, l&apos;après-midi ou toute la journée.</DialogDescription>
        </DialogHeader>
        <ContractHoursField id="dialog-contract-hours" value={contract} onChange={setContract} />
        <HoursEditor value={hours} onChange={setHours} contractHours={contract} />
        <DialogFooter>
          <Badge variant="outline" className="mr-auto">
            {ROLE_GROUP_LABELS[primaryRoleId(user)]}
          </Badge>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              const res = updateUser({ ...user, schedule: hours, weeklyHours: contract, ...daysFromHours(hours) });
              if (!res.ok) return toast.error(res.error);
              toast.success(`Horaires de ${user.firstName} enregistrés`, { description: `${hoursLabel(weekMinutes(hours))} par semaine.` });
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
