"use client";

import { useState } from "react";
import {
  ActivityType,
  RecurrenceFrequency,
  RecurrenceUnit,
  SpecialSlot,
  Weekday,
  WeekSlot,
} from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { RecurrenceFields } from "./RecurrenceFields";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { buildSlotFromChoice } from "@/utils/slotRouting";

export interface EditableSlot {
  origin?: "week" | "special";
  id?: string;
  day: Weekday;
  activityTypeId: string;
  start: string;
  end: string;
  frequency: RecurrenceFrequency;
  customInterval?: number;
  customUnit?: RecurrenceUnit;
  recurrenceEndDate?: string | null;
}

export function WeekSlotModal({
  initial,
  activityTypes,
  referenceDate,
  onClose,
  upsertWeekSlot,
  deleteWeekSlot,
  upsertSpecialSlot,
  deleteSpecialSlot,
}: {
  initial: EditableSlot;
  activityTypes: ActivityType[];
  referenceDate: Date;
  onClose: () => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
}) {
  const [day, setDay] = useState<Weekday>(initial.day);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [activityTypeId, setActivityTypeId] = useState(initial.activityTypeId || activityTypes[0]?.id || "");

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initial.frequency === "none" ? "weekly" : initial.frequency
  );
  const [customInterval, setCustomInterval] = useState(initial.customInterval ?? 2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(initial.customUnit ?? "weeks");
  const [endsNever, setEndsNever] = useState(!initial.recurrenceEndDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initial.recurrenceEndDate ?? "");

  const activityType = activityTypes.find((t) => t.id === activityTypeId);

  function handleDelete() {
    if (initial.origin === "week" && initial.id) deleteWeekSlot(initial.id);
    else if (initial.origin === "special" && initial.id) deleteSpecialSlot(initial.id);
    onClose();
  }

  function handleSave() {
    const result = buildSlotFromChoice(
      {
        day,
        activityTypeId,
        activityTypeName: activityType?.name ?? "Créneau",
        start,
        end,
        frequency,
        customInterval,
        customUnit,
        endsNever,
        recurrenceEndDate,
      },
      referenceDate,
      initial.id
    );

    if (result.kind === "week") {
      upsertWeekSlot(result.slot);
      if (initial.origin === "special" && initial.id) deleteSpecialSlot(initial.id);
    } else {
      upsertSpecialSlot(result.slot);
      if (initial.origin === "week" && initial.id) deleteWeekSlot(initial.id);
    }
    onClose();
  }

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

        <RecurrenceFields
          allowNone={false}
          frequency={frequency}
          onFrequencyChange={setFrequency}
          customInterval={customInterval}
          onCustomIntervalChange={setCustomInterval}
          customUnit={customUnit}
          onCustomUnitChange={setCustomUnit}
          endsNever={endsNever}
          onEndsNeverChange={setEndsNever}
          recurrenceEndDate={recurrenceEndDate}
          onRecurrenceEndDateChange={setRecurrenceEndDate}
        />
        {frequency === "weekly" && endsNever ? (
          <p className="text-xs text-slate-400">Enregistré dans la Semaine type, comme aujourd&apos;hui.</p>
        ) : (
          <p className="text-xs text-slate-400">
            Enregistré comme un Créneau spécial récurrent — visible aussi dans la section « Créneaux spéciaux ».
          </p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        {initial.id ? (
          <button onClick={handleDelete} className="text-sm font-medium text-rose-600 hover:text-rose-700">
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <ModalActions onCancel={onClose} onSave={handleSave} />
      </div>
    </Modal>
  );
}
