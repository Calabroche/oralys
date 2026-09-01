"use client";

import { RecurrenceFrequency, RecurrenceUnit } from "@/types";

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "Ne se répète pas" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "custom", label: "Personnalisé" },
];

interface Props {
  frequency: RecurrenceFrequency;
  onFrequencyChange: (frequency: RecurrenceFrequency) => void;
  customInterval: number;
  onCustomIntervalChange: (interval: number) => void;
  customUnit: RecurrenceUnit;
  onCustomUnitChange: (unit: RecurrenceUnit) => void;
  endsNever: boolean;
  onEndsNeverChange: (endsNever: boolean) => void;
  recurrenceEndDate: string;
  onRecurrenceEndDateChange: (date: string) => void;
  onAlternerRaccourci: () => void;
}

export function RecurrenceFields({
  frequency,
  onFrequencyChange,
  customInterval,
  onCustomIntervalChange,
  customUnit,
  onCustomUnitChange,
  endsNever,
  onEndsNeverChange,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  onAlternerRaccourci,
}: Props) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-xs font-medium text-slate-600">Se répète</label>
        <button
          type="button"
          onClick={onAlternerRaccourci}
          className="text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          Alterner avec ma semaine type
        </button>
      </div>
      <select
        value={frequency}
        onChange={(e) => onFrequencyChange(e.target.value as RecurrenceFrequency)}
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
            onChange={(e) => onCustomIntervalChange(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            value={customUnit}
            onChange={(e) => onCustomUnitChange(e.target.value as RecurrenceUnit)}
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
              <input type="radio" checked={endsNever} onChange={() => onEndsNeverChange(true)} />
              Jamais
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" checked={!endsNever} onChange={() => onEndsNeverChange(false)} />
              À une date
              {!endsNever && (
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
                  className="ml-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                />
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
