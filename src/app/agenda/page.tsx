"use client";

import { useEffect, useState } from "react";
import { AgendaToolbar, AgendaViewMode } from "@/components/agenda/AgendaToolbar";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { MonthView } from "@/components/agenda/MonthView";
import { NouveauRendezVousModal } from "@/components/agenda/NouveauRendezVousModal";
import { useAgendaData } from "@/context/AgendaDataContext";
import { getPatient, patients } from "@/data/mockData";
import {
  addDays,
  addMonths,
  formatDateRange,
  formatDayHeader,
  formatMonthLabel,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
} from "@/utils/date";
import { usePersistentState } from "@/lib/persist";

export default function AgendaPage() {
  const { activityTypes, weekSlots, specialSlots, absencePeriods, appointments, addAppointment, agendaPraticienId, roomsFor } = useAgendaData();
  const rooms = roomsFor(agendaPraticienId);
  const [viewMode, setViewMode] = useState<AgendaViewMode>("semaine");
  const [customDays, setCustomDays] = usePersistentState("agenda-custom-days", 5);
  // Toujours la date réelle du jour.
  const [today] = useState(() => new Date());
  const [anchorDate, setAnchorDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);

  // Heure réelle en direct pour le repère "maintenant" dans l'agenda.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Le cabinet ne travaille pas le week-end (toujours "Repos" dans la semaine type) : une fenêtre de
  // N jours saute samedi et dimanche plutôt que de les compter pour rien.
  function workingDaysFrom(start: Date, count: number, dir: 1 | -1 = 1): Date[] {
    const out: Date[] = [];
    let d = start;
    while (out.length < count) {
      if (![0, 6].includes(d.getDay())) out.push(d);
      d = addDays(d, dir);
    }
    return dir === 1 ? out : out.reverse();
  }

  function handleToday() {
    setAnchorDate(new Date());
  }

  function handlePrev() {
    if (viewMode === "jour") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "semaine") setAnchorDate((d) => addDays(d, -7));
    else if (viewMode === "jours") setAnchorDate((d) => workingDaysFrom(addDays(d, -1), customDays, -1)[0]);
    else setAnchorDate((d) => addMonths(d, -1));
  }

  function handleNext() {
    if (viewMode === "jour") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "semaine") setAnchorDate((d) => addDays(d, 7));
    else if (viewMode === "jours") setAnchorDate((d) => addDays(workingDaysFrom(d, customDays)[customDays - 1], 1));
    else setAnchorDate((d) => addMonths(d, 1));
  }

  const weekStart = startOfWeek(anchorDate);
  const days =
    viewMode === "jour"
      ? [anchorDate]
      : viewMode === "jours"
        ? workingDaysFrom(anchorDate, customDays)
        : Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const label =
    viewMode === "jour"
      ? formatDayHeader(anchorDate)
      : viewMode === "semaine"
        ? formatWeekRange(weekStart)
        : viewMode === "jours"
          ? formatDateRange(days[0], days[days.length - 1])
          : formatMonthLabel(startOfMonth(anchorDate));

  return (
    <div className="relative mx-auto max-w-5xl px-6 py-6">
      <button
        onClick={() => setModalOpen(true)}
        className="absolute right-2 top-8 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg text-white shadow-lg hover:bg-slate-800"
        aria-label="Nouveau rendez-vous"
      >
        +
      </button>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <AgendaToolbar
          label={label}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          customDays={customDays}
          onCustomDaysChange={setCustomDays}
          onToday={handleToday}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {viewMode === "mois" ? (
          <MonthView
            month={anchorDate}
            now={now}
            appointments={appointments}
            activityTypes={activityTypes}
            specialSlots={specialSlots}
            absencePeriods={absencePeriods}
            onSelectDay={(date) => {
              setAnchorDate(date);
              setViewMode("jour");
            }}
          />
        ) : (
          <CalendarGrid
            days={days}
            now={now}
            appointments={appointments}
            activityTypes={activityTypes}
            weekSlots={weekSlots}
            specialSlots={specialSlots}
            absencePeriods={absencePeriods}
            getPatient={getPatient}
            rooms={rooms}
          />
        )}
      </div>

      {modalOpen && (
        <NouveauRendezVousModal
          referenceDate={today}
          activityTypes={activityTypes}
          patients={patients}
          weekSlots={weekSlots}
          specialSlots={specialSlots}
          appointments={appointments}
          onClose={() => setModalOpen(false)}
          onSave={(appointment) => {
            addAppointment(appointment);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
