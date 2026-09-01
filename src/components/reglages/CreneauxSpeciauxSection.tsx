"use client";

import { useState } from "react";
import { ActivityType, SpecialSlot } from "@/types";
import { formatShortDate } from "@/utils/date";
import { CreneauSpecialModal } from "./CreneauSpecialModal";

interface Props {
  specialSlots: SpecialSlot[];
  activityTypes: ActivityType[];
  onSave: (slot: SpecialSlot) => void;
}

export function CreneauxSpeciauxSection({ specialSlots, activityTypes, onSave }: Props) {
  const [modalState, setModalState] = useState<null | "new" | SpecialSlot>(null);

  return (
    <section id="creneaux-speciaux" className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Créneaux spéciaux</h2>
        <span className="text-slate-400" title="Exceptions ponctuelles à la semaine type">ⓘ</span>
      </div>

      <div className="space-y-2">
        {specialSlots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{slot.label}</span>
              <span className="text-slate-400">
                {formatShortDate(slot.startDate)}
                {slot.startDate !== slot.endDate && ` - ${formatShortDate(slot.endDate)}`}
                {!slot.allDay && slot.start && slot.end && ` · ${slot.start} - ${slot.end}`}
                {slot.allDay && " · Toute la journée"}
              </span>
            </div>
            <button
              onClick={() => setModalState(slot)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Modifier"
            >
              ✎
            </button>
          </div>
        ))}

        <button
          onClick={() => setModalState("new")}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Ajouter un créneau
        </button>
      </div>

      {modalState && (
        <CreneauSpecialModal
          slot={modalState === "new" ? undefined : modalState}
          activityTypes={activityTypes}
          onClose={() => setModalState(null)}
          onSave={(slot) => {
            onSave(slot);
            setModalState(null);
          }}
        />
      )}
    </section>
  );
}
