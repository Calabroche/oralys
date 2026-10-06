"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TeamUser, TimeRange, WeekHours } from "@/types/team";
import { Plus, X } from "lucide-react";
import { DEFAULT_RANGES, dayMinutes, halvesOfRanges, hoursLabel, rangesError, weekMinutes } from "@/lib/horaires";
import { Weekday } from "@/types";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { cn } from "@/lib/utils";

type Schedule = Pick<TeamUser, "workDays" | "halfDays">;
type Slot = "repos" | "matin" | "apres_midi" | "journee";

const OPTIONS: { id: Slot; label: string }[] = [
  { id: "repos", label: "Repos" },
  { id: "matin", label: "Matin" },
  { id: "apres_midi", label: "Après-midi" },
  { id: "journee", label: "Journée" },
];

const slotOf = (s: Schedule, d: Weekday): Slot => (!s.workDays.includes(d) ? "repos" : (s.halfDays?.[d] ?? "journee"));

/** Jours de travail habituels, à la demi-journée près (ex. lundi matin, jeudi toute la journée). */
export function WorkScheduleEditor({ value, onChange, disabled }: { value: Schedule; onChange: (v: Schedule) => void; disabled?: boolean }) {
  function set(d: Weekday, slot: Slot) {
    const workDays = WEEKDAYS.filter((x) => (x === d ? slot !== "repos" : value.workDays.includes(x)));
    const halfDays = { ...value.halfDays };
    if (slot === "matin" || slot === "apres_midi") halfDays[d] = slot;
    else delete halfDays[d];
    onChange({ workDays, halfDays });
  }
  return (
    <div className="divide-y rounded-lg border">
      {WEEKDAYS.map((d) => (
        <div key={d} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span className={cn("w-24 text-sm font-medium", slotOf(value, d) === "repos" ? "text-slate-400" : "text-slate-900")}>{WEEKDAY_LABELS[d]}</span>
          <ToggleGroup type="single" size="sm" variant="outline" disabled={disabled} value={slotOf(value, d)} onValueChange={(v) => v && set(d, v as Slot)}>
            {OPTIONS.map((o) => (
              <ToggleGroupItem key={o.id} value={o.id} className="px-3 text-xs data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}
    </div>
  );
}

/** Pastilles compactes : « Lun », « Mar matin », « Jeu aprèm »… (jours de repos grisés). */
export function WorkScheduleSummary({ user, className }: { user: Schedule; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {WEEKDAYS.map((d) => {
        const slot = slotOf(user, d);
        if (d === "samedi" && slot === "repos") return null;
        return (
          <span
            key={d}
            title={slot === "repos" ? "Repos" : slot === "journee" ? "Journée entière" : slot === "matin" ? "Matin seulement" : "Après-midi seulement"}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              slot === "repos" ? "bg-slate-50 text-slate-400" : slot === "journee" ? "bg-pink-100 text-pink-900" : "border border-dashed border-pink-300 bg-pink-50 text-pink-900"
            )}
          >
            {WEEKDAY_LABELS[d].slice(0, 3)}
            {slot === "matin" && " matin"}
            {slot === "apres_midi" && " aprèm"}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Horaires habituels, plage par plage (ex. 08:30 → 12:30 puis 14:00 → 17:00).
 * Les boutons rapides posent des horaires types, qu'on ajuste ensuite à la minute.
 */
export function HoursEditor({
  value,
  onChange,
  disabled,
  contractHours,
  withLabels,
}: {
  value: WeekHours;
  onChange: (v: WeekHours) => void;
  disabled?: boolean;
  /** Heures du contrat (V3, pointage) : on affiche l'écart avec les heures prévues. */
  contractHours?: number;
  /** Semaine type : chaque plage porte ce que la personne y fait (ex. stérilisation). */
  withLabels?: boolean;
}) {
  const setDay = (d: Weekday, ranges: TimeRange[]) => {
    const next = { ...value };
    if (ranges.length) next[d] = ranges;
    else delete next[d];
    onChange(next);
  };
  const total = weekMinutes(value);
  const diff = contractHours !== undefined ? total - contractHours * 60 : 0;
  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {WEEKDAYS.map((d) => {
          const ranges = value[d] ?? [];
          const halves = halvesOfRanges(ranges);
          const slot: Slot = halves.length === 2 ? "journee" : halves.length === 1 ? halves[0] : "repos";
          const error = rangesError(ranges);
          return (
            <div key={d} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <span className={cn("w-20 text-sm font-medium", ranges.length ? "text-slate-900" : "text-slate-400")}>{WEEKDAY_LABELS[d]}</span>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                disabled={disabled}
                value={slot}
                onValueChange={(v) =>
                  v && setDay(d, v === "repos" ? [] : DEFAULT_RANGES[v as "journee" | "matin" | "apres_midi"].map((r) => ({ ...r, label: ranges[0]?.label })))
                }
                aria-label={`Présence le ${WEEKDAY_LABELS[d].toLowerCase()}`}
              >
                {OPTIONS.map((o) => (
                  <ToggleGroupItem key={o.id} value={o.id} className="px-2.5 text-xs data-[state=on]:bg-pink-100 data-[state=on]:text-pink-900">
                    {o.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {ranges.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-md border bg-white px-1.5 py-0.5">
                    <input
                      type="time"
                      step={900}
                      disabled={disabled}
                      value={r.start}
                      onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                      className="w-[5.5rem] bg-transparent text-xs tabular-nums outline-none"
                      aria-label={`Début de la plage ${i + 1} du ${WEEKDAY_LABELS[d].toLowerCase()}`}
                    />
                    <span className="text-xs text-slate-400">→</span>
                    <input
                      type="time"
                      step={900}
                      disabled={disabled}
                      value={r.end}
                      onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                      className="w-[5.5rem] bg-transparent text-xs tabular-nums outline-none"
                      aria-label={`Fin de la plage ${i + 1} du ${WEEKDAY_LABELS[d].toLowerCase()}`}
                    />
                    {withLabels && (
                      <input
                        type="text"
                        disabled={disabled}
                        value={r.label ?? ""}
                        placeholder="Mission (ex. stérilisation)"
                        onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)))}
                        className="ml-1 w-44 border-l bg-transparent pl-2 text-xs outline-none placeholder:text-slate-300"
                        aria-label={`Mission de la plage ${i + 1} du ${WEEKDAY_LABELS[d].toLowerCase()}`}
                      />
                    )}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => setDay(d, ranges.filter((_, j) => j !== i))}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Retirer la plage"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
                {!disabled && ranges.length > 0 && ranges.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const last = ranges[ranges.length - 1];
                      const start = last.end < "13:00" ? "14:00" : last.end;
                      setDay(d, [...ranges, { start, end: start < "18:00" ? "18:00" : "19:00", label: last.label }]);
                    }}
                    className="flex items-center gap-0.5 text-xs text-pink-700 hover:underline"
                  >
                    <Plus className="size-3" /> plage
                  </button>
                )}
                {error && <span className="text-xs text-rose-600">{error}</span>}
              </div>
              <span className={cn("w-14 text-right text-xs tabular-nums", ranges.length ? "font-medium text-slate-700" : "text-slate-300")}>
                {ranges.length ? hoursLabel(dayMinutes(ranges)) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="flex flex-wrap items-center gap-x-3 text-sm">
        <span>
          Total prévu : <span className="font-semibold">{hoursLabel(total)}</span> par semaine
        </span>
        {contractHours !== undefined && (
          <span className={cn("text-xs", diff === 0 ? "text-emerald-700" : "text-amber-700")}>
            {diff === 0
              ? `conforme au contrat (${contractHours} h)`
              : `contrat : ${contractHours} h, soit ${hoursLabel(Math.abs(diff))} ${diff > 0 ? "de plus" : "de moins"}`}
          </span>
        )}
      </p>
    </div>
  );
}

/** Heures hebdomadaires prévues au contrat (salariés). Le total des horaires y est comparé. */
export function ContractHoursField({
  value,
  onChange,
  disabled,
  id = "contract-hours",
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        Heures du contrat
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={60}
        step={0.5}
        inputMode="decimal"
        disabled={disabled}
        value={value ?? ""}
        placeholder="35"
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Math.max(0, Math.min(60, Number(e.target.value.replace(",", "."))));
          onChange(v === undefined || Number.isNaN(v) ? undefined : v);
        }}
        className="w-20 rounded-md border bg-white px-2 py-1 text-right text-sm tabular-nums disabled:bg-slate-100 disabled:text-slate-500"
      />
      <span className="text-sm text-slate-500">h par semaine</span>
      {disabled && <span className="text-xs text-slate-400">Renseigné par le gestionnaire.</span>}
    </div>
  );
}
