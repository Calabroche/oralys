"use client";

import { useState } from "react";
import { AbsencePeriod } from "@/types";
import { diffInDays, formatShortDate } from "@/utils/date";
import { AbsenceModal } from "./AbsenceModal";

export function AbsencesSection({
  absencePeriods,
  onSave,
}: {
  absencePeriods: AbsencePeriod[];
  onSave: (absence: AbsencePeriod) => void;
}) {
  const [modalState, setModalState] = useState<null | "new" | AbsencePeriod>(null);

  return (
    <section id="periodes-absence" className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Périodes d&apos;absence</h2>
        <span className="text-slate-400" title="Congés, formation, maladie, fermeture du cabinet...">ⓘ</span>
      </div>

      <div className="space-y-2">
        {absencePeriods.map((absence) => {
          const days = diffInDays(absence.startDate, absence.endDate);
          return (
            <div
              key={absence.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{absence.motif}</span>
                <span className="text-slate-400">
                  {formatShortDate(absence.startDate)} → {formatShortDate(absence.endDate)}
                </span>
                <span className="text-slate-400">
                  {days} jour{days > 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setModalState(absence)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Modifier"
              >
                ✎
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setModalState("new")}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Ajouter une absence
        </button>
      </div>

      {modalState && (
        <AbsenceModal
          absence={modalState === "new" ? undefined : modalState}
          onClose={() => setModalState(null)}
          onSave={(absence) => {
            onSave(absence);
            setModalState(null);
          }}
        />
      )}
    </section>
  );
}
