"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Undo2, UserMinus, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { useTeam } from "@/context/TeamDataContext";
import { DayStaffing, PraticienDay, displayName, shortDate, teamMembersOn } from "@/lib/team";
import { cn } from "@/lib/utils";

const DOT = {
  present: "bg-emerald-500",
  ailleurs: "bg-violet-400",
  absent: "bg-rose-400",
  off: "bg-slate-300",
  autre_jour: "bg-slate-200",
} as const;

/**
 * Un praticien n'a pas tous ses assistants un jour donné : on explique où est chacun de ses rattachés
 * et on propose d'agir tout de suite (récupérer un assistant prêté, ou accepter de travailler avec moins d'assistants ce jour-là).
 */
export function GapActions({ day, staffing, showLink = false }: { day: PraticienDay; staffing: DayStaffing; showLink?: boolean }) {
  const { users, absences, dayOverrides, can, removeLoan, lendAssistant, setDayNeed, removeDayNeed } = useTeam();
  const canEdit = can("param.cabinet") || can("team.planning");
  const date = staffing.date;
  const praticien = day.praticien;
  const members = teamMembersOn(day, staffing, users, absences, dayOverrides).filter((m) => m.state !== "autre_jour");
  const present = day.slots.length;

  function reduceNeed() {
    const n = setDayNeed(date, praticien.id, present);
    toast.success(
      present === 0
        ? `${displayName(praticien)} travaillera sans assistant le ${shortDate(date)}`
        : `${displayName(praticien)} travaillera avec ${present} assistant${present > 1 ? "s" : ""} le ${shortDate(date)}`,
      {
        description: "Pour cette journée uniquement. Sa fiche praticien ne change pas.",
        duration: 10000,
        action: { label: "Annuler", onClick: () => removeDayNeed(n.id) },
      }
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">Où est son équipe ce jour-là</p>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun assistant rattaché à ce praticien.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.user.id} className="flex items-center gap-2 text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", DOT[m.state])} />
                <span className={cn("min-w-0 flex-1", m.state === "present" ? "text-slate-900" : "text-slate-600")}>{m.label}</span>
                {m.loan && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => {
                      const loan = m.loan!;
                      removeLoan(loan.id);
                      toast.success(`${m.user.firstName} revient avec ${displayName(praticien)} le ${shortDate(date)}`, {
                        description: m.elsewhere ? `Le prêt à ${displayName(m.elsewhere)} est annulé.` : undefined,
                        duration: 10000,
                        action: { label: "Annuler", onClick: () => lendAssistant(loan.date, loan.assistantId, loan.praticienId) },
                      });
                    }}
                  >
                    <Undo2 /> Récupérer
                  </Button>
                )}
                {m.absence && (
                  <AbsencePopover absence={m.absence} date={date}>
                    <Button size="xs" variant="outline">
                      <UserRoundCheck /> Retirer l&apos;absence
                    </Button>
                  </AbsencePopover>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {day.missing > 0 && (
        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">
            {present === 0 ? "Travailler sans assistant ce jour-là" : `Travailler avec ${present} assistant${present > 1 ? "s" : ""} ce jour-là`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Le besoin passe de {day.need} à {present} pour le {shortDate(date)} seulement. La fiche de {displayName(praticien)} ne change pas.
          </p>
          <Button size="sm" className="mt-2" disabled={!canEdit} onClick={reduceNeed}>
            <UserMinus /> {present === 0 ? "Confirmer : sans assistant" : `Confirmer : ${present} assistant${present > 1 ? "s" : ""} suffi${present > 1 ? "sent" : "t"}`}
          </Button>
        </div>
      )}

      {day.dayNeed && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-900">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="flex-1">
            Besoin ajusté pour ce jour : {day.need} au lieu de {day.baseNeed}.
          </span>
          <Button size="xs" variant="outline" className="bg-white" disabled={!canEdit} onClick={() => removeDayNeed(day.dayNeed!.id)}>
            <Undo2 /> Rétablir {day.baseNeed}
          </Button>
        </div>
      )}

      {showLink && day.missing > 0 && (
        <Link
          href={`/team/remplacements?date=${date}&praticien=${praticien.id}`}
          className="flex items-center gap-1 text-sm font-medium text-pink-700 hover:underline"
        >
          Chercher un prêt d&apos;assistant pour la journée <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
