"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus, DoorOpen, EyeOff, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { SpecialtyPicker } from "@/components/team/SpecialtyPicker";
import { ContractHoursField, HoursEditor, WorkScheduleEditor } from "@/components/team/WorkSchedule";
import { daysFromHours, effectiveHours, rangesError } from "@/lib/horaires";
import { WEEKDAYS } from "@/utils/date";
import { AbsenceDocuments } from "@/components/team/Justificatifs";
import { AffinitesCard, EquipeCard, SemaineTypeCard } from "@/components/team/praticien/PraticienSections";
import { useVersion } from "@/components/team/Version";
import { ACTES, SKILLS } from "@/data/teamMockData";
import { displayName, fullName, isHealthProfessional, shortDate } from "@/lib/team";
import { ActeCategory, SkillId, TeamUser } from "@/types/team";
import { toISODate } from "@/utils/date";

/**
 * Profil d'une personne, au même endroit pour tout le monde : identité, jours de travail, absences.
 * Pour un praticien, on y trouve aussi sa semaine type, son besoin en assistants par activité et son équipe rattachée.
 * Chacun règle son propre profil ; gestionnaire et planning règlent ceux des autres.
 */
export function ProfileView({ user }: { user: TeamUser }) {
  const { updateUser, users, absences, profiles, roles, can, sessionUserId, upsertProfile, now } = useTeam();
  const { has } = useVersion();
  const [draft, setDraft] = useState(user);
  const [declareOpen, setDeclareOpen] = useState(false);
  const self = user.id === sessionUserId;
  // Les praticiens sont libéraux : ni horaires, ni pointage.
  const liberal = user.roleIds.includes("role-praticien");
  const manager = can("param.cabinet") || can("team.planning");
  const canEdit = self || manager;
  const profile = profiles.find((p) => p.praticienUserId === user.id);
  const full = has("profil") && self;
  const dirty = JSON.stringify(draft) !== JSON.stringify(user);
  const colleagues = users.filter((u) => u.status === "actif" && u.id !== user.id && u.poste !== user.poste && (u.poste === "praticien" || u.poste === "assistant"));
  const today = toISODate(now());
  // Pour un praticien, on montre aussi les absences à venir de son équipe (utile pour anticiper).
  const teamIds = new Set([user.id, ...(profile?.team.map((l) => l.userId) ?? [])]);
  const upcoming = absences
    .filter((a) => teamIds.has(a.userId) && a.status !== "refusee" && (a.userId === user.id || a.endDate >= today))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  function createPraticienProfile() {
    const res = upsertProfile({ id: `env-${Date.now().toString(36)}`, praticienUserId: user.id, label: displayName(user), rooms: [], team: [], feedback: {} });
    if (res.ok) toast.success("Fiche praticien créée", { description: "Environnement disponible dans Soins." });
    else toast.error(res.error);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-8 py-8">
      <PageHeader
        title={self ? "Mon profil" : displayName(user)}
        description={
          profile
            ? "Jours de travail, besoin en assistants et équipe rattachée : tout ce qui concerne le praticien au même endroit."
            : "Les jours de travail alimentent le planning et le calcul des équipes."
        }
        actions={
          <>
            {(self || can("team.planning")) && (
              <Button variant="outline" onClick={() => setDeclareOpen(true)}>
                <CalendarPlus /> Déclarer une absence
              </Button>
            )}
            {canEdit && (!profile || full) && (
              <Button
                disabled={!dirty || WEEKDAYS.some((d) => rangesError(draft.schedule?.[d]))}
                onClick={() => {
                  const res = updateUser(draft);
                  if (res.ok) toast.success("Profil enregistré");
                  else toast.error(res.error);
                }}
              >
                Enregistrer
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <UserAvatar user={user} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-3 text-lg font-medium">
              {fullName(user)}
              {profile && (
                <span className="flex items-center gap-1 text-xs font-normal text-slate-500">
                  <DoorOpen className="size-3.5" /> {profile.rooms.join(", ") || "Salle non définie"}
                </span>
              )}
              <Link href={`/team/planning?view=${profile ? "binomes" : "personnes"}&user=${user.id}`} className="text-xs font-normal text-pink-700 hover:underline">
                Voir dans le planning →
              </Link>
            </p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1.5">
              <RoleBadges user={user} />
            </div>
            {profile && (
              <div className="mt-3">
                <SpecialtyPicker
                  value={user.specialties}
                  disabled={!canEdit || user.status === "archive"}
                  onChange={(specialties) => {
                    const res = updateUser({ ...user, specialties });
                    if (res.ok) toast.success("Spécialités sauvegardées");
                    else toast.error(res.error);
                  }}
                />
              </div>
            )}
          </div>
          {!profile && manager && isHealthProfessional(user, roles) && user.status !== "archive" && (
            <Button variant="outline" onClick={createPraticienProfile}>
              <Stethoscope /> Créer la fiche praticien
            </Button>
          )}
        </CardContent>
      </Card>

      {profile && <SemaineTypeCard profile={profile} canEdit={canEdit} />}

      {!profile && (
        <Card>
          <CardHeader>
            <CardTitle>{liberal ? "Jours de présence" : "Horaires de travail habituels"}</CardTitle>
            <CardDescription>
              {liberal ? (
                "Praticien libéral : pas d'horaires ni de pointage, seulement les demi-journées où il consulte."
              ) : (
                <>
                  Les plages de chaque jour (ex. 08:30 → 12:30 puis 14:00 → 17:00). Elles disent au planning qui est là le matin, l&apos;après-midi ou toute
                  la journée, et servent de référence pour les heures pointées.
                  {!user.schedule && " Horaires proposés par défaut à partir des jours de travail : ajustez-les puis enregistrez."}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liberal ? (
              // Praticien libéral : pas d'horaires ni de pointage, seulement ses demi-journées de présence.
              <WorkScheduleEditor value={draft} disabled={!canEdit} onChange={(v) => setDraft({ ...draft, ...v })} />
            ) : (
              <div className="space-y-3">
                {/* Le contrat est une donnée RH : seul le gestionnaire le modifie, chacun le voit. */}
                <ContractHoursField value={draft.weeklyHours} disabled={!can("param.cabinet")} onChange={(weeklyHours) => setDraft({ ...draft, weeklyHours })} />
                <HoursEditor
                  value={draft.schedule ?? effectiveHours(draft)}
                  disabled={!canEdit}
                  contractHours={draft.weeklyHours}
                  onChange={(schedule) => setDraft({ ...draft, schedule, ...daysFromHours(schedule) })}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profile && <EquipeCard profile={profile} canEdit={canEdit} />}
      {profile && has("affinite") && <AffinitesCard profile={profile} />}

      {full && (
        <>
          {!profile && (
            <Card>
              <CardHeader>
                <CardTitle>Types d&apos;actes préférés</CardTitle>
                <CardDescription>Utilisé par le score d&apos;affinité (ex. implantologie plutôt que pédodontie).</CardDescription>
              </CardHeader>
              <CardContent>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  className="flex-wrap"
                  value={draft.preferredActs}
                  onValueChange={(v) => setDraft({ ...draft, preferredActs: v as ActeCategory[] })}
                >
                  {ACTES.map((a) => (
                    <ToggleGroupItem key={a.id} value={a.id} className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                      {a.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Habilitations</CardTitle>
              <CardDescription>
                {can("param.cabinet") ? "Modifiables par un gestionnaire." : "Renseignées par le gestionnaire (justificatif requis)."} Limitent les remplacements aux
                personnes qualifiées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup
                type="multiple"
                variant="outline"
                className="flex-wrap"
                disabled={!can("param.cabinet")}
                value={draft.skills}
                onValueChange={(v) => setDraft({ ...draft, skills: v as SkillId[] })}
              >
                {SKILLS.map((s) => (
                  <ToggleGroupItem key={s.id} value={s.id} className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                    {s.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CardContent>
          </Card>

          {colleagues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Préférences d&apos;équipe{" "}
                  <Badge variant="outline">
                    <EyeOff /> Confidentiel
                  </Badge>
                </CardTitle>
                <CardDescription>Visible uniquement par vous et le gestionnaire. Pris en compte discrètement dans les suggestions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {colleagues.map((c) => {
                    const value = draft.prefersWith.includes(c.id) ? "prefer" : draft.avoidsWith.includes(c.id) ? "avoid" : "neutral";
                    return (
                      <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{fullName(c)}</span>
                        <ToggleGroup
                          type="single"
                          size="sm"
                          variant="outline"
                          value={value}
                          onValueChange={(v) => {
                            if (!v) return;
                            const prefersWith = draft.prefersWith.filter((x) => x !== c.id);
                            const avoidsWith = draft.avoidsWith.filter((x) => x !== c.id);
                            if (v === "prefer") prefersWith.push(c.id);
                            if (v === "avoid") avoidsWith.push(c.id);
                            setDraft({ ...draft, prefersWith, avoidsWith });
                          }}
                        >
                          <ToggleGroupItem value="prefer" className="px-2.5 text-xs">
                            De préférence
                          </ToggleGroupItem>
                          <ToggleGroupItem value="neutral" className="px-2.5 text-xs">
                            Neutre
                          </ToggleGroupItem>
                          <ToggleGroupItem value="avoid" className="px-2.5 text-xs">
                            Plutôt éviter
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pas de liste d'absences sur un profil praticien : elles se suivent dans le planning. */}
      {!profile && (
      <Card>
        <CardHeader>
          <CardTitle>{self ? "Mes absences" : "Absences"}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune absence déclarée.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-y-1.5 py-2 text-sm">
                  <span>
                    {shortDate(a.startDate)} → {shortDate(a.endDate)}
                  </span>
                  <span className="flex items-center gap-2">
                    <AbsenceBadge absence={a} />
                    <span className="text-xs text-slate-500">{a.status === "validee" ? "Validée" : a.status === "demandee" ? "En attente" : "Refusée"}</span>
                  </span>
                  {/* Justificatifs (donnée de santé) : seulement pour la personne concernée et le gestionnaire. */}
                  {(a.userId === sessionUserId || manager) && (
                    <AbsenceDocuments absence={a} canEdit={a.userId === sessionUserId || manager} className="basis-full" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      )}
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} prefill={self ? undefined : { userId: user.id, date: today }} />
    </div>
  );
}
