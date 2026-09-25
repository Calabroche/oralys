"use client";

import { formatMinutes } from "@/lib/time";
import { AccessGate } from "@/components/team/Access";
import { Suspense, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Ban, CalendarDays, DoorOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, PageHeader, UserAvatar } from "@/components/team/shared";
import { SpecialtyPicker } from "@/components/team/SpecialtyPicker";
import { PersonLink } from "@/components/team/PersonSheet";
import Link from "next/link";
import {
  acteLabel,
  agendaLoad,
  DEFAULT_DAILY_OPEN_MINUTES,
  displayName,
  fullName,
  adjustTeamToNeed,
  isChairAssistant,
  isHealthProfessional,
  titularCoverage,
  shortDate,
  sortCandidates,
  suggestAssistants,
} from "@/lib/team";
import { COLLABORATIONS } from "@/data/teamMockData";
import { PraticienProfile, Priority } from "@/types/team";
import { Weekday } from "@/types";
import { WEEKDAYS, WEEKDAY_LABELS, addDays, startOfWeek, toISODate } from "@/utils/date";
import { VersionGate } from "@/components/team/Version";
import { cn } from "@/lib/utils";

export default function EquipesPage() {
  return (
    <VersionGate feature="equipes">
      <AccessGate access="equipes">
        <Suspense>
          <Equipes />
        </Suspense>
      </AccessGate>
    </VersionGate>
  );
}

function Equipes() {
  const params = useSearchParams();
  const { profiles, findUser, can, sessionUserId } = useTeam();
  // Gestionnaire (ou droit planning) : toutes les fiches. Praticien : seulement la sienne, qu'il règle lui-même.
  const manageAll = can("param.cabinet") || can("team.planning");
  const visible = profiles.filter((p) => findUser(p.praticienUserId) && (manageAll || p.praticienUserId === sessionUserId));
  const [selectedId, setSelectedId] = usePersistentState<string | null>("equipes-praticien", visible[0]?.id ?? null, params.get("praticien"));
  const [createOpen, setCreateOpen] = useState(false);
  const selected = visible.find((p) => p.id === selectedId) ?? visible[0];
  const canEdit = manageAll || selected?.praticienUserId === sessionUserId;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <PageHeader
        title="Praticiens & équipes"
        description="Fiche 360° par praticien : équipe rattachée et ordre de priorité, spécialités, disponibilités et affinités."
        actions={
          manageAll && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Nouveau profil praticien
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ul className="space-y-1">
          {visible.map((p) => {
            const u = findUser(p.praticienUserId)!;
            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                    selected?.id === p.id ? "bg-pink-50 ring-1 ring-pink-200" : "hover:bg-slate-50",
                    u.status === "archive" && "opacity-60"
                  )}
                >
                  <UserAvatar user={u} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.label}</div>
                    <div className="truncate text-xs text-slate-500">
                      {u.status === "archive" ? "Archivé" : u.specialties.map(acteLabel).join(", ") || "Spécialités à renseigner"}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {selected && <ProfileDetail key={selected.id} profile={selected} canEdit={canEdit} />}
      </div>
      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSelectedId} />
    </div>
  );
}

