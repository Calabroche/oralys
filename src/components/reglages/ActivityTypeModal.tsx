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
import { WEEKDAYS, WEEKDAY_LABELS, timeToMinutes } from "@/utils/date";
import { buildSlotFromChoice } from "@/utils/slotRouting";

export function ActivityTypeModal({
  existing,
  usedColors,
  referenceDate,
  onClose,
  onSave,
  onDelete,
  upsertWeekSlot,
  upsertSpecialSlot,
}: {
  existing?: ActivityType;
  usedColors: ActivityColor[];
  referenceDate: Date;
  onClose: () => void;
  onSave: (type: ActivityType) => void;
  onDelete?: (id: string) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
}) {
  const isEditing = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 30);
  const [color, setColor] = useState<ActivityColor>(() => existing?.color ?? firstUnusedColor(usedColors));

  const [days, setDays] = useState<Weekday[]>(["lundi"]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [customInterval, setCustomInterval] = useState(2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>("weeks");
  const [endsNever, setEndsNever] = useState(true);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  function toggleDay(d: Weekday) {
    setDays((prev) => {
      if (prev.includes(d)) {
        return prev.length > 1 ? prev.filter((x) => x !== d) : prev;
      }
      return [...prev, d];
    });
  }

  const canSave = name.trim().length > 0 && (isEditing || days.length > 0);

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

        {isEditing && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Durée (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Couleur
            <span className="ml-1 font-normal text-slate-400">— les couleurs déjà utilisées sont marquées !</span>
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} usedColors={usedColors} />
        </div>

        {!isEditing && (
          <>
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
          </>
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

          if (isEditing && existing) {
            onSave({
              ...existing,
              name: trimmedName,
              description: description.trim() || trimmedName,
              color,
              durationMinutes: duration,
            });
            return;
          }

          const id = `type-${Date.now()}`;
          const computedDuration = Math.max(timeToMinutes(end) - timeToMinutes(start), 5);
          onSave({
            id,
            name: trimmedName,
            description: description.trim() || trimmedName,
            color,
            durationMinutes: computedDuration,
          });

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
