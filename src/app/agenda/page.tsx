"use client";

import { useState } from "react";
import { WeekCalendar } from "@/components/agenda/WeekCalendar";
import { NouveauRendezVousModal } from "@/components/agenda/NouveauRendezVousModal";
import {
  activityTypes,
  appointments as initialAppointments,
  getPatient,
  patients,
  specialSlots,
  weekSlots,
} from "@/data/mockData";
import { Appointment } from "@/types";
import { startOfWeek } from "@/utils/date";

const REFERENCE_TODAY = new Date(2026, 8, 1, 10, 30); // 1 septembre 2026, 10h30

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(REFERENCE_TODAY));
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <WeekCalendar
        weekStart={weekStart}
        onWeekStartChange={(date) => setWeekStart(startOfWeek(date))}
        now={REFERENCE_TODAY}
        appointments={appointments}
        activityTypes={activityTypes}
        specialSlots={specialSlots}
        getPatient={getPatient}
        onNewAppointment={() => setModalOpen(true)}
      />

      {modalOpen && (
        <NouveauRendezVousModal
          referenceDate={REFERENCE_TODAY}
          activityTypes={activityTypes}
          patients={patients}
          weekSlots={weekSlots}
          appointments={appointments}
          onClose={() => setModalOpen(false)}
          onSave={(appointment) => {
            setAppointments((prev) => [...prev, appointment]);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
