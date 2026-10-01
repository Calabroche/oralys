"use client";

import { ActivityType, Appointment, Patient } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { minutesToDurationLabel, timeToMinutes, toISODate } from "@/utils/date";
import { laneOf, roomsUsedOnDay } from "@/utils/lanes";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 88; // px — plus spacieux qu'un agenda en grille, pour ressembler au journal d'activité réel
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface Props {
  date: Date;
  now: Date;
  appointments: Appointment[];
  activityTypes: ActivityType[];
  /** Salles du praticien affiché : au-delà d'une, les rendez-vous qui se chevauchent s'affichent côte à côte. */
  rooms: string[];
  getPatient: (id: string) => Patient;
}

/**
 * Vue « Activité » : le journal du jour pour un praticien, en une seule colonne — comme le vrai
 * produit. Quand deux salles sont actives en même temps, elles s'affichent côte à côte dans cette
 * même colonne : on voit au premier coup d'œil que le praticien tient deux salles à la fois.
 */
export function ActiviteDayView({ date, now, appointments, activityTypes, rooms, getPatient }: Props) {
  const dateIso = toISODate(date);
  const dayAppointments = appointments.filter((a) => a.date === dateIso);
  const lanes = roomsUsedOnDay(dayAppointments, rooms);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = toISODate(now) === dateIso && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="flex bg-white">
      <div className="relative w-16 shrink-0">
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100 pr-3 text-right text-xs text-slate-400">
            {h} h
          </div>
        ))}
        {showNowLine && (
          <span
            className="absolute right-[-18px] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-rose-300 bg-white text-[0.68rem] font-semibold text-rose-500 shadow-sm"
            style={{ top: nowTop }}
          >
            {nowLabel}
          </span>
        )}
      </div>

      <div className="relative flex-1 border-l border-slate-200" style={{ height: HOUR_HEIGHT * HOURS.length }}>
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
        ))}

        {dayAppointments.length === 0 && (
          <p className="absolute inset-x-0 top-10 text-center text-sm text-slate-400">Aucun rendez-vous ce jour-là.</p>
        )}

        {dayAppointments.map((apt) => {
          const type = activityTypes.find((t) => t.id === apt.activityTypeId);
          if (!type) return null;
          const colors = ACTIVITY_COLOR_CLASSES[type.color];
          const top = ((timeToMinutes(apt.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const height = Math.max(((timeToMinutes(apt.end) - timeToMinutes(apt.start)) / 60) * HOUR_HEIGHT, 56);
          const patient = getPatient(apt.patientId);
          const { col, count } = laneOf(apt.room, lanes);
          const laneStyle =
            count > 1
              ? { left: `calc(${(col / count) * 100}% + 6px)`, width: `calc(${100 / count}% - 12px)` }
              : { left: 12, right: 12 };
          const durationLabel = minutesToDurationLabel(timeToMinutes(apt.end) - timeToMinutes(apt.start));
          return (
            <div
              key={apt.id}
              style={{ top, height, ...laneStyle }}
              className={`absolute overflow-hidden rounded-lg border px-3 py-2 ${colors.border} ${colors.bg} ${colors.text}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {patient.lastName} {patient.firstName}
                  </p>
                  <p className="truncate text-xs opacity-80">{type.name}</p>
                  {count > 1 && apt.room && <p className="mt-0.5 truncate text-[0.65rem] font-medium opacity-70">🏠 {apt.room}</p>}
                </div>
                <div className="shrink-0 text-right text-xs opacity-70">
                  <p className="font-semibold">{apt.start}</p>
                  <p>{durationLabel}</p>
                </div>
              </div>
              {height > 72 && (
                <div className="mt-2 flex items-center gap-2 text-xs opacity-50">
                  <span title="Facturation">€</span>
                  <span title="Copier">📋</span>
                </div>
              )}
            </div>
          );
        })}

        {showNowLine && (
          <div className="absolute inset-x-0 z-10 border-t-2 border-rose-400" style={{ top: nowTop }}>
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-400" />
          </div>
        )}
      </div>
    </div>
  );
}
