"use client";

import { toast } from "sonner";
import { CalendarCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { Candidate, acteLabel, displayName, fullName, shortDate, sortCandidates, suggestAssistants } from "@/lib/team";
import { SoinsRdv } from "@/types/team";
import { cn } from "@/lib/utils";

export interface DayBatch {
  date: string;
  praticienId: string;
  rdvs: SoinsRdv[];
}

/**
 * Remplacer un assistant absent pour toute la journée d'un praticien, en une fois :
 * on choisit une personne libre sur tous les RDV du jour, elle est prêtée au praticien pour la journée
 * et reprend tous ses RDV (au lieu de les affecter un par un).
 */
export function DayReplaceDialog({
  batch,
  mode,
  onOpenChange,
  onDone,
}: {
  batch: DayBatch | null;
  mode: "regles" | "affinite";
  onOpenChange: (open: boolean) => void;
  onDone: (rdvIds: string[]) => void;
}) {
  const { users, profiles, absences, rdvs, findUser, lendAssistant, removeLoan } = useTeam();
  const praticien = batch ? findUser(batch.praticienId) : undefined;

  // Pour chaque assistant : sur combien de RDV de la journée il est admissible (et pourquoi pas sur les autres).
  const rows = (() => {
    if (!batch) return [];
    const perRdv = batch.rdvs.map((r) =>
      sortCandidates(
        suggestAssistants({ praticienUserId: r.praticienUserId, date: r.date, start: r.start, acte: r.acte, excludeRdvId: r.id }, { users, profiles, absences, rdvs }),
        mode
      )
    );
    const order = perRdv[0] ?? [];
    return order
      .map((c) => {
        const results = perRdv.map((list) => list.find((x) => x.user.id === c.user.id));
        const ok = results.filter((x) => x?.eligible).length;
        const blockers = [...new Set(results.flatMap((x) => (x && !x.eligible ? x.blockers : [])))];
        return { candidate: c, ok, blockers };
      })
      .filter((r) => r.ok > 0)
      .sort((a, b) => b.ok - a.ok);
  })();

  // Seules les personnes libres sur tous les RDV peuvent reprendre la journée : sinon, on traite au RDV près.
  function assign(c: Candidate) {
    if (!batch) return;
    const loan = lendAssistant(batch.date, c.user.id, batch.praticienId);
    const ids = (loan.reassigned ?? []).map((x) => x.rdvId);
    onDone(ids);
    toast.success(`${fullName(c.user)} remplace pour la journée`, {
      description: `${ids.length} RDV de ${praticien ? displayName(praticien) : "?"} le ${shortDate(batch.date)} lui sont affectés.`,
      duration: 10000,
      action: { label: "Annuler", onClick: () => removeLoan(loan.id) },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={Boolean(batch)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {batch && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarCheck className="size-5 text-pink-600" /> Remplacer pour toute la journée
              </DialogTitle>
              <DialogDescription>
                {praticien ? displayName(praticien) : "?"}, {shortDate(batch.date)} : {batch.rdvs.length} RDV à réaffecter. La personne choisie est prêtée au praticien pour
                la journée et reprend tous ces RDV d&apos;un coup.
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {batch.rdvs.map((r) => (
                <li key={r.id}>
                  {r.start}–{r.end} · {acteLabel(r.acte)} · {r.patient}
                </li>
              ))}
            </ul>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Personne n&apos;est disponible ce jour-là. Traitez les RDV un par un (reprogrammer ou maintenir sans assistant).</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {rows.map(({ candidate: c, ok, blockers }) => {
                  const all = ok === batch.rdvs.length;
                  return (
                    <li key={c.user.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <UserAvatar user={c.user} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {fullName(c.user)}
                          <Badge variant="outline" className="font-normal">
                            {c.tierLabel}
                          </Badge>
                        </p>
                        <p className={cn("text-xs", all ? "text-emerald-700" : "text-amber-700")}>
                          {all ? (
                            `Libre sur les ${ok} RDV`
                          ) : (
                            <span className="flex items-center gap-1">
                              <TriangleAlert className="size-3" /> Libre sur {ok} RDV sur {batch.rdvs.length}, à affecter RDV par RDV
                              {blockers.length > 0 && ` (${blockers.join(", ").toLowerCase()})`}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button size="sm" disabled={!all} onClick={() => assign(c)} title={all ? undefined : "Pas libre sur tous les RDV : à affecter RDV par RDV"}>
                        Affecter la journée
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
