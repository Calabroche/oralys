"use client";

import { useState } from "react";

export type AgendaViewMode = "jour" | "semaine" | "mois";

const VIEW_LABELS: Record<AgendaViewMode, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
};

interface Props {
  label: string;
  viewMode: AgendaViewMode;
  onViewModeChange: (mode: AgendaViewMode) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onNewAppointment: () => void;
}

export function AgendaToolbar({ label, viewMode, onViewModeChange, onToday, onPrev, onNext, onNewAppointment }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Aujourd&apos;hui
        </button>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Précédent">
            ‹
          </button>
          <button onClick={onNext} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Suivant">
            ›
          </button>
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            {VIEW_LABELS[viewMode]}
            <span className="text-slate-400">▾</span>
          </button>
          {pickerOpen && (
            <>
              <button className="fixed inset-0 z-40" aria-hidden tabIndex={-1} onClick={() => setPickerOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
                {(Object.keys(VIEW_LABELS) as AgendaViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      onViewModeChange(mode);
                      setPickerOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-slate-50 ${
                      mode === viewMode ? "font-medium text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {VIEW_LABELS[mode]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onNewAppointment}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
          aria-label="Nouveau rendez-vous"
        >
          +
        </button>
      </div>
    </div>
  );
}
