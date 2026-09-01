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
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { buildSlotFromChoice } from "@/utils/slotRouting";

export function NouveauTypeModal({
  usedColors,
  referenceDate,
  onClose,
  onSave,
  upsertWeekSlot,
  upsertSpecialSlot,
}: {
  usedColors: ActivityColor[];
  referenceDate: Date;
  onClose: () => void;
  onSave: (type: ActivityType) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState<ActivityColor>(() => firstUnusedColor(usedColors));

  const [day, setDay] = useState<Weekday>("lundi");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [customInterval, setCustomInterval] = useState(2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>("weeks");
  const [endsNever, setEndsNever] = useState(true);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const canSave = name.trim().length > 0;

  return (
    <Modal title="Nouveau type d'activité" onClose={onClose}>
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
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Couleur
            <span className="ml-1 font-normal text-slate-400">— les couleurs déjà utilisées sont marquées !</span>
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} usedColors={usedColors} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Placer ce type dans la semaine type</p>
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
            <div className="grid grid-cols-2 gap-2">
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
      </div>
      <ModalActions
        onCancel={onClose}
        onSave={() => {
          if (!canSave) return;
          const id = `type-${Date.now()}`;
          const trimmedName = name.trim();
          onSave({
            id,
            name: trimmedName,
            description: description.trim() || trimmedName,
            color,
            durationMinutes: duration,
          });

          const result = buildSlotFromChoice(
            {
              day,
              activityTypeId: id,
              activityTypeName: trimmedName,
              start,
              end,
              frequency,
              customInterval,
              customUnit,
              endsNever,
              recurrenceEndDate,
            },
            referenceDate
          );
          if (result.kind === "week") upsertWeekSlot(result.slot);
          else upsertSpecialSlot(result.slot);
        }}
      />
    </Modal>
  );
}
