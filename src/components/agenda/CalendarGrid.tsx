"use client";

import { useState } from "react";
import { AbsencePeriod, ActivityType, Appointment, Patient, SpecialSlot, WeekSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES, getColorClasses } from "@/utils/colors";
import { WEEKDAY_LABELS, minutesToDurationLabel, timeToMinutes, toISODate, toWeekday } from "@/utils/date";
import { describeRecurrence, expandRecurrence } from "@/utils/recurrence";
import { laneOf, roomsUsedOnDay } from "@/utils/lanes";

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;
/** Une ligne fine tous les quarts d'heure, comme l'agenda de la prod. */
const QUART = HOUR_HEIGHT / 4;

/** Teinte des bandes d'activité (fond + lignes des quarts d'heure), reprise de la prod : pastel plein largeur. */
const BAND: Record<string, { fill: string; line: string }> = {
  green: { fill: "#ecfdf3", line: "#c7f0d8" },
  teal: { fill: "#e6fbf8", line: "#bdeee6" },
  cyan: { fill: "#e6f8fc", line: "#bcebf5" },
  blue: { fill: "#e9f3fe", line: "#c6dffb" },
  indigo: { fill: "#eef0fe", line: "#d3d8fb" },
  purple: { fill: "#f6ecfe", line: "#e6cdfb" },
  fuchsia: { fill: "#fbeafd", line: "#f1c9f6" },
  pink: { fill: "#fdeef5", line: "#f8cfe2" },
  red: { fill: "#fef0f0", line: "#fbd0d0" },
  orange: { fill: "#fff1ea", line: "#fdd5c2" },
  amber: { fill: "#fff7e6", line: "#fde3a7" },
  yellow: { fill: "#fefbe6", line: "#f8eda5" },
  lime: { fill: "#f3fde3", line: "#dcf5b5" },
  stone: { fill: "#f6f5f3", line: "#e3e0dc" },
  // « Tous motifs » (gris) : créneau ouvert sans activité particulière, blanc comme dans la prod.
  gray: { fill: "#ffffff", line: "#eef1f5" },
};
const bandOf = (color?: string) => BAND[color ?? "gray"] ?? BAND.gray;
const lignes = (line: string) => `repeating-linear-gradient(to bottom, transparent 0, transparent ${QUART - 1}px, ${line} ${QUART - 1}px, ${line} ${QUART}px)`;
const y = (time: string) => ((timeToMinutes(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT;

interface Props {
  days: Date[];
  now: Date;
  appointments: Appointment[];
  activityTypes: ActivityType[];
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  getPatient: (id: string) => Patient;
  /** Salles du praticien affiché : au-delà d'une, les créneaux qui se chevauchent s'affichent côte à côte. */
  rooms: string[];
}

export function CalendarGrid({ days, now, appointments, activityTypes, weekSlots, specialSlots, absencePeriods, getPatient, rooms }: Props) {
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const gridCols = `52px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="bg-white px-3 pb-4">
      {/* En-têtes : jour centré, le jour courant souligné en vert anis comme dans la prod. */}
      <div className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {days.map((day) => {
          const isToday = toISODate(day) === toISODate(now);
          const blockingAllDay = specialSlots.some((slot) => slot.allDay && expandRecurrence(slot, day, day).length > 0);
          const dayAbsences = absencePeriods.filter((absence) => expandRecurrence(absence, day, day).length > 0);
          return (
            <div key={day.toISOString()} className="pt-3 text-center">
              <p className={`text-[15px] ${isToday ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                {WEEKDAY_LABELS[toWeekday(day)!].slice(0, 3)}. {day.getDate()}
              </p>
              <div className={`mx-auto mt-2 h-[3px] rounded-full ${isToday ? "bg-lime-300" : "bg-transparent"}`} />
              <div className="min-h-5 pt-1">
                {blockingAllDay && <p className="text-[11px] text-slate-400">Indisponible</p>}
                {dayAbsences.map((absence) => (
                  <p key={absence.id} className={`truncate text-[11px] ${getColorClasses(absence.color).text}`}>
                    {absence.motif}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative grid gap-3" style={{ gridTemplateColumns: gridCols }}>
        {/* Heures : « 7 h » puis un point par quart d'heure. */}
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute inset-x-0" style={{ top: i * HOUR_HEIGHT }}>
              <span className="absolute right-3 -translate-y-1/2 text-[12px] text-slate-500">{h} h</span>
              <span className="absolute right-0 h-px w-2 -translate-y-1/2 bg-slate-300" />
              {[1, 2, 3].map((q) => (
                <span key={q} className="absolute right-[3px] size-[3px] -translate-y-1/2 rounded-full bg-slate-400/70" style={{ top: q * QUART }} />
              ))}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dateIso = toISODate(day);
          const isToday = dateIso === toISODate(now);
          const dayAppointments = appointments.filter((a) => a.date === dateIso);
          const dayAvailability = weekSlots.filter((slot) => slot.day === toWeekday(day));
          const blockingSlots = specialSlots.filter((slot) => expandRecurrence(slot, day, day).length > 0);
          const blockingAbsences = absencePeriods.filter((absence) => expandRecurrence(absence, day, day).length > 0);
          // Plage où le praticien consulte ce jour-là : blanche ; avant et après, le gris de la journée fermée.
          const ouvert = dayAvailability.length
            ? { top: Math.max(0, Math.min(...dayAvailability.map((s) => y(s.start)))), bottom: Math.min(GRID_HEIGHT, Math.max(...dayAvailability.map((s) => y(s.end)))) }
            : null;
          const lanes = roomsUsedOnDay(dayAvailability, rooms);
          return (
            <div key={dateIso} className="relative overflow-visible rounded-2xl bg-slate-100" style={{ height: GRID_HEIGHT }}>
              {ouvert && (
                <div
                  className="absolute inset-x-0 bg-white"
                  style={{ top: ouvert.top, height: ouvert.bottom - ouvert.top, backgroundImage: lignes("#eef1f5") }}
                />
              )}

              {dayAvailability.map((slot) => {
                const type = activityTypes.find((t) => t.id === slot.activityTypeId);
                if (!type) return null;
                const band = bandOf(type.color);
                const top = y(slot.start);
                const height = y(slot.end) - top;
                const { col, count } = laneOf(slot.room, lanes);
                const laneStyle = count > 1 ? { left: `${(col / count) * 100}%`, width: `${100 / count}%` } : { left: 0, right: 0 };
                return (
                  <div
                    key={slot.id}
                    title={`${type.name} · ${slot.start} → ${slot.end}${slot.room ? ` · ${slot.room}` : ""}`}
                    className="absolute"
                    style={{ top, height, ...laneStyle, backgroundColor: band.fill, backgroundImage: lignes(band.line) }}
                  />
                );
              })}

              {blockingAbsences.map((absence) => {
                const recurrenceLabel = describeRecurrence(absence.recurrence);
                const colors = getColorClasses(absence.color);
                return (
                  <div
                    key={absence.id}
                    className={`absolute inset-0 z-[1] flex flex-col items-center gap-0.5 rounded-2xl ${colors.bg} px-1 pt-3 text-center text-[11px] ${colors.text}`}
                    style={{ backgroundImage: lignes("rgba(148,163,184,0.18)") }}
                  >
                    <span className="font-medium">{absence.motif}</span>
                    {recurrenceLabel && <span className="text-[10px] opacity-70">{recurrenceLabel}</span>}
                  </div>
                );
              })}

              {blockingSlots.map((slot) => {
                const colors = getColorClasses(slot.color);
                const recurrence = slot.recurrence.frequency !== "none" ? " · récurrent" : "";
                if (slot.allDay) {
                  return (
                    <div key={slot.id} className={`absolute inset-0 z-[1] flex justify-center rounded-2xl ${colors.bg} px-1 pt-3 text-center text-[11px] ${colors.text}`}>
                      {slot.label}
                      {recurrence}
                    </div>
                  );
                }
                const top = y(slot.start ?? "00:00");
                const height = Math.max(y(slot.end ?? "00:00") - top, 18);
                return (
                  <div
                    key={slot.id}
                    style={{ top, height }}
                    className={`absolute inset-x-0 z-[1] border-y ${colors.border} ${colors.bg} px-2 py-1 text-[11px] leading-tight ${colors.text}`}
                  >
                    {slot.label}
                    {recurrence}
                  </div>
                );
              })}

              {/* RDV : petite carte blanche, liseré de la couleur de l'activité, nom en gras puis prénom. */}
              {dayAppointments.map((apt) => {
                const type = activityTypes.find((t) => t.id === apt.activityTypeId);
                if (!type) return null;
                const colors = ACTIVITY_COLOR_CLASSES[type.color];
                const top = y(apt.start);
                const height = Math.max(y(apt.end) - top, 22);
                const patient = getPatient(apt.patientId);
                const isOpen = openAppointmentId === apt.id;
                const durationLabel = minutesToDurationLabel(timeToMinutes(apt.end) - timeToMinutes(apt.start));
                const compact = height < 44;
                return (
                  <div key={apt.id} className="absolute inset-x-1 z-[2]" style={{ top }}>
                    <button
                      onClick={() => setOpenAppointmentId(isOpen ? null : apt.id)}
                      style={{ height }}
                      className={`relative w-full overflow-hidden rounded-md border ${colors.border} bg-white py-1 pl-2.5 pr-2 text-left text-[12px] leading-tight text-slate-700 shadow-sm hover:bg-slate-50`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-[3px] rounded-l-md ${colors.dot}`} />
                      {compact ? (
                        <p className="truncate">
                          <b className="font-semibold text-slate-900">{patient.lastName}</b> {patient.firstName}
                        </p>
                      ) : (
                        <>
                          <p className="truncate">
                            <b className="font-semibold text-slate-900">{patient.lastName}</b> {patient.firstName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {apt.start} · {type.name}
                          </p>
                        </>
                      )}
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg bg-slate-900 p-3 shadow-xl">
                        <div className="mb-2 flex items-start justify-between">
                          <p className="text-xs font-medium text-slate-300">
                            {apt.start} → {apt.end}
                          </p>
                          <button onClick={() => setOpenAppointmentId(null)} className="text-slate-400 hover:text-white" aria-label="Fermer">
                            ✕
                          </button>
                        </div>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.chip.replace(/border-\S+/, "")}`}>{type.name}</span>
                        <span className="ml-1.5 text-[11px] text-slate-400">({durationLabel})</span>
                        <p className="mt-2 text-xs text-slate-400">{patient.firstName}</p>
                        <p className="text-base font-semibold text-white">{patient.lastName}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Maintenant : trait rouge sur la journée, l'heure dans une pastille juste à gauche. */}
              {showNowLine && isToday && (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                  <div className="h-[2px] bg-rose-500" />
                  <span className="absolute -left-1 -top-[5px] size-3 rounded-full bg-rose-500" />
                  <span className="absolute right-full top-0 mr-2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[13px] font-medium tabular-nums text-slate-800 shadow-sm">
                    {nowLabel}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
