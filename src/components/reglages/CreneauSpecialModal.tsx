"use client";

import { useState } from "react";
import { ActivityType, SpecialSlot } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";

export function CreneauSpecialModal({
  slot,
  activityTypes,
  onClose,
  onSave,
}: {
  slot?: SpecialSlot;
  activityTypes: ActivityType[];
  onClose: () => void;
  onSave: (slot: SpecialSlot) => void;
}) {
  const [startDate, setStartDate] = useState(slot?.startDate ?? "");
  const [endDate, setEndDate] = useState(slot?.endDate ?? "");
  const [start, setStart] = useState(slot?.start ?? "08:00");
  const [end, setEnd] = useState(slot?.end ?? "12:00");
  const [activityTypeId, setActivityTypeId] = useState(slot?.activityTypeId ?? activityTypes[0]?.id ?? "");

  const canSave = startDate && endDate;

  return (
    <Modal title="Ajouter un créneau spécial" subtitle="Exception ponctuelle à la semaine type" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Heure de début</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Heure de fin</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Type d&apos;activité</label>
          <select
            value={activityTypeId}
            onChange={(e) => setActivityTypeId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {activityTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ModalActions
        onCancel={onClose}
        onSave={() => {
          if (!canSave) return;
          const type = activityTypes.find((t) => t.id === activityTypeId);
          onSave({
            id: slot?.id ?? `ss-${Date.now()}`,
            activityTypeId,
            label: type?.name ?? "Créneau",
            startDate,
            endDate,
            allDay: false,
            start,
            end,
            recurrence: slot?.recurrence ?? { frequency: "none" },
          });
        }}
      />
    </Modal>
  );
}
