"use client";

import { useState } from "react";
import {
  ActivityColor,
  ActivityType,
  RecurrenceFrequency,
  RecurrenceUnit,
  SpecialSlot,
  Weekday,
  WeekSlot,
} from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { RecurrenceFields } from "./RecurrenceFields";
import { firstUnusedColor } from "@/utils/colors";
import { WEEKDAYS, WEEKDAY_LABELS, fromISODate, timeToMinutes, toWeekday } from "@/utils/date";
import { buildSlotFromChoice } from "@/utils/slotRouting";

export function ActivityTypeModal({
  existing,
  usedColors,
  referenceDate,
  weekSlots,
  specialSlots,
  onClose,
  onSave,
  onDelete,
  upsertWeekSlot,
  deleteWeekSlot,
  upsertSpecialSlot,
  deleteSpecialSlot,
}: {
  existing?: ActivityType;
  usedColors: ActivityColor[];
  referenceDate: Date;
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  onClose: () => void;
  onSave: (type: ActivityType) => void;
  onDelete?: (id: string) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
}) {
  const isEditing = Boolean(existing);

  // Placements existants de ce type, pour préremplir le formulaire et les
  // remplacer à l'enregistrement (les créneaux "toute la journée" restent
  // hors de ce formulaire, ce sont des indisponibilités, pas des créneaux
  // programmés pour ce type).
  const existingWeekSlots = existing ? weekSlots.filter((s) => s.activityTypeId === existing.id) : [];
  const existingSpecials = existing
    ? specialSlots.filter((s) => s.activityTypeId === existing.id && !s.allDay)
    : [];

  function initialDays(): Weekday[] {
    const fromWeek = existingWeekSlots.map((s) => s.day);
    const fromSpecial = existingSpecials
      .map((s) => toWeekday(fromISODate(s.startDate)))
      .filter((d): d is Weekday => d !== null);
    const combined = Array.from(new Set([...fromWeek, ...fromSpecial]));
    return combined.length > 0 ? combined : ["lundi"];
  }

  function initialSchedule() {
    const fromWeek = existingWeekSlots[0];
    if (fromWeek) {
      return {
        start: fromWeek.start,
        end: fromWeek.end,
        frequency: "weekly" as RecurrenceFrequency,
        endsNever: true,
        customInterval: 2,
        customUnit: "weeks" as RecurrenceUnit,
        recurrenceEndDate: "",
      };
    }
    const fromSpecial = existingSpecials[0];
    if (fromSpecial) {
      return {
        start: fromSpecial.start ?? "09:00",
        end: fromSpecial.end ?? "10:00",
        frequency: fromSpecial.recurrence.frequency,
        endsNever: !fromSpecial.recurrence.endDate,
        customInterval: fromSpecial.recurrence.customInterval ?? 2,
        customUnit: fromSpecial.recurrence.customUnit ?? "weeks",
        recurrenceEndDate: fromSpecial.recurrence.endDate ?? "",
      };
    }
    return {
      start: "09:00",
      end: "10:00",
      frequency: "weekly" as RecurrenceFrequency,
      endsNever: true,
      customInterval: 2,
      customUnit: "weeks" as RecurrenceUnit,
      recurrenceEndDate: "",
    };
  }

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [color, setColor] = useState<ActivityColor>(() => existing?.color ?? firstUnusedColor(usedColors));

  const [days, setDays] = useState<Weekday[]>(initialDays);
  const initialScheduleValue = initialSchedule();
  const [start, setStart] = useState(initialScheduleValue.start);
  const [end, setEnd] = useState(initialScheduleValue.end);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initialScheduleValue.frequency);
  const [customInterval, setCustomInterval] = useState(initialScheduleValue.customInterval);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(initialScheduleValue.customUnit);
  const [endsNever, setEndsNever] = useState(initialScheduleValue.endsNever);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialScheduleValue.recurrenceEndDate);

  function toggleDay(d: Weekday) {
    setDays((prev) => {
      if (prev.includes(d)) {
        return prev.length > 1 ? prev.filter((x) => x !== d) : prev;
      }
      return [...prev, d];
    });
  }

  const canSave = name.trim().length > 0 && days.length > 0;

  return (
    <Modal title={isEditing ? "Modifier le type d'activité" : "Nouveau type d'activité"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Orthodontie"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : Pose de bagues, suivi"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Couleur
            <span className="ml-1 font-normal text-slate-400">— les couleurs déjà utilisées sont marquées !</span>
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} usedColors={usedColors} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Placer ce type dans la semaine type</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Jour(s)
              <span className="ml-1 font-normal text-slate-400">— sélection multiple possible</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const isSelected = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {WEEKDAY_LABELS[d]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
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
          <p className="text-xs text-slate-400">Placé dans la Semaine type.</p>
        ) : (
          <p className="text-xs text-slate-400">
            Placé comme un Créneau spécial récurrent — visible aussi dans la section « Créneaux spéciaux ».
          </p>
        )}
        {isEditing && (
          <p className="text-xs text-slate-400">
            Remplace {existingWeekSlots.length + existingSpecials.length > 0 ? "le placement existant" : "l'absence de placement"} de ce type dans l&apos;agenda par celui ci-dessus.
          </p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        {isEditing && existing && onDelete ? (
          <button
            onClick={() => {
              if (window.confirm(`Supprimer le type "${existing.name}" ?`)) onDelete(existing.id);
            }}
            className="text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <ModalActions
          onCancel={onClose}
          onSave={() => {
            if (!canSave) return;
            const trimmedName = name.trim();
            const computedDuration = Math.max(timeToMinutes(end) - timeToMinutes(start), 5);

            const id = isEditing && existing ? existing.id : `type-${Date.now()}`;
            onSave({
              id,
              name: trimmedName,
              description: description.trim() || trimmedName,
              color,
              durationMinutes: computedDuration,
              locked: existing?.locked,
            });

            if (isEditing) {
              existingWeekSlots.forEach((s) => deleteWeekSlot(s.id));
              existingSpecials.forEach((s) => deleteSpecialSlot(s.id));
            }

            const savedAt = Date.now();
            days.forEach((day) => {
              const result = buildSlotFromChoice(
                {
                  day,
                  activityTypeId: id,
                  activityTypeName: trimmedName,
                  activityColor: color,
                  start,
                  end,
                  frequency,
                  customInterval,
                  customUnit,
                  endsNever,
                  recurrenceEndDate,
                },
                referenceDate,
                `slot-${savedAt}-${day}`
              );
              if (result.kind === "week") upsertWeekSlot(result.slot);
              else upsertSpecialSlot(result.slot);
            });
          }}
        />
      </div>
    </Modal>
  );
}
