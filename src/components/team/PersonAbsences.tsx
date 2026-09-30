"use client";

import { useState } from "react";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceBadge } from "@/components/team/shared";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { AbsenceDocuments } from "@/components/team/Justificatifs";
import { shortDate } from "@/lib/team";
import { toISODate } from "@/utils/date";
import { TeamAbsence } from "@/types/team";
import { cn } from "@/lib/utils";

const PAST_PREVIEW = 5;

const STATUS_LABEL: Record<TeamAbsence["status"], string> = { validee: "Validée", demandee: "En attente", refusee: "Refusée" };

function days(a: TeamAbsence) {
  const n = Math.round((Date.parse(a.endDate) - Date.parse(a.startDate)) / 86_400_000) + 1;
  return n > 1 ? `${n} jours` : "1 jour";
}

/**
 * Absences d'une personne, les siennes seulement : en cours et à venir d'abord, puis l'historique.
 * Les justificatifs (donnée de santé) ne sont visibles que par la personne et le gestionnaire.
 */
export function PersonAbsences({ userId }: { userId: string }) {
  const { absences, can, sessionUserId, now } = useTeam();
  const [showAllPast, setShowAllPast] = useState(false);
  const today = toISODate(now());
  const mine = absences.filter((a) => a.userId === userId);
  const upcoming = mine.filter((a) => a.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = mine.filter((a) => a.endDate < today && a.status !== "refusee").sort((a, b) => b.startDate.localeCompare(a.startDate));
  const seeDocs = userId === sessionUserId || can("param.cabinet") || can("team.planning");
  const shownPast = showAllPast ? past : past.slice(0, PAST_PREVIEW);

  const row = (a: TeamAbsence, isPast: boolean) => (
    <li key={a.id} className={cn("flex flex-wrap items-center justify-between gap-y-1.5 py-2 text-sm", isPast && "text-slate-500")}>
      <AbsencePopover absence={a}>
        <button className="flex items-center gap-2 rounded-md text-left hover:underline">
          <span className="tabular-nums">
            {a.startDate === a.endDate ? shortDate(a.startDate) : `${shortDate(a.startDate)} → ${shortDate(a.endDate)}`}
          </span>
          <span className="text-xs text-slate-400">{days(a)}</span>
          {a.startDate <= today && a.endDate >= today && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">En cours</span>}
        </button>
      </AbsencePopover>
      <span className="flex items-center gap-2">
        <AbsenceBadge absence={a} compact />
        <span className={cn("text-xs", a.status === "refusee" ? "text-rose-600" : a.status === "demandee" ? "text-amber-700" : "text-slate-500")}>
          {STATUS_LABEL[a.status]}
        </span>
      </span>
      {a.motif && <p className="basis-full text-xs text-slate-500">{a.motif}</p>}
      {seeDocs && <AbsenceDocuments absence={a} canEdit={seeDocs} className="basis-full" />}
    </li>
  );

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">En cours et à venir ({upcoming.length})</h3>
        {upcoming.length ? <ul className="divide-y">{upcoming.map((a) => row(a, false))}</ul> : <p className="py-2 text-sm text-slate-400">Aucune absence prévue.</p>}
      </section>
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Passées ({past.length})</h3>
        {past.length ? (
          <>
            <ul className="divide-y">{shownPast.map((a) => row(a, true))}</ul>
            {past.length > PAST_PREVIEW && (
              <button onClick={() => setShowAllPast((v) => !v)} className="mt-1 text-xs text-pink-700 hover:underline">
                {showAllPast ? "Réduire" : `Voir les ${past.length - PAST_PREVIEW} autres`}
              </button>
            )}
          </>
        ) : (
          <p className="py-2 text-sm text-slate-400">Aucune absence passée.</p>
        )}
      </section>
    </div>
  );
}
