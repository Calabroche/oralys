"use client";

import { useState } from "react";
import { ActivityColor, ActivityType, RecurrenceFrequency, RecurrenceUnit, SpecialSlot } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { RecurrenceFields } from "./RecurrenceFields";
import { firstUnusedColor } from "@/utils/colors";
import { timeToMinutes } from "@/utils/date";

export function CreneauSpecialModal({
  slot,
  activityTypes,
  usedColors,
  onClose,
  onSave,
  onCreateType,
}: {
  slot?: SpecialSlot;
  activityTypes: ActivityType[];
  usedColors: ActivityColor[];
  onClose: () => void;
  onSave: (slot: SpecialSlot) => void;
  onCreateType: (type: ActivityType) => void;
}) {
  const [startDate, setStartDate] = useState(slot?.startDate ?? "");
  const [endDate, setEndDate] = useState(slot?.endDate ?? "");
  const [allDay, setAllDay] = useState(slot?.allDay ?? false);
  const [start, setStart] = useState(slot?.start ?? "08:00");
  const [end, setEnd] = useState(slot?.end ?? "12:00");
  const initialTypeName = slot
    ? activityTypes.find((t) => t.id === slot.activityTypeId)?.name ?? ""
    : activityTypes[0]?.name ?? "";
  const [typeName, setTypeName] = useState(initialTypeName);
  const [color, setColor] = useState<ActivityColor>(() => slot?.color ?? firstUnusedColor(usedColors));

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(slot?.recurrence.frequency ?? "none");
  const [customInterval, setCustomInterval] = useState(slot?.recurrence.customInterval ?? 2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(slot?.recurrence.customUnit ?? "weeks");
  const [endsNever, setEndsNever] = useState(!slot?.recurrence.endDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(slot?.recurrence.endDate ?? "");

  const canSave = startDate && endDate && typeName.trim().length > 0 && (allDay || (start && end));

  function applyAlternerRaccourci() {
    setFrequency("biweekly");
    setEndsNever(true);
    if (!endDate) setEndDate(startDate);
  }

  return (
    <Modal title="Ajouter un créneau spécial" subtitle="Exception ponctuelle à la semaine type" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate) setEndDate(e.target.value);
              }}
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

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded border-slate-300" />
          Indisponible toute la journée
        </label>

        {!allDay && (
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
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Type d&apos;activité
            <span className="ml-1 font-normal text-slate-400">— choisissez-en un ou écrivez-en un nouveau</span>
          </label>
          <input
            list="activity-type-suggestions"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="Ex : Consultation, Urgences..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <datalist id="activity-type-suggestions">
            {activityTypes.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Couleur
            <span className="ml-1 font-normal text-slate-400">— les couleurs déjà utilisées sont marquées !</span>
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} usedColors={usedColors} />
        </div>

        <RecurrenceFields
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
          onAlternerRaccourci={applyAlternerRaccourci}
        />
      </div>
      <ModalActions
        onCancel={onClose}
        onSave={() => {
          if (!canSave) return;
          const trimmedTypeName = typeName.trim();
          let type = activityTypes.find((t) => t.name.toLowerCase() === trimmedTypeName.toLowerCase());
          if (!type) {
            type = {
              id: `type-${Date.now()}`,
              name: trimmedTypeName,
              description: trimmedTypeName,
              color: firstUnusedColor(activityTypes.map((t) => t.color)),
              durationMinutes: allDay ? 30 : Math.max(timeToMinutes(end) - timeToMinutes(start), 5),
            };
            onCreateType(type);
          }
          onSave({
            id: slot?.id ?? `ss-${Date.now()}`,
            activityTypeId: type.id,
            label: type.name,
            color,
            startDate,
            endDate,
            allDay,
            start: allDay ? undefined : start,
            end: allDay ? undefined : end,
            recurrence: {
              frequency,
              customInterval: frequency === "custom" ? customInterval : undefined,
              customUnit: frequency === "custom" ? customUnit : undefined,
              endDate: frequency === "none" || endsNever ? null : recurrenceEndDate || null,
            },
          });
        }}
      />
    </Modal>
  );
}
