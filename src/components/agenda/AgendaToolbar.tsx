"use client";

import { useAgendaData } from "@/context/AgendaDataContext";
import { SOINS_PRATICIENS } from "@/data/mockData";
import { DayCountPicker } from "@/components/shared/DayCountPicker";
import { cn } from "@/lib/utils";

export type AgendaViewMode = "jour" | "semaine" | "jours" | "mois";

const VIEW_LABELS: Record<Exclude<AgendaViewMode, "jours">, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
};

interface Props {
  label: string;
  viewMode: AgendaViewMode;
  onViewModeChange: (mode: AgendaViewMode) => void;
  customDays: number;
  onCustomDaysChange: (days: number) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function AgendaToolbar({ label, viewMode, onViewModeChange, customDays, onCustomDaysChange, onToday, onPrev, onNext }: Props) {
  // Un agenda par praticien : on bascule de l'un à l'autre (créneaux, RDV et absences Team suivent).
  const { agendaPraticienId, setAgendaPraticienId } = useAgendaData();
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
        <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 text-xs font-medium">
          {(["jour", "semaine"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn("rounded-full px-2.5 py-1", mode === viewMode ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:text-slate-700")}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
          <DayCountPicker
            value={customDays}
            active={viewMode === "jours"}
            onChange={(days) => {
              onCustomDaysChange(days);
              onViewModeChange("jours");
            }}
            activeClassName="bg-lime-300 text-slate-900"
          />
          <button
            onClick={() => onViewModeChange("mois")}
            className={cn("rounded-full px-2.5 py-1", viewMode === "mois" ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            {VIEW_LABELS.mois}
          </button>
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
        <select
          value={agendaPraticienId}
          onChange={(e) => setAgendaPraticienId(e.target.value)}
          aria-label="Agenda du praticien"
          className="rounded-md border border-transparent bg-transparent py-1 pr-1 text-sm font-medium text-slate-700 hover:border-slate-200 hover:bg-slate-50"
        >
          {SOINS_PRATICIENS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
