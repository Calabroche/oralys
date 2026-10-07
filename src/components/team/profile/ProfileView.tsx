"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, EyeOff, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTeam } from "@/context/TeamDataContext";
import { PageHeader } from "@/components/team/shared";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { SpecialtyPicker } from "@/components/team/SpecialtyPicker";
import { ContractHoursField, HoursEditor, WorkScheduleEditor } from "@/components/team/WorkSchedule";
import { daysFromHours, effectiveHours, rangesError } from "@/lib/horaires";
import { WEEKDAYS } from "@/utils/date";
import { PersonAbsences } from "@/components/team/PersonAbsences";
import { AffinitesCard, EquipeCard, SemaineTypeCard } from "@/components/team/praticien/PraticienSections";
import { IdentityCard, RecapContent, SemaineTypeSalarie } from "@/components/team/profile/Fiche";
import { usePersonRights } from "@/components/team/profile/rights";
import { CongesPayesCard, ContratCard, DocumentsCard, DpcCard, MissionsCard, RappelsCard, RecadragesCard, SalaryCard } from "@/components/team/profile/RHSections";
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
  const rights = usePersonRights(user);
  const canSeeSalary = self || can("param.cabinet") || can("compta") || rights.viewerPraticien;
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
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
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
            {canEdit && ((!profile && liberal) || full || (!liberal && has("horaires") && !has("semaineType"))) && (
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

      {/* Comme la fiche patient de Soins : l'identité à gauche, l'emploi du temps (semaine type) en grand à droite. */}
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-4">
          <IdentityCard
            user={user}
            profile={profile}
            extra={
              <>
                {profile && (
                  <SpecialtyPicker
                    value={user.specialties}
                    disabled={!canEdit || user.status === "archive"}
                    onChange={(specialties) => {
                      const res = updateUser({ ...user, specialties });
                      if (res.ok) toast.success("Spécialités sauvegardées");
                      else toast.error(res.error);
                    }}
                  />
                )}
                {!profile && manager && isHealthProfessional(user, roles) && user.status !== "archive" && (
                  <Button variant="outline" className="w-full" onClick={createPraticienProfile}>
                    <Stethoscope /> Créer la fiche praticien
                  </Button>
                )}
              </>
            }
          />
          <RecapContent user={user} />
        </aside>

        <div className="min-w-0 space-y-6">
      {profile && <SemaineTypeCard profile={profile} canEdit={canEdit} />}
      {/* V1 : semaine type en emploi du temps, « Cette semaine », semaines modifiées. MVP : les horaires habituels, tout simplement. */}
      {!profile && !liberal && has("semaineType") && <SemaineTypeSalarie user={user} />}
      {/* Remplir ses horaires : V1. En MVP, le planning prend les jours de travail par défaut. */}
      {!profile && !liberal && has("horaires") && !has("semaineType") && (
        <Card>
          <CardHeader>
            <CardTitle>Horaires de travail habituels</CardTitle>
            <CardDescription>
              Les plages de chaque jour (ex. 08:30 → 12:30 puis 14:00 → 17:00). Elles disent au planning qui est là le matin, l&apos;après-midi ou toute la journée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContractHoursField value={draft.weeklyHours} disabled={!can("param.cabinet")} onChange={(weeklyHours) => setDraft({ ...draft, weeklyHours })} />
            <HoursEditor
              value={draft.schedule ?? effectiveHours(draft)}
              disabled={!canEdit}
              contractHours={draft.weeklyHours}
              onChange={(schedule) => setDraft({ ...draft, schedule, ...daysFromHours(schedule) })}
            />
          </CardContent>
        </Card>
      )}

      {!profile && liberal && (
        <Card>
          <CardHeader>
            <CardTitle>Jours de présence</CardTitle>
            <CardDescription>Praticien libéral : pas d&apos;horaires ni de pointage, seulement les demi-journées où il consulte.</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkScheduleEditor value={draft} disabled={!canEdit} onChange={(v) => setDraft({ ...draft, ...v })} />
          </CardContent>
        </Card>
      )}

      {/* Missions : seulement pour les salariés, un praticien libéral n'a pas de fiche de poste. */}
      {!liberal && <MissionsCard user={user} canManage={rights.canManage} canCheck={self || rights.canManage} simple={!has("missionsSuivies")} />}

      {profile && <EquipeCard profile={profile} canEdit={canEdit} />}
      {profile && has("affinite") && <AffinitesCard profile={profile} />}

      {/* Praticien libéral : pas de salaire versé par le cabinet. */}
      {!liberal && <SalaryCard user={user} canSee={canSeeSalary} canEdit={canEditSalary} />}
      <RappelsCard user={user} canEdit={canEditRH} medecineOnly={liberal} />
      {!liberal && rights.canSeeRecadrages && has("recadrages") && <RecadragesCard user={user} canEdit={canEditRH} />}
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
        </div>
      </div>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} prefill={self ? undefined : { userId: user.id, date: today }} />
    </div>
  );
}
