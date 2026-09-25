"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge, PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { ACTES, SKILLS, SPECIALTIES } from "@/data/teamMockData";
import { fullName, shortDate } from "@/lib/team";
import { ActeCategory, SkillId, TeamUser } from "@/types/team";
import { Weekday } from "@/types";
import { VersionGate } from "@/components/team/Version";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";

export default function MoiPage() {
  const { sessionUser } = useTeam();
  if (!sessionUser) return null;
  return (
    <VersionGate feature="profil">
      <Profile key={sessionUser.id} user={sessionUser} />
    </VersionGate>
  );
}

function Profile({ user }: { user: TeamUser }) {
  const { updateUser, users, absences, can } = useTeam();
  const [draft, setDraft] = useState(user);
  const [declareOpen, setDeclareOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(user);
  const isPraticien = user.poste === "praticien";
  const colleagues = users.filter((u) => u.status === "actif" && u.id !== user.id && u.poste !== user.poste && (u.poste === "praticien" || u.poste === "assistant"));
  const mine = absences.filter((a) => a.userId === user.id).sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-8">
      <PageHeader
        title="Mes disponibilités & préférences"
        description="Ces informations alimentent le planning et les suggestions de remplacement."
        actions={
          <>
            <Button variant="outline" onClick={() => setDeclareOpen(true)}>
              <CalendarPlus /> Déclarer une absence
            </Button>
            <Button
              disabled={!dirty}
              onClick={() => {
                const res = updateUser(draft);
                if (res.ok) toast.success("Préférences enregistrées");
                else toast.error(res.error);
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-4">
          <UserAvatar user={user} className="size-14 text-lg" />
          <div>
            <p className="text-lg font-medium">{fullName(user)}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1.5">
              <RoleBadges user={user} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jours de travail habituels</CardTitle>
          <CardDescription>Temps partiel, jours fixes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={draft.workDays}
            onValueChange={(v) => setDraft({ ...draft, workDays: v as Weekday[] })}
          >
            {WEEKDAYS.map((d) => (
              <ToggleGroupItem key={d} value={d} className="px-4 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                {WEEKDAY_LABELS[d]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isPraticien ? "Mes spécialités" : "Types d'actes préférés"}</CardTitle>
          <CardDescription>
            {isPraticien ? "Visibles par le secrétariat pour orienter les patients." : "Utilisé par le score d'affinité (ex. implantologie plutôt que pédodontie)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="multiple"
            variant="outline"
            className="flex-wrap"
            value={isPraticien ? draft.specialties : draft.preferredActs}
            onValueChange={(v) => setDraft(isPraticien ? { ...draft, specialties: v as ActeCategory[] } : { ...draft, preferredActs: v as ActeCategory[] })}
          >
            {(isPraticien ? SPECIALTIES : ACTES).map((a) => (
              <ToggleGroupItem key={a.id} value={a.id} className="px-3 data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                {a.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

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
              Préférences de binôme <Badge variant="outline"><EyeOff /> Confidentiel</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>Mes absences</CardTitle>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune absence déclarée.</p>
          ) : (
            <ul className="divide-y">
              {mine.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  {shortDate(a.startDate)} → {shortDate(a.endDate)}
                  <span className="flex items-center gap-2">
                    <AbsenceBadge absence={a} />
                    <span className="text-xs text-slate-500">{a.status === "validee" ? "Validée" : a.status === "demandee" ? "En attente" : "Refusée"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} />
    </div>
  );
}
