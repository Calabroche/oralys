"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TeamUser } from "@/types/team";
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
