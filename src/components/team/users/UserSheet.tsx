"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, Check, History, Lock, Minus, Pencil, Stethoscope, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeclareAbsenceDialog } from "@/components/team/planning/DeclareAbsenceDialog";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { AbsenceBadge } from "@/components/team/shared";
import { shortDate } from "@/lib/team";
import { toISODate } from "@/utils/date";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/context/TeamDataContext";
import { PERMISSION_CATEGORIES, PERMISSIONS } from "@/data/teamMockData";
import { acteLabel, displayName, fullName, permissionsOf, skillLabel } from "@/lib/team";
import { RoleBadges, StatusBadge, UserAvatar } from "@/components/team/shared";
import { AuditList } from "@/components/team/AuditList";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { cn } from "@/lib/utils";

export function UserSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { findUser, roles, audit, profiles, absences, can, now } = useTeam();
  const [declareOpen, setDeclareOpen] = useState(false);
  const user = findUser(userId);
  const perms = user ? permissionsOf({ ...user, status: "actif" }, roles) : new Set();
  const entries = user ? audit.filter((a) => a.actorId === user.id || a.targetUserId === user.id) : [];
  const teams = user ? profiles.filter((p) => p.team.some((l) => l.userId === user.id) || p.praticienUserId === user.id) : [];

  return (
    <Sheet open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {user && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} className="size-12 text-base" />
                <div>
                  <SheetTitle className="text-lg">{displayName(user)}</SheetTitle>
                  <SheetDescription>{user.email}</SheetDescription>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <QuickLinks
                userId={user.id}
                onNavigate={onClose}
                onDeclare={() => setDeclareOpen(true)}
                profileId={profiles.find((x) => x.praticienUserId === user.id)?.id}
                canAudit={can("team.audit")}
                canEdit={can("param.cabinet")}
                active={user.status === "actif"}
              />
              {(() => {
                const upcoming = absences
                  .filter((a) => a.userId === user.id && a.status !== "refusee" && a.endDate >= toISODate(now()))
                  .sort((a, b) => a.startDate.localeCompare(b.startDate));
                if (!upcoming.length) return null;
                return (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-slate-500">Absences en cours et à venir (cliquer pour annuler ou modifier)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {upcoming.map((a) => (
                        <AbsencePopover key={a.id} absence={a}>
                          <button className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-slate-50">
                            <AbsenceBadge absence={a} compact /> {shortDate(a.startDate)} → {shortDate(a.endDate)}
                          </button>
                        </AbsencePopover>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {user.status === "archive" && (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Archivé le {new Date(user.archivedAt!).toLocaleDateString("fr-FR")} · {user.archiveReason}. L&apos;historique reste consultable.
                </p>
              )}
            </SheetHeader>
            <Tabs defaultValue="droits" className="px-4 pb-6">
              <TabsList variant="line" className="mb-3">
                <TabsTrigger value="droits">Rôles & droits</TabsTrigger>
                <TabsTrigger value="profil">Dispos & compétences</TabsTrigger>
                <TabsTrigger value="historique">Historique ({entries.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="droits" className="space-y-5">
                <RoleBadges user={user} />
                {PERMISSION_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{cat.label}</p>
                    <ul className="divide-y rounded-lg border">
                      {PERMISSIONS.filter((p) => p.category === cat.id).map((p) => {
                        const has = perms.has(p.id);
                        return (
                          <li key={p.id} className={cn("flex items-center gap-2 px-3 py-2 text-sm", !has && "text-slate-400")}>
                            {has ? <Check className="size-4 text-emerald-600" /> : <Minus className="size-4" />}
                            {p.label}
                            {p.reservedToHealthPro && <Lock className="ml-auto size-3.5 text-pink-500" />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="profil" className="space-y-5 text-sm">
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">Jours travaillés</p>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((d) => (
                      <span
                        key={d}
                        className={cn("rounded-md px-2 py-1 text-xs", user.workDays.includes(d) ? "bg-pink-100 text-pink-900" : "bg-slate-50 text-slate-400")}
                      >
                        {WEEKDAY_LABELS[d].slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
                <TagList title="Habilitations" items={user.skills.map(skillLabel)} empty="Aucune habilitation déclarée" />
                <TagList
                  title={user.poste === "praticien" ? "Spécialités" : "Actes préférés"}
                  items={(user.poste === "praticien" ? user.specialties : user.preferredActs).map(acteLabel)}
                  empty="Non renseigné"
                />
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">Équipes</p>
                  {teams.length === 0 && <p className="text-slate-400">Aucun rattachement</p>}
                  <ul className="space-y-1">
                    {teams.map((p) => {
                      const link = p.team.find((l) => l.userId === user.id);
                      return (
                        <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <Link href={`/team/equipes?praticien=${p.id}`} onClick={onClose} className="hover:text-pink-700 hover:underline">
                            {p.label}
                          </Link>
                          <Badge variant="outline">{link ? `${link.priority === "titulaire" ? "Titulaire" : "Back-up"} n°${link.rank}` : "Titulaire du profil"}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="historique">
                <p className="mb-3 text-xs text-slate-500">
                  Actions réalisées par {fullName(user)} ou le/la concernant, avec le rôle détenu au moment de l&apos;action.
                </p>
                <AuditList entries={entries} compact />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
      {user && <DeclareAbsenceDialog open={declareOpen} onOpenChange={setDeclareOpen} prefill={{ userId: user.id }} />}
    </Sheet>
  );
}

function TagList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="text-slate-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <Badge key={i} variant="secondary">
              {i}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Liens de la fiche vers les autres sections de Team, déjà filtrés sur la personne. */
function QuickLinks({
  userId,
  profileId,
  onNavigate,
  onDeclare,
  canAudit,
  canEdit,
  active,
}: {
  userId: string;
  profileId?: string;
  onNavigate: () => void;
  onDeclare: () => void;
  canAudit: boolean;
  canEdit: boolean;
  active: boolean;
}) {
  const link = (href: string, icon: React.ReactNode, label: string) => (
    <Button variant="outline" size="xs" asChild>
      <Link href={href} onClick={onNavigate}>
        {icon} {label}
      </Link>
    </Button>
  );
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {active && (
        <Button size="xs" onClick={onDeclare}>
          <CalendarPlus /> Déclarer une absence
        </Button>
      )}
      {link(`/team/planning?view=personnes&user=${userId}`, <CalendarDays />, "Planning")}
      {profileId && link(`/team/equipes?praticien=${profileId}`, <Stethoscope />, "Fiche praticien")}
      {link(`/team/remplacements?user=${userId}`, <UserRoundSearch />, "Remplacements")}
      {canAudit && link(`/team/reglages/journal?user=${userId}`, <History />, "Journal")}
      {canEdit && link(`/team/reglages/utilisateurs?edit=${userId}`, <Pencil />, "Modifier")}
    </div>
  );
}
