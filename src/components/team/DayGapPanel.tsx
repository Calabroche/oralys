"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Repeat, Undo2, UserPlus, UserX } from "lucide-react";
import { GapActions } from "@/components/team/GapActions";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/context/TeamDataContext";
import { PersonLink } from "@/components/team/PersonSheet";
import { UserAvatar } from "@/components/team/shared";
import { dayStaffing, displayName, fullName, isAvailable, isChairAssistant, shortDate } from "@/lib/team";

/**
 * Manque d'assistant sur une journée sans RDV à réaffecter : le trou est dans le planning d'équipe.
 * On explique pourquoi (qui est absent, qui est pris ailleurs) et on propose de rattacher un assistant libre.
 */
export function DayGapPanel({ date, praticienId, hasRdvs }: { date: string; praticienId: string; hasRdvs?: boolean }) {
  const { users, profiles, absences, findUser, upsertProfile, can, dayOverrides, dayNeeds, lendAssistant, removeLoan } = useTeam();
  const staffing = dayStaffing(date, profiles, users, absences, dayOverrides, dayNeeds);
  const day = staffing.praticiens.find((p) => p.praticien.id === praticienId);
  const praticien = findUser(praticienId);
  if (!day || !praticien) return <p className="py-16 text-center text-sm text-slate-400">Praticien introuvable.</p>;
  const profile = day.profile;
  const canEdit = can("param.cabinet") || can("team.planning");

  const loans = dayOverrides.filter((o) => o.date === date && o.praticienId === praticienId);
  // Chaque prêt possible est simulé sur toute la journée (les back-ups se rééquilibrent) :
  // on ne propose que ceux qui réduisent vraiment le manque, avec leur effet exact sur les autres praticiens.
  const totalMissing = staffing.praticiens.reduce((n, x) => n + x.missing, 0);
  const options = users
    .filter((u) => isChairAssistant(u) && isAvailable(u, date, absences) && !day.slots.some((sl) => sl.assistantId === u.id))
    .map((u) => {
      const after = dayStaffing(
        date,
        profiles,
        users,
        absences,
        [...dayOverrides, { id: "simulation", date, assistantId: u.id, praticienId }],
        dayNeeds
      );
      const mine = after.praticiens.find((x) => x.praticien.id === praticienId)!;
      const gain = day.missing - mine.missing;
      const net = totalMissing - after.praticiens.reduce((n, x) => n + x.missing, 0);
      const worse = after.praticiens
        .filter((x) => x.praticien.id !== praticienId)
        .map((x) => ({ x, before: staffing.praticiens.find((y) => y.praticien.id === x.praticien.id)! }))
        .filter(({ x, before }) => x.missing > before.missing)
        .map(({ x }) => `${displayName(x.praticien)} passerait à ${x.slots.length}/${x.need}`);
      const free = !staffing.assignmentOf[u.id];
      const from = staffing.assignmentOf[u.id] ? findUser(staffing.assignmentOf[u.id]) : undefined;
      const impact = [
        free ? "Sans équipe ce jour-là" : `Actuellement avec ${from ? displayName(from) : "?"}`,
        worse.length ? worse.join(", ") : "aucun autre praticien pénalisé",
      ].join(" · ");
      return { user: u, free, gain, net, impact, rank: worse.length ? 1 : 0, tone: worse.length ? "text-amber-700" : "text-emerald-700" };
    })
    .filter((o) => o.gain > 0)
    .sort((x, y) => y.net - x.net || x.rank - y.rank);

  function attach(userId: string) {
    const counters = { titulaire: 0, backup: 0 };
    const team = [...profile.team, { userId, priority: "backup" as const, rank: 99, days: [] }]
      .sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1))
      .map((l) => ({ ...l, rank: ++counters[l.priority] }));
    const res = upsertProfile({ ...profile, team });
    if (!res.ok) return toast.error(res.error);
    toast.success(`${findUser(userId)?.firstName} rattaché(e) en back-up de ${displayName(praticien!)}`, {
      description: "Le planning est recalculé : le manque est comblé s'il est disponible.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {displayName(praticien)} · {shortDate(date)}
        </CardTitle>
        <CardDescription>
          {hasRdvs ? "Équipe de la journée" : "Pas de RDV patient à réaffecter ce jour-là : le manque concerne le planning d'équipe"} (besoin {day.need},{" "}
          {day.slots.length} présent{day.slots.length > 1 ? "s" : ""}).{" "}
          <Link href={`/team/planning?date=${date}`} className="text-pink-700 hover:underline">
            Voir la journée →
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {day.missing === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" /> Le besoin est couvert pour cette journée.
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            <UserX className="size-4" /> Il manque {day.missing} assistant{day.missing > 1 ? "s" : ""}.
          </p>
        )}

        <GapActions day={day} staffing={staffing} />

        {loans.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Prêts pour cette journée</p>
            <ul className="space-y-2">
              {loans.map((o) => {
                const u = findUser(o.assistantId);
                return (
                  <li key={o.id} className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-sm">
                    <Repeat className="size-4 text-violet-600" />
                    <span className="font-medium">{u ? fullName(u) : "?"}</span>
                    <span className="text-violet-800">prêté(e) pour la journée</span>
                    <Button size="xs" variant="outline" className="ml-auto bg-white" disabled={!canEdit} onClick={() => removeLoan(o.id)}>
                      <Undo2 /> Retirer
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {day.missing > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Solutions pour cette journée</p>
            <p className="mb-2 text-xs text-slate-500">
              Prêter un assistant présent ce jour-là : les rattachements ne changent pas, seule cette journée est modifiée.
            </p>
            {options.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-slate-500">
                Aucun prêt ne réduit le manque : tous les assistants présents sont indispensables ailleurs. Confirmez ci-dessus que la journée se fera avec moins d&apos;assistants, ou prévoyez un intérimaire.
              </p>
            ) : (
              <ul className="space-y-2">
                {options.map((o) => (
                  <li key={o.user.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5 text-sm">
                    <UserAvatar user={o.user} className="size-7 text-[0.6rem]" />
                    <div className="min-w-0 flex-1">
                      <PersonLink userId={o.user.id} className="font-medium">
                        {fullName(o.user)}
                      </PersonLink>
                      <div className={cn("text-xs", o.tone)}>{o.impact}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={o.rank === 0 ? "default" : "outline"}
                      disabled={!canEdit}
                      onClick={() => {
                        const loan = lendAssistant(date, o.user.id, praticienId);
                        toast.success(`${o.user.firstName} prêté(e) à ${displayName(praticien)} le ${shortDate(date)}`, {
                          duration: 10000,
                          action: { label: "Annuler", onClick: () => removeLoan(loan.id) },
                        });
                      }}
                    >
                      <Repeat /> Affecter pour la journée
                    </Button>
                    {o.free && !profile.team.some((l) => l.userId === o.user.id) && (
                      <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => attach(o.user.id)}>
                        <UserPlus /> Back-up permanent
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
