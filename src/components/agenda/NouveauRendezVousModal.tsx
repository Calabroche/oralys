"use client";

import { useMemo, useState } from "react";
import { ActivityType, Appointment, Patient, Weekday, WeekSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { PRATICIEN_NAME } from "@/data/mockData";
import {
  WEEKDAY_LABELS,
  WEEKDAYS,
  addDays,
  formatLongDate,
  minutesToDurationLabel,
  timeToMinutes,
  toISODate,
  toWeekday,
} from "@/utils/date";
import { getAvailableStarts } from "@/utils/slots";

const DURATIONS = [15, 30, 45, 60, 90];
const OCCURRENCES_SHOWN = 5;

interface Props {
  referenceDate: Date;
  activityTypes: ActivityType[];
  patients: Patient[];
  weekSlots: WeekSlot[];
  appointments: Appointment[];
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
}

export function NouveauRendezVousModal({
  referenceDate,
  activityTypes,
  patients,
  weekSlots,
  appointments,
  onClose,
  onSave,
}: Props) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [activityTypeId, setActivityTypeId] = useState(activityTypes.find((t) => t.id === "consultation")?.id ?? activityTypes[0]?.id);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [weekday, setWeekday] = useState<Weekday>(toWeekday(referenceDate) ?? "lundi");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;
  const matchingPatients = patientQuery
    ? patients.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : [];

  const occurrenceDates = useMemo(() => {
    const dates: string[] = [];
    const startIndex = WEEKDAYS.indexOf(weekday);
    const todayIndex = WEEKDAYS.indexOf(toWeekday(referenceDate) ?? "lundi");
    let firstOffset = startIndex - todayIndex;
    if (firstOffset < 0) firstOffset += 7;
    let cursor = addDays(referenceDate, firstOffset);
    for (let i = 0; i < OCCURRENCES_SHOWN; i++) {
      dates.push(toISODate(cursor));
      cursor = addDays(cursor, 7);
    }
    return dates;
  }, [weekday, referenceDate]);

  const availableStartsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const date of occurrenceDates) {
      map.set(date, getAvailableStarts(weekday, date, activityTypeId ?? "", duration, weekSlots, appointments));
    }
    return map;
  }, [occurrenceDates, weekday, activityTypeId, duration, weekSlots, appointments]);

  const canSave = patientId && activityTypeId && selectedDate && selectedStart;

  function selectedEndTime(): string | null {
    if (!selectedStart) return null;
    const endMinutes = timeToMinutes(selectedStart) + duration;
    const h = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const m = (endMinutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  const end = selectedEndTime();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Nouveau rendez-vous</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 px-5 py-4">
          {/* Left: patient / motif / notes */}
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Patient</label>
                {selectedPatient ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-800">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                      <button onClick={() => setPatientId(null)} className="text-slate-400 hover:text-slate-600">
                        ✕
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Rechercher un patient..."
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    {matchingPatients.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                        {matchingPatients.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => {
                                setPatientId(p.id);
                                setPatientQuery("");
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              {p.firstName} {p.lastName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Praticien</label>
                <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {PRATICIEN_NAME}
                  <span className="text-xs text-slate-400">▾</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Motif</label>
                <div className="flex flex-wrap gap-1.5">
                  {activityTypes.filter((t) => t.id !== "tous-motifs").map((type) => {
                    const colors = ACTIVITY_COLOR_CLASSES[type.color];
                    const isSelected = activityTypeId === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setActivityTypeId(type.id);
                          setDuration(type.durationMinutes);
                          setSelectedDate(null);
                          setSelectedStart(null);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          isSelected ? colors.chip : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Durée</label>
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    setSelectedStart(null);
                  }}
                  className="rounded-md border border-slate-300 px-2.5 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {minutesToDurationLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Right: date + slot picker */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Créneaux</label>
            <select
              value={weekday}
              onChange={(e) => {
                setWeekday(e.target.value as Weekday);
                setSelectedDate(null);
                setSelectedStart(null);
              }}
              className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABELS[d]}
                </option>
              ))}
            </select>

            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {occurrenceDates.map((date) => {
                const starts = availableStartsByDate.get(date) ?? [];
                const isSelected = selectedDate === date;
                return (
                  <div key={date} className={`rounded-md border ${isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200"} p-2`}>
                    <button
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      disabled={starts.length === 0}
                      className="flex w-full items-center justify-between text-left text-sm disabled:opacity-40"
                    >
                      <span className="text-slate-700">{formatLongDate(date)}</span>
                      <span className="text-xs text-slate-400">
                        {starts.length > 0 ? `${starts[0]} - ${starts[starts.length - 1]}` : "Indisponible"}
                      </span>
                    </button>
                    {isSelected && starts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {starts.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedStart(s)}
                            className={`rounded-md border px-2 py-1 text-xs ${
                              selectedStart === s
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            {selectedPatient && selectedDate && selectedStart && end
              ? `Le ${formatLongDate(selectedDate)} avec ${PRATICIEN_NAME} de ${selectedStart} à ${end} (${minutesToDurationLabel(duration)})`
              : "Complétez le patient, le motif et le créneau"}
          </p>
          <button
            disabled={!canSave}
            onClick={() => {
              if (!canSave || !selectedDate || !selectedStart || !end || !activityTypeId) return;
              onSave({
                id: `apt-${Date.now()}`,
                patientId: patientId!,
                activityTypeId,
                date: selectedDate,
                start: selectedStart,
                end,
                notes: notes.trim() || undefined,
              });
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
