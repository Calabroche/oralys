"use client";

import { useState } from "react";
import { ActivityType, Weekday, WeekSlot } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";

export function WeekSlotModal({
  slot,
  activityTypes,
  onClose,
  onSave,
  onDelete,
}: {
  slot: WeekSlot | { day: Weekday };
  activityTypes: ActivityType[];
  onClose: () => void;
  onSave: (slot: WeekSlot) => void;
  onDelete?: (id: string) => void;
}) {
  const existing = "id" in slot ? slot : null;
  const [day, setDay] = useState<Weekday>(slot.day);
  const [start, setStart] = useState(existing?.start ?? "09:00");
  const [end, setEnd] = useState(existing?.end ?? "10:00");
  const [activityTypeId, setActivityTypeId] = useState(existing?.activityTypeId ?? activityTypes[0]?.id ?? "");

  const activityType = activityTypes.find((t) => t.id === activityTypeId);

  return (
    <Modal title={activityType?.name ?? "Créneau"} subtitle={activityType?.description} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Jour</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as Weekday)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABELS[d]}
                </option>
              ))}
            </select>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Début</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Fin</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        {existing && onDelete ? (
          <button
            onClick={() => onDelete(existing.id)}
            className="text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <ModalActions
          onCancel={onClose}
          onSave={() =>
            onSave({
              id: existing?.id ?? `ws-${Date.now()}`,
              day,
              activityTypeId,
              start,
              end,
            })
          }
        />
      </div>
    </Modal>
  );
}
