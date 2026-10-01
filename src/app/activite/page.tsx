"use client";

import { useEffect, useState } from "react";
import { ActiviteDayView } from "@/components/activite/ActiviteDayView";
import { useAgendaData } from "@/context/AgendaDataContext";
import { getPatient } from "@/data/mockData";
import { SOINS_PRATICIENS } from "@/data/mockData";
import { addDays, formatDayHeader } from "@/utils/date";

export default function ActivitePage() {
  const { activityTypes, appointments, agendaPraticienId, setAgendaPraticienId, roomsFor } = useAgendaData();
  const rooms = roomsFor(agendaPraticienId);
  const [today] = useState(() => new Date());
  const [date, setDate] = useState(today);

  // Heure réelle en direct pour le repère "maintenant".
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate(new Date())}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Aujourd&apos;hui
            </button>
            <span className="hidden h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 sm:flex" aria-hidden>
              📅
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setDate((d) => addDays(d, -1))} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Jour précédent">
                ‹
              </button>
              <button onClick={() => setDate((d) => addDays(d, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Jour suivant">
                ›
              </button>
            </div>
          </div>

          <span className="justify-self-center whitespace-nowrap text-base font-semibold text-slate-800">{formatDayHeader(date)}</span>

          <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
            <select
              value={agendaPraticienId}
              onChange={(e) => setAgendaPraticienId(e.target.value)}
              aria-label="Activité du praticien"
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

        <ActiviteDayView date={date} now={now} appointments={appointments} activityTypes={activityTypes} rooms={rooms} getPatient={getPatient} />
      </div>
      {rooms.length > 1 && (
        <p className="mt-2 text-xs text-slate-400">
          🏠 {rooms.join(" · ")} — deux rendez-vous qui se chevauchent dans le temps s&apos;affichent côte à côte, dans leur salle.
        </p>
      )}
    </div>
  );
}
