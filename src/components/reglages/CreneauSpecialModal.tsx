"use client";

import { useState } from "react";
import { ActivityType, RecurrenceFrequency, RecurrenceUnit, SpecialSlot } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "Ne se répète pas" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "custom", label: "Personnalisé" },
];

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
  const [allDay, setAllDay] = useState(slot?.allDay ?? false);
  const [start, setStart] = useState(slot?.start ?? "08:00");
  const [end, setEnd] = useState(slot?.end ?? "12:00");
  const [activityTypeId, setActivityTypeId] = useState(slot?.activityTypeId ?? activityTypes[0]?.id ?? "");

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(slot?.recurrence.frequency ?? "none");
  const [customInterval, setCustomInterval] = useState(slot?.recurrence.customInterval ?? 2);
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(slot?.recurrence.customUnit ?? "weeks");
  const [endsNever, setEndsNever] = useState(!slot?.recurrence.endDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(slot?.recurrence.endDate ?? "");

  const canSave = startDate && endDate && (allDay || (start && end));

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

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-600">Se répète</label>
            <button
              type="button"
              onClick={applyAlternerRaccourci}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Alterner avec ma semaine type
            </button>
          </div>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {frequency === "custom" && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span>Tous les</span>
              <input
                type="number"
                min={1}
                value={customInterval}
                onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as RecurrenceUnit)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="weeks">semaines</option>
                <option value="months">mois</option>
              </select>
            </div>
          )}

          {frequency !== "none" && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Se termine</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={endsNever} onChange={() => setEndsNever(true)} />
                  Jamais
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={!endsNever} onChange={() => setEndsNever(false)} />
                  À une date
                  {!endsNever && (
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="ml-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  )}
                </label>
              </div>
            </div>
          )}
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