function ProfileDetail({ profile, canEdit }: { profile: PraticienProfile; canEdit: boolean }) {
  const { findUser, users, rdvs, absences, profiles, upsertProfile, updateUser, now } = useTeam();
  const praticien = findUser(profile.praticienUserId)!;
  const today = now();
  const weekStart = startOfWeek(today);
  const load = agendaLoad(praticien, toISODate(weekStart), toISODate(addDays(weekStart, 5)), rdvs);
  const upcoming = absences
    .filter((a) => a.status !== "refusee" && a.endDate >= toISODate(today) && (a.userId === praticien.id || profile.team.some((l) => l.userId === a.userId)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const team = [...profile.team].sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1));
  const addable = users.filter((u) => isChairAssistant(u) && u.status !== "archive" && !profile.team.some((l) => l.userId === u.id));
  const mainActe = praticien.specialties[0] ?? "soins";
  const affinity = sortCandidates(
    suggestAssistants({ praticienUserId: praticien.id, date: toISODate(today), acte: mainActe }, { users, profiles, absences, rdvs }),
    "affinite"
  ).sort((a, b) => b.score - a.score);

  function save(next: PraticienProfile, message?: string) {
    const res = upsertProfile(next);
    if (!res.ok) toast.error(res.error);
    else if (message) toast.success(message);
  }

  function renumber(list: PraticienProfile["team"]) {
    const counters: Record<Priority, number> = { titulaire: 0, backup: 0 };
    return list.map((l) => ({ ...l, rank: ++counters[l.priority] }));
  }

  function move(userId: string, dir: -1 | 1) {
    const idx = team.findIndex((l) => l.userId === userId);
    const swap = team[idx + dir];
    if (!swap || swap.priority !== team[idx].priority) return;
    const next = [...team];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    save({ ...profile, team: renumber(next) });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserAvatar user={praticien} className="size-14 text-lg" />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-3 text-xl">
                {displayName(praticien)}
                <span className="flex items-center gap-1 text-xs font-normal text-slate-500">
                  <DoorOpen className="size-3.5" /> {profile.rooms.join(", ") || "Salle non définie"}
                </span>
                <Link href={`/team/planning?view=personnes&user=${praticien.id}`} className="text-xs font-normal text-pink-700 hover:underline">
                  Planning →
                </Link>
                <Link href={`/team/remplacements?user=${praticien.id}`} className="text-xs font-normal text-pink-700 hover:underline">
                  Remplacements →
                </Link>
              </CardTitle>
              <div className="mt-2">
                <SpecialtyPicker
                  value={praticien.specialties}
                  disabled={!canEdit || praticien.status === "archive"}
                  onChange={(specialties) => {
                    const res = updateUser({ ...praticien, specialties });
                    if (res.ok) toast.success("Spécialités sauvegardées");
                    else toast.error(res.error);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase">Jours de travail</p>
            <div className="flex gap-1">
              {WEEKDAYS.map((d) => (
                <span key={d} className={cn("rounded px-1.5 py-0.5 text-xs", praticien.workDays.includes(d) ? "bg-pink-100 text-pink-900" : "bg-slate-50 text-slate-300")}>
                  {WEEKDAY_LABELS[d].slice(0, 2)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase">Remplissage de l&apos;agenda Soins cette semaine</p>
            <div className="flex items-center gap-2">
              <Progress value={load.ratio * 100} className="h-2" />
              <span className="shrink-0 text-sm font-medium whitespace-nowrap">{Math.round(load.ratio * 100)} %</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {load.booked} RDV, soit {formatMinutes(load.bookedMinutes)} de soins posés sur {formatMinutes(load.openMinutes)} d&apos;ouverture ({load.days} jours × {DEFAULT_DAILY_OPEN_MINUTES / 60} h). Plus c&apos;est haut, plus une absence touche de patients.
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase">Absences à venir (praticien + équipe)</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {upcoming.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-center gap-1.5">
                    <AbsenceBadge absence={a} compact /> {findUser(a.userId)?.firstName} · {shortDate(a.startDate)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Équipe rattachée</CardTitle>
          <CardDescription>Qui travaille habituellement avec {displayName(praticien)}, et dans quel ordre on appelle en cas d&apos;absence.</CardDescription>
          <CardAction className="flex items-center gap-2">
            <Select
              value={String(profile.assistantsNeeded ?? 1)}
              disabled={!canEdit}
              onValueChange={(v) => {
                const need = Number(v);
                const { team: adjusted, changes, stillMissing } = adjustTeamToNeed(profile, praticien, need, users);
                const res = upsertProfile({ ...profile, assistantsNeeded: need, team: adjusted });
                if (!res.ok) return toast.error(res.error);
                toast.success(need === 0 ? "Travaille sans assistant" : `Besoin : ${need} assistant${need > 1 ? "s" : ""} par jour`, {
                  description:
                    [changes.join(", "), stillMissing.length ? `Titulaire à pourvoir le ${stillMissing.map((d) => WEEKDAY_LABELS[d].toLowerCase()).join(", ")}` : ""]
                      .filter(Boolean)
                      .join(". ") || (need === 0 ? "L'équipe rattachée reste disponible en renfort." : "Équipe déjà dimensionnée."),
                });
              }}
            >
              <SelectTrigger size="sm" className="w-48" aria-label="Besoin en assistants par jour">
                <span>
                  {(profile.assistantsNeeded ?? 1) === 0
                    ? "Besoin : aucun assistant"
                    : `Besoin : ${profile.assistantsNeeded ?? 1} assistant${(profile.assistantsNeeded ?? 1) > 1 ? "s" : ""} / jour`}
                </span>
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "Aucun assistant (travaille seul)" : `${n} assistant${n > 1 ? "s" : ""} par jour`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && addable.length > 0 && (
              <Select
                value=""
                onValueChange={(id) => {
                  // Tant que le besoin n'est pas couvert, un nouvel assistant rattaché devient titulaire.
                  const need = profile.assistantsNeeded ?? 1;
                  const priority: Priority = titularCoverage(profile, praticien).some((c) => c.count < need) ? "titulaire" : "backup";
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
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {team.length === 0 && <p className="text-sm text-slate-400">Aucun assistant rattaché.</p>}
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
                    <div className="text-xs text-slate-500">{collab} RDV ensemble (12 mois, via Soins)</div>
                  </div>
                  <Select
                    value={l.priority}
                    disabled={!canEdit}
                    onValueChange={(v) =>
                      save({ ...profile, team: renumber(team.map((x) => (x.userId === l.userId ? { ...x, priority: v as Priority, rank: 99 } : x))) })
                    }
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
                    value={l.days}
                    onValueChange={(v) => save({ ...profile, team: team.map((x) => (x.userId === l.userId ? { ...x, days: v as Weekday[] } : x)) })}
                    aria-label="Jours du rattachement"
                  >
                    {WEEKDAYS.slice(0, 5).map((d) => (
                      <ToggleGroupItem key={d} value={d} className="px-2 text-xs data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                        {WEEKDAY_LABELS[d].slice(0, 2)}
                      </ToggleGroupItem>
                    ))}
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
          <TeamCoverage profile={profile} canEdit={canEdit} onSave={save} />
          <p className="mt-2 text-xs text-slate-500">
            <CalendarDays className="mr-1 inline size-3.5" />
            Jours vides = tous les jours travaillés. Ex. Dr Perche : Léa les lun/mar/jeu, Inès les mer/ven.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affinités avec les assistants</CardTitle>
          <CardDescription>
            Score calculé pour un acte de {acteLabel(mainActe).toLowerCase()}, à partir du déclaratif et de l&apos;historique réel de Soins.
          </CardDescription>
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
    </div>
  );
}

function CreateProfileDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { users, roles, profiles, upsertProfile } = useTeam();
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState<string>("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const eligible = users.filter((u) => u.status !== "archive" && isHealthProfessional(u, roles) && !profiles.some((p) => p.praticienUserId === u.id));

  function submit() {
    const id = `env-${Date.now().toString(36)}`;
    const res = upsertProfile({ id, praticienUserId: owner, label: label.trim() || "Nouveau profil", rooms: room ? [room] : [], team: [], feedback: {} });
    if (!res.ok) return setError(res.error);
    toast.success("Profil praticien créé", { description: "Environnement disponible dans Soins." });
    onCreated(id);
    onOpenChange(false);
    setLabel("");
    setOwner("");
    setRoom("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau profil praticien</DialogTitle>
          <DialogDescription>Un profil praticien (environnement Soins) doit toujours être rattaché à un utilisateur, sinon il serait inutilisable.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nom affiché</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Dr Prénom Nom" />
          </div>
          <div className="space-y-1.5">
            <Label>Utilisateur rattaché</Label>
            <Select value={owner} onValueChange={(v) => { setOwner(v); setError(null); }}>
              <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
                <SelectValue placeholder="Choisir un utilisateur praticien" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {fullName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligible.length === 0 && (
              <Alert variant="destructive" className="mt-2">
                <Ban />
                <AlertTitle>Aucun utilisateur disponible</AlertTitle>
                <AlertDescription>
                  Créez d&apos;abord l&apos;utilisateur avec un rôle de professionnel de santé (Administration → Utilisateurs). Son profil sera créé automatiquement.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Salle principale</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salle 4" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit}>Créer le profil</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Titulaires par jour vs besoin, avec un emplacement « à pourvoir » quand un jour n'est pas couvert. */
function TeamCoverage({
  profile,
  canEdit,
  onSave,
}: {
  profile: PraticienProfile;
  canEdit: boolean;
  onSave: (next: PraticienProfile, message?: string) => void;
}) {
  const { findUser, users } = useTeam();
  const praticien = findUser(profile.praticienUserId)!;
  const need = profile.assistantsNeeded ?? 1;
  const coverage = titularCoverage(profile, praticien);
  const missingDays = coverage.filter((c) => c.count < need).map((c) => c.day);
  const options = users.filter(
    (u) => isChairAssistant(u) && u.status !== "archive" && profile.team.find((l) => l.userId === u.id)?.priority !== "titulaire"
  );

  function fill(userId: string) {
    const existing = profile.team.find((l) => l.userId === userId);
    const team = existing
      ? profile.team.map((l) => (l.userId === userId ? { ...l, priority: "titulaire" as const, rank: 99 } : l))
      : [...profile.team, { userId, priority: "titulaire" as const, rank: 99, days: [] }];
    const counters = { titulaire: 0, backup: 0 };
    const renumbered = [...team]
      .sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1))
      .map((l) => ({ ...l, rank: ++counters[l.priority] }));
    onSave({ ...profile, team: renumbered }, `${findUser(userId)?.firstName} devient titulaire`);
  }

  if (need === 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Travaille sans assistant : aucun manque n&apos;est signalé dans le planning. L&apos;équipe rattachée reste disponible en renfort.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-slate-500">Titulaires par jour :</span>
        {coverage.map((c) => (
          <span
            key={c.day}
            className={cn(
              "rounded px-1.5 py-0.5 font-medium",
              c.count >= need ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            )}
          >
            {WEEKDAY_LABELS[c.day].slice(0, 2)} {c.count}/{need}
          </span>
        ))}
      </div>
      {missingDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-rose-300 bg-rose-50/50 px-3 py-2.5">
          <span className="flex-1 text-sm text-rose-800">
            Titulaire à pourvoir le {missingDays.map((d) => WEEKDAY_LABELS[d].toLowerCase()).join(", ")} (besoin : {need} par jour)
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
