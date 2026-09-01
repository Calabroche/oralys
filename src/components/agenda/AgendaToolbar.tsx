"use client";

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
}

export function AgendaToolbar({ label, viewMode, onViewModeChange, onToday, onPrev, onNext }: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Aujourd&apos;hui
        </button>
        <span className="hidden h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 sm:flex" aria-hidden>
          📅
        </span>
        <div className="flex items-center rounded-full bg-slate-100 p-0.5 text-xs font-medium">
          {(Object.keys(VIEW_LABELS) as AgendaViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`rounded-full px-2.5 py-1 ${
                mode === viewMode ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Précédent">
            ‹
          </button>
          <button onClick={onNext} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Suivant">
            ›
          </button>
        </div>
      </div>

      <span className="justify-self-center whitespace-nowrap text-base font-semibold text-slate-800">{label}</span>

      <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
        <span className="flex items-center gap-1">
          Flore Perche
          <span className="text-xs text-slate-400">▾</span>
        </span>
        <span className="text-slate-400" aria-hidden>
          👁
        </span>
        <span className="text-slate-400" aria-hidden>
          ⋯
        </span>
      </div>
    </div>
  );
}
