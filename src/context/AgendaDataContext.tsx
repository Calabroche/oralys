"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { AbsencePeriod, ActivityType, Appointment, SpecialSlot, WeekSlot } from "@/types";
import {
  absencePeriods as initialAbsencePeriods,
  activityTypes as initialActivityTypes,
  appointments as initialAppointments,
  specialSlots as initialSpecialSlots,
  weekSlots as initialWeekSlots,
} from "@/data/mockData";

interface AgendaDataContextValue {
  activityTypes: ActivityType[];
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  appointments: Appointment[];
  addActivityType: (type: ActivityType) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
  upsertAbsence: (absence: AbsencePeriod) => void;
  deleteAbsence: (id: string) => void;
  addAppointment: (appointment: Appointment) => void;
}

const AgendaDataContext = createContext<AgendaDataContextValue | null>(null);

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export function AgendaDataProvider({ children }: { children: ReactNode }) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(initialActivityTypes);
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>(initialWeekSlots);
  const [specialSlots, setSpecialSlots] = useState<SpecialSlot[]>(initialSpecialSlots);
  const [absencePeriods, setAbsencePeriods] = useState<AbsencePeriod[]>(initialAbsencePeriods);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  const value: AgendaDataContextValue = {
    activityTypes,
    weekSlots,
    specialSlots,
    absencePeriods,
    appointments,
    addActivityType: (type) => setActivityTypes((prev) => [...prev, type]),
    upsertWeekSlot: (slot) => setWeekSlots((prev) => upsertById(prev, slot)),
    deleteWeekSlot: (id) => setWeekSlots((prev) => prev.filter((s) => s.id !== id)),
    upsertSpecialSlot: (slot) => setSpecialSlots((prev) => upsertById(prev, slot)),
    deleteSpecialSlot: (id) => setSpecialSlots((prev) => prev.filter((s) => s.id !== id)),
    upsertAbsence: (absence) => setAbsencePeriods((prev) => upsertById(prev, absence)),
    deleteAbsence: (id) => setAbsencePeriods((prev) => prev.filter((a) => a.id !== id)),
    addAppointment: (appointment) => setAppointments((prev) => [...prev, appointment]),
  };

  return <AgendaDataContext.Provider value={value}>{children}</AgendaDataContext.Provider>;
}

export function useAgendaData(): AgendaDataContextValue {
  const ctx = useContext(AgendaDataContext);
  if (!ctx) throw new Error("useAgendaData must be used within AgendaDataProvider");
  return ctx;
}
