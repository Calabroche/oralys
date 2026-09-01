"use client";

import { useState } from "react";
import { AgendaToolbar, AgendaViewMode } from "@/components/agenda/AgendaToolbar";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { MonthView } from "@/components/agenda/MonthView";
import { NouveauRendezVousModal } from "@/components/agenda/NouveauRendezVousModal";
import { useAgendaData } from "@/context/AgendaDataContext";
import { getPatient, patients } from "@/data/mockData";
import {
  addDays,
  addMonths,
  formatDayHeader,
  formatMonthLabel,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
} from "@/utils/date";

const REFERENCE_TODAY = new Date(2026, 8, 1, 10, 30); // 1 septembre 2026, 10h30

export default function AgendaPage() {
  const { activityTypes, weekSlots, specialSlots, absencePeriods, appointments, addAppointment } = useAgendaData();
  const [viewMode, setViewMode] = useState<AgendaViewMode>("semaine");
  const [anchorDate, setAnchorDate] = useState(REFERENCE_TODAY);
  const [modalOpen, setModalOpen] = useState(false);

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
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <AgendaToolbar
          label={label}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onToday={handleToday}
          onPrev={handlePrev}
          onNext={handleNext}
          onNewAppointment={() => setModalOpen(true)}
        />

        {viewMode === "mois" ? (
          <MonthView
            month={anchorDate}
            now={REFERENCE_TODAY}
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
            now={REFERENCE_TODAY}
            appointments={appointments}
            activityTypes={activityTypes}
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
