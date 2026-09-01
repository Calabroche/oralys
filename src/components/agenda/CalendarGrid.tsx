"use client";

import { useState } from "react";
import { AbsencePeriod, ActivityType, Appointment, Patient, SpecialSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { WEEKDAY_LABELS, minutesToDurationLabel, timeToMinutes, toISODate, toWeekday } from "@/utils/date";
import { describeRecurrence, expandRecurrence } from "@/utils/recurrence";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 48; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface Props {
  days: Date[];
  now: Date;
  appointments: Appointment[];
  activityTypes: ActivityType[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  getPatient: (id: string) => Patient;
}

export function CalendarGrid({ days, now, appointments, activityTypes, specialSlots, absencePeriods, getPatient }: Props) {
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const gridCols = `56px repeat(${days.length}, 1fr)`;

  return (
    <div className="bg-white">
      <div className="grid" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {days.map((day) => {
          const isToday = toISODate(day) === toISODate(now);
          const blockingAllDay = specialSlots.some(
            (slot) => slot.allDay && expandRecurrence(slot, day, day).length > 0
          );
          const dayAbsences = absencePeriods.filter((absence) => expandRecurrence(absence, day, day).length > 0);
          return (
            <div key={day.toISOString()} className="border-l border-slate-200 px-2 py-2 text-xs text-slate-500">
              <p className={isToday ? "font-semibold text-sky-600" : "font-medium text-slate-700"}>
                {WEEKDAY_LABELS[toWeekday(day)!].slice(0, 3)}. {day.getDate()}
              </p>
              {blockingAllDay && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">🔁 Indisponible</p>
              )}
              {dayAbsences.map((absence) => (
                <p key={absence.id} className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                  🏖 {absence.motif}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="relative grid" style={{ gridTemplateColumns: gridCols }}>
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
          const blockingSlots = specialSlots.filter((slot) => expandRecurrence(slot, day, day).length > 0);
          const blockingAbsences = absencePeriods.filter((absence) => expandRecurrence(absence, day, day).length > 0);
          return (
            <div key={dateIso} className="relative border-l border-slate-200" style={{ height: HOUR_HEIGHT * HOURS.length }}>
              {HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
              ))}

              {blockingAbsences.map((absence) => {
                const recurrenceLabel = describeRecurrence(absence.recurrence);
                return (
                  <div
                    key={absence.id}
                    className="absolute inset-x-0 top-0 z-0 flex flex-col items-center justify-start gap-0.5 border-b border-amber-200 bg-amber-50 px-1 pt-2 text-center text-[11px] text-amber-700"
                    style={{ height: HOUR_HEIGHT * HOURS.length }}
                  >
                    <span>🏖 {absence.motif}</span>
                    {recurrenceLabel && <span className="text-[10px] text-amber-500">🔁 {recurrenceLabel}</span>}
                  </div>
                );
              })}

              {blockingSlots.map((slot) => {
                const recurrenceLabel = slot.recurrence.frequency !== "none" ? " 🔁" : "";
                if (slot.allDay) {
                  return (
                    <div
                      key={slot.id}
                      className="absolute inset-x-0 top-0 z-0 flex items-start justify-center border-b border-slate-200 bg-slate-50 px-1 pt-2 text-center text-[11px] text-slate-400"
                      style={{ height: HOUR_HEIGHT * HOURS.length }}
                    >
                      {slot.label}
                      {recurrenceLabel}
                    </div>
                  );
                }
                const top = ((timeToMinutes(slot.start ?? "00:00") - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  ((timeToMinutes(slot.end ?? "00:00") - timeToMinutes(slot.start ?? "00:00")) / 60) * HOUR_HEIGHT,
                  18
                );
                return (
                  <div
                    key={slot.id}
                    style={{ top, height }}
                    className="absolute inset-x-1 z-0 rounded-md border border-dashed border-slate-300 bg-slate-50 px-1.5 py-1 text-left text-[11px] leading-tight text-slate-400"
                  >
                    {slot.label}
                    {recurrenceLabel}
                  </div>
                );
              })}

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
