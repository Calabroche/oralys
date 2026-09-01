"use client";

import { AbsencePeriod, ActivityType, Appointment, SpecialSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { addDays, startOfMonth, startOfWeek, toISODate } from "@/utils/date";
import { expandRecurrence } from "@/utils/recurrence";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface Props {
  month: Date;
  now: Date;
  appointments: Appointment[];
  activityTypes: ActivityType[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  onSelectDay: (date: Date) => void;
}

export function MonthView({ month, now, appointments, activityTypes, specialSlots, absencePeriods, onSelectDay }: Props) {
  const firstOfMonth = startOfMonth(month);
  const gridStart = startOfWeek(firstOfMonth);
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));

  return (
    <div className="bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 text-xs font-medium text-slate-500">
        {DAY_LABELS.map((label) => (
          <div key={label} className="border-l border-slate-200 px-2 py-2 first:border-l-0">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const dateIso = toISODate(day);
          const isCurrentMonth = day.getMonth() === firstOfMonth.getMonth();
          const isToday = dateIso === toISODate(now);
          const dayAppointments = appointments.filter((a) => a.date === dateIso);
          const blockedAllDay = specialSlots.some(
            (slot) => slot.allDay && expandRecurrence(slot, day, day).length > 0
          );
          const dayAbsences = absencePeriods.filter((absence) => expandRecurrence(absence, day, day).length > 0);

          return (
            <button
              key={dateIso}
              onClick={() => onSelectDay(day)}
              className={`flex min-h-24 flex-col items-start gap-1 border-l border-t border-slate-200 px-2 py-1.5 text-left first:border-l-0 hover:bg-slate-50 ${
                isCurrentMonth ? "bg-white" : "bg-slate-50/50"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-slate-900 font-semibold text-white"
                    : isCurrentMonth
                      ? "text-slate-700"
                      : "text-slate-300"
                }`}
              >
                {day.getDate()}
              </span>

              {blockedAllDay && <span className="text-[10px] text-slate-400">🔁 Indisponible</span>}
              {dayAbsences.map((absence) => (
                <span key={absence.id} className={`text-[10px] ${ACTIVITY_COLOR_CLASSES[absence.color].text}`}>
                  🏖 {absence.motif}
                </span>
              ))}

              <div className="flex flex-wrap gap-1">
                {dayAppointments.slice(0, 4).map((apt) => {
                  const type = activityTypes.find((t) => t.id === apt.activityTypeId);
                  const dot = type ? ACTIVITY_COLOR_CLASSES[type.color].dot : "bg-slate-400";
                  return <span key={apt.id} className={`h-1.5 w-1.5 rounded-full ${dot}`} />;
                })}
                {dayAppointments.length > 4 && (
                  <span className="text-[10px] text-slate-400">+{dayAppointments.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
