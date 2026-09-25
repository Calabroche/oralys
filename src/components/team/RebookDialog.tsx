"use client";

import { toast } from "sonner";
import { CalendarClock, CalendarX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { acteLabel, displayName, findRebookSlots, fullName, shortDate } from "@/lib/team";
import { SoinsRdv } from "@/types/team";
import { toISODate } from "@/utils/date";

/**
 * Reprogrammer un RDV qu'on ne peut pas couvrir : Oralys propose les prochains créneaux
 * où le praticien est libre et où un binôme admissible est disponible.
 */
export function RebookDialog({ rdv, onClose, onDone }: { rdv: SoinsRdv | null; onClose: () => void; onDone?: (rdvId: string) => void }) {
  const { users, profiles, absences, rdvs, findUser, now, rescheduleRdv, cancelRdv, can } = useTeam();
  if (!rdv) return null;
  const praticien = findUser(rdv.praticienUserId);
  const slots = findRebookSlots(rdv, toISODate(now()), { users, profiles, absences, rdvs });
  const allowed = can("rdv");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-pink-600" /> Reprogrammer le RDV
          </DialogTitle>
          <DialogDescription>
            {rdv.patient} · {acteLabel(rdv.acte)} avec {praticien ? displayName(praticien) : "?"}, prévu le {shortDate(rdv.date)} à {rdv.start}.
          </DialogDescription>
        </DialogHeader>

        {slots.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
            Aucun créneau avec binôme disponible dans les 30 prochains jours.
          </p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={`${s.date}-${s.start}`} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="w-28 text-sm">
                  <div className="font-medium capitalize text-slate-900">{shortDate(s.date)}</div>
                  <div className="text-xs text-slate-500">
                    {s.start}–{s.end}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  {s.assistant ? (
                    <>
                      <UserAvatar user={s.assistant.user} className="size-6 text-[0.6rem]" />
                      <span className="truncate">{fullName(s.assistant.user)}</span>
                      <Badge variant="outline" className="shrink-0">
                        {s.assistant.score}/100
                      </Badge>
                    </>
                  ) : (
                    <span className="text-slate-500">Sans assistant</span>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!allowed}
                  onClick={() => {
                    rescheduleRdv(rdv.id, { date: s.date, start: s.start, end: s.end }, s.assistant?.user.id ?? null);
                    toast.success("RDV reprogrammé", {
                      description: `${shortDate(s.date)} à ${s.start}${s.assistant ? ` avec ${s.assistant.user.firstName}` : ""}. Patient à prévenir (SMS Soins).`,
                    });
                    onDone?.(rdv.id);
                    onClose();
                  }}
                >
                  Choisir
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={!allowed}
            onClick={() => {
              cancelRdv(rdv.id);
              toast("RDV annulé", { description: `${rdv.patient} est à prévenir.` });
              onDone?.(rdv.id);
              onClose();
            }}
          >
            <CalendarX /> Annuler le RDV
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
