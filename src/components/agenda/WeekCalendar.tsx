"use client";

import { useState } from "react";
import { ActivityType, Appointment, Patient } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  addDays,
  formatWeekRange,
  minutesToDurationLabel,
  timeToMinutes,
  toISODate,
  toWeekday,
} from "@/utils/date";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 48; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface Props {
  weekStart: Date;
  onWeekStartChange: (date: Date) => void;
  now: Date;
  appointments: Appointment[];
  activityTypes: ActivityType[];
  getPatient: (id: string) => Patient;
  onNewAppointment: () => void;
}

export function WeekCalendar({
  weekStart,
  onWeekStartChange,
  now,
  appointments,
  activityTypes,
  getPatient,
  onNewAppointment,
}: Props) {
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  const days = WEEKDAYS.filter((d) => d !== "samedi").map((_, i) => addDays(weekStart, i));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onWeekStartChange(new Date(now))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Aujourd&apos;hui
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onWeekStartChange(addDays(weekStart, -7))}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Semaine précédente"
            >
              ‹
            </button>
            <button
              onClick={() => onWeekStartChange(addDays(weekStart, 7))}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Semaine suivante"
            >
              ›
            </button>
          </div>
          <span className="text-sm font-medium text-slate-700">{formatWeekRange(weekStart)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Semaine</span>
          <button
            onClick={onNewAppointment}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
            aria-label="Nouveau rendez-vous"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[56px_repeat(5,1fr)]">
        <div />
        {days.map((day) => {
          const isToday = toISODate(day) === toISODate(now);
          return (
            <div key={day.toISOString()} className="border-l border-slate-200 px-2 py-2 text-xs text-slate-500">
              <p className={isToday ? "font-semibold text-sky-600" : "font-medium text-slate-700"}>
                {WEEKDAY_LABELS[toWeekday(day)!].slice(0, 3)}. {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative grid grid-cols-[56px_repeat(5,1fr)]">
        <div>
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100 pr-2 text-right text-[11px] text-slate-400">
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dateIso = toISODate(day);
          const dayAppointments = appointments.filter((a) => a.date === dateIso);
          return (
            <div key={dateIso} className="relative border-l border-slate-200" style={{ height: HOUR_HEIGHT * HOURS.length }}>
              {HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
              ))}

              {dayAppointments.map((apt) => {
                const type = activityTypes.find((t) => t.id === apt.activityTypeId);
                if (!type) return null;
                const colors = ACTIVITY_COLOR_CLASSES[type.color];
                const top = ((timeToMinutes(apt.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(((timeToMinutes(apt.end) - timeToMinutes(apt.start)) / 60) * HOUR_HEIGHT, 18);
                const patient = getPatient(apt.patientId);
                const isOpen = openAppointmentId === apt.id;
                return (
                  <div key={apt.id} className="absolute inset-x-1" style={{ top }}>
                    <button
                      onClick={() => setOpenAppointmentId(isOpen ? null : apt.id)}
                      style={{ height }}
                      className={`w-full rounded-md border ${colors.border} ${colors.bg} px-1.5 py-1 text-left text-[11px] leading-tight ${colors.text} hover:brightness-95`}
                    >
                      <p className="truncate font-medium">{patient.firstName} {patient.lastName}</p>
                      {height > 28 && <p className="truncate opacity-80">{apt.start}</p>}
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        <div className="mb-2 flex items-start justify-between">
                          <p className="text-xs font-medium text-slate-500">
                            {apt.start} → {apt.end}
                          </p>
                          <button
                            onClick={() => setOpenAppointmentId(null)}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label="Fermer"
                          >
                            ✕
                          </button>
                        </div>
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors.chip}`}>
                          {type.name} ({minutesToDurationLabel(timeToMinutes(apt.end) - timeToMinutes(apt.start))})
                        </span>
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {patient.firstName}
                          <br />
                          {patient.lastName}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {showNowLine && toISODate(day) === toISODate(now) && (
                <div
                  className="absolute inset-x-0 z-10 border-t-2 border-rose-400"
                  style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                >
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
