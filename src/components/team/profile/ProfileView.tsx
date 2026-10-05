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
import { PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { SpecialtyPicker } from "@/components/team/SpecialtyPicker";
import { ContractHoursField, HoursEditor, WorkScheduleEditor } from "@/components/team/WorkSchedule";
import { daysFromHours, effectiveHours, rangesError } from "@/lib/horaires";
import { WEEKDAYS } from "@/utils/date";
import { PersonAbsences } from "@/components/team/PersonAbsences";
import { AffinitesCard, EquipeCard, SemaineTypeCard } from "@/components/team/praticien/PraticienSections";
import { CongesPayesCard, ContratCard, DocumentsCard, DpcCard, MissionsCard, RappelsCard, SalaryCard } from "@/components/team/profile/RHSections";
import { useVersion } from "@/components/team/Version";
import { ACTES, SKILLS } from "@/data/teamMockData";
import { displayName, fullName, isHealthProfessional } from "@/lib/team";
import { ActeCategory, SkillId, TeamUser } from "@/types/team";
import { toISODate } from "@/utils/date";

/**
 * Profil d'une personne, au même endroit pour tout le monde : identité, jours de travail, absences.
 * Pour un praticien, on y trouve aussi sa semaine type, son besoin en assistants par activité et son équipe rattachée.
 * Chacun règle son propre profil ; gestionnaire et planning règlent ceux des autres.
 */
export function ProfileView({ user }: { user: TeamUser }) {
  const { updateUser, users, profiles, roles, can, sessionUserId, upsertProfile, now } = useTeam();
  const { has } = useVersion();
  const [draft, setDraft] = useState(user);
  const [declareOpen, setDeclareOpen] = useState(false);
  const self = user.id === sessionUserId;
  // Les praticiens sont libéraux : ni horaires, ni pointage.
  const liberal = user.roleIds.includes("role-praticien");
  const manager = can("param.cabinet") || can("team.planning");
  const canEdit = self || manager;
  // RH : réglée par le gestionnaire (pas le planning seul) ; rémunération aussi par le comptable.
  const canEditRH = can("param.cabinet");
  const canSeeSalary = self || can("param.cabinet") || can("compta");
  const canEditSalary = can("param.cabinet") || can("compta");
  const profile = profiles.find((p) => p.praticienUserId === user.id);
  const full = has("profil") && self;
  const dirty = JSON.stringify(draft) !== JSON.stringify(user);
  const colleagues = users.filter((u) => u.status === "actif" && u.id !== user.id && u.poste !== user.poste && (u.poste === "praticien" || u.poste === "assistant"));
  const today = toISODate(now());
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
            {(user.rpps || user.numeroAM) && (
              <p className="text-xs text-slate-500 tabular-nums">
                {user.rpps && `RPPS ${user.rpps}`}
                {user.rpps && user.numeroAM && " · "}
                {user.numeroAM && `N° Assurance Maladie ${user.numeroAM}`}
              </p>
            )}
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

      {/* Missions : seulement pour les salariés, un praticien libéral n'a pas de fiche de poste. */}
      {!liberal && <MissionsCard user={user} canEdit={canEditRH} />}

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

      {/* Praticien libéral : pas de salaire versé par le cabinet. */}
      {!liberal && <SalaryCard user={user} canSee={canSeeSalary} canEdit={canEditSalary} />}
      <RappelsCard user={user} canEdit={canEditRH} medecineOnly={liberal} />
      {!liberal && <ContratCard user={user} canEdit={canEditRH} />}
      {!liberal && <CongesPayesCard user={user} canEdit={canEditRH} />}
      {profile && <DpcCard user={user} canEdit={canEditRH} />}
      <DocumentsCard user={user} canAdd={self || canEditRH} canManage={canEditRH} />

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

      <Card>
        <CardHeader>
          <CardTitle>{self ? "Mes absences" : "Absences"}</CardTitle>
          <CardDescription>
            {liberal
              ? "Congés, maladie, formation et autres absences. Cliquer une absence pour la voir en détail, la modifier ou l'annuler."
              : "Maladie, formation et autres absences, hors congés (à retrouver dans la carte Congés payés). Cliquer une absence pour la voir en détail, la modifier ou l'annuler."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Un praticien n'a pas de carte Congés payés : ses congés restent ici avec le reste. */}
          <PersonAbsences userId={user.id} types={liberal ? undefined : ["maladie", "formation", "autre"]} />
        </CardContent>
      </Card>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} prefill={self ? undefined : { userId: user.id, date: today }} />
    </div>
  );
}
