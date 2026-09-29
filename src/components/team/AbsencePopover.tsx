"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarCheck, CalendarX, ExternalLink, Siren, Undo2, UserRoundCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/context/TeamDataContext";
import { usePersonSheet } from "@/components/team/PersonSheet";
import { ABSENCE_TYPE_LABELS, displayName, isLastMinute, shortDate } from "@/lib/team";
import { TeamAbsence } from "@/types/team";
import { AbsenceBadge } from "@/components/team/shared";

/** Actions d'absence avec retour arrière immédiat dans le toast. */
export function useAbsenceActions() {
  const { cancelAbsence, removeAbsenceDay, restoreAbsence, absences, findUser } = useTeam();

  function cancelWithUndo(id: string) {
    const removed = cancelAbsence(id);
    if (!removed) return;
    const u = findUser(removed.userId);
    toast.success(`Absence de ${u?.firstName ?? "?"} annulée`, {
      description: "Retour au planning, alertes et fermeture d'agenda Soins retirées.",
      duration: 10000,
      action: { label: "Rétablir", onClick: () => restoreAbsence(removed) },
    });
  }

  function removeDayWithUndo(id: string, iso: string) {
    const before = absences.find((a) => a.id === id);
    if (!before) return;
    const pieces = removeAbsenceDay(id, iso);
    const u = findUser(before.userId);
    toast.success(`${u?.firstName ?? "?"} réintégré(e) le ${shortDate(iso)}`, {
      duration: 10000,
      action: {
        label: "Annuler",
        // On retire les morceaux créés par la découpe, puis on remet l'absence d'origine.
        onClick: () => restoreAbsence(before, pieces.map((p) => p.id)),
      },
    });
  }

  return { cancelWithUndo, removeDayWithUndo };
}

/** Clic sur une absence (planning, binômes) : détails + retour arrière total ou pour un jour. */
export function AbsencePopover({ absence, date, children }: { absence: TeamAbsence; date?: string; children: ReactNode }) {
  const { findUser, can, sessionUserId, validateAbsence, refuseAbsence } = useTeam();
  const { open: openPerson } = usePersonSheet();
  const { cancelWithUndo, removeDayWithUndo } = useAbsenceActions();
  const [open, setOpen] = useState(false);
  const u = findUser(absence.userId);
  const by = findUser(absence.declaredById);
  const canEdit = can("team.planning") || absence.userId === sessionUserId;
  const multiDay = absence.startDate !== absence.endDate;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3 text-sm">
          <div>
            <button className="font-medium text-slate-900 hover:underline" onClick={() => u && openPerson(u.id)}>
              {u ? displayName(u) : "?"}
            </button>
            <div className="mt-1 flex items-center gap-2">
              <AbsenceBadge absence={absence} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {ABSENCE_TYPE_LABELS[absence.type]} du {shortDate(absence.startDate)} au {shortDate(absence.endDate)}
              {absence.motif ? ` · ${absence.motif}` : ""}
              <br />
              Déclarée par {by?.firstName ?? "?"} le {new Date(absence.declaredAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              {isLastMinute(absence) && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-rose-600">
                  <Siren className="size-3" /> dernier moment
                </span>
              )}
            </p>
          </div>

          {absence.status === "demandee" && can("team.planning") && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  validateAbsence(absence.id);
                  toast.success("Absence validée");
                  setOpen(false);
                }}
              >
                <CalendarCheck /> Valider
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  refuseAbsence(absence.id);
                  toast("Demande refusée");
                  setOpen(false);
                }}
              >
                Refuser
              </Button>
            </div>
          )}

          {canEdit && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-slate-500">Retour arrière</p>
              {date && multiDay && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    removeDayWithUndo(absence.id, date);
                    setOpen(false);
                  }}
                >
                  <UserRoundCheck /> Présent(e) finalement le {shortDate(date)}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-rose-700"
                onClick={() => {
                  cancelWithUndo(absence.id);
                  setOpen(false);
                }}
              >
                {multiDay ? <CalendarX /> : <Undo2 />} Annuler {multiDay ? "toute l'absence" : "l'absence"}
              </Button>
            </div>
          )}

          {!canEdit && (
            <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
              Seul un gestionnaire (droit « Planning d&apos;équipe ») ou la personne elle-même peut annuler cette absence.
            </p>
          )}

          <Link
            href={`/team/planning?tab=remplacer&absence=${absence.id}`}
            className="flex items-center gap-1 text-xs text-pink-700 hover:underline"
            onClick={() => setOpen(false)}
          >
            <ExternalLink className="size-3" /> Voir les RDV impactés et les remplaçants
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
