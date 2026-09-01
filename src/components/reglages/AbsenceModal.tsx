"use client";

import { useState } from "react";
import { AbsencePeriod, ActivityColor, RecurrenceFrequency, RecurrenceUnit } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { RecurrenceFields } from "./RecurrenceFields";
import { firstUnusedColor } from "@/utils/colors";

const MOTIF_SUGGESTIONS = ["Congés", "Formation", "Maladie", "Fermeture cabinet", "Autre"];

export function AbsenceModal({
  absence,
  usedColors,
  onClose,
  onSave,
}: {
  absence?: AbsencePeriod;
  usedColors: ActivityColor[];
  onClose: () => void;
  onSave: (absence: AbsencePeriod) => void;
}) {
  const [startDate, setStartDate] = useState(absence?.startDate ?? "");
  const [startTime, setStartTime] = useState(absence?.startTime ?? "00:00");
  const [endDate, setEndDate] = useState(absence?.endDate ?? "");
  const [endTime, setEndTime] = useState(absence?.endTime ?? "23:59");
  const [motif, setMotif] = useState(absence?.motif ?? "");
  const [color, setColor] = useState<ActivityColor>(() => absence?.color ?? firstUnusedColor(usedColors));

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(absence?.recurrence.frequency ?? "none");
  const [customInterval, setCustomInterval] = useState(absence?.recurrence.customInterval ?? 2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(absence?.recurrence.customUnit ?? "weeks");
  const [endsNever, setEndsNever] = useState(!absence?.recurrence.endDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(absence?.recurrence.endDate ?? "");

  const canSave = startDate && endDate && motif.trim().length > 0;

  function applyAlternerRaccourci() {
    setFrequency("biweekly");
    setEndsNever(true);
    if (!endDate) setEndDate(startDate);
  }

  return (
    <Modal title="Ajouter une période d'absence" onClose={onClose}>
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
            <label className="mb-1 block text-xs font-medium text-slate-600">À partir de</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Jusqu&apos;à</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Motif
            <span className="ml-1 font-normal text-slate-400">— choisissez une suggestion ou écrivez le vôtre</span>
          </label>
          <input
            list="motif-suggestions"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : Congés, Formation, RDV personnel..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <datalist id="motif-suggestions">
            {MOTIF_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
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
          onSave({
            id: absence?.id ?? `abs-${Date.now()}`,
            motif: motif.trim(),
            color,
            startDate,
            startTime,
            endDate,
            endTime,
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
