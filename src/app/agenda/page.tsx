"use client";

import { useEffect, useState } from "react";
import { AgendaToolbar, AgendaViewMode } from "@/components/agenda/AgendaToolbar";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { MonthView } from "@/components/agenda/MonthView";
import { NouveauRendezVousModal } from "@/components/agenda/NouveauRendezVousModal";
import { useAgendaData } from "@/context/AgendaDataContext";
import { REFERENCE_TODAY, getPatient, patients } from "@/data/mockData";
import {
  addDays,
  addMonths,
  formatDayHeader,
  formatMonthLabel,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
  withLiveTime,
} from "@/utils/date";

export default function AgendaPage() {
  const { activityTypes, weekSlots, specialSlots, absencePeriods, appointments, addAppointment } = useAgendaData();
  const [viewMode, setViewMode] = useState<AgendaViewMode>("semaine");
  const [anchorDate, setAnchorDate] = useState(REFERENCE_TODAY);
  const [modalOpen, setModalOpen] = useState(false);

  // Date de démo fixe (pour que les données restent cohérentes), mais heure
  // réelle en direct pour le repère "maintenant" dans l'agenda.
  const [now, setNow] = useState(() => withLiveTime(REFERENCE_TODAY));
  useEffect(() => {
    const id = setInterval(() => setNow(withLiveTime(REFERENCE_TODAY)), 30000);
    return () => clearInterval(id);
  }, []);

  function handleToday() {
    setAnchorDate(REFERENCE_TODAY);
  }

  function handlePrev() {
    if (viewMode === "jour") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "semaine") setAnchorDate((d) => addDays(d, -7));
    else setAnchorDate((d) => addMonths(d, -1));
  }

  function handleNext() {
    if (viewMode === "jour") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "semaine") setAnchorDate((d) => addDays(d, 7));
    else setAnchorDate((d) => addMonths(d, 1));
  }

  const weekStart = startOfWeek(anchorDate);
  const days = viewMode === "jour" ? [anchorDate] : Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const label =
    viewMode === "jour"
      ? formatDayHeader(anchorDate)
      : viewMode === "semaine"
        ? formatWeekRange(weekStart)
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
          />
        )}
      </div>

      {modalOpen && (
        <NouveauRendezVousModal
          referenceDate={REFERENCE_TODAY}
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
