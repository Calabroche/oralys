"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { AbsencePeriod, ActivityType, Appointment, SpecialSlot, WeekSlot } from "@/types";
import {
  absencePeriods as initialAbsencePeriods,
  activityTypes as initialActivityTypes,
  appointments as initialAppointments,
  specialSlots as initialSpecialSlots,
  weekSlots as initialWeekSlots,
} from "@/data/mockData";

const STORAGE_KEY = "oralys-agenda-data-v1";

interface PersistedData {
  activityTypes: ActivityType[];
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  appointments: Appointment[];
}

interface AgendaDataContextValue extends PersistedData {
  addActivityType: (type: ActivityType) => void;
  updateActivityType: (type: ActivityType) => void;
  deleteActivityType: (id: string) => void;
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
  const [hydrated, setHydrated] = useState(false);

  // Recharge ce qui a été sauvegardé localement, une fois monté côté client.
  // localStorage n'existe pas côté serveur : on ne peut lire la valeur sauvegardée
  // qu'après le montage, d'où le setState en effet (sinon le rendu serveur et le
  // premier rendu client ne correspondraient plus, ce qu'une init paresseuse de
  // useState provoquerait).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedData>;
        if (parsed.activityTypes) setActivityTypes(parsed.activityTypes);
        if (parsed.weekSlots) setWeekSlots(parsed.weekSlots);
        if (parsed.specialSlots) setSpecialSlots(parsed.specialSlots);
        if (parsed.absencePeriods) setAbsencePeriods(parsed.absencePeriods);
        if (parsed.appointments) setAppointments(parsed.appointments);
      }
    } catch {
      // localStorage indisponible ou données corrompues : on garde les données de démo.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persiste après chaque changement, une fois le chargement initial terminé
  // (sinon on écraserait les données sauvegardées avec les données de démo).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: PersistedData = { activityTypes, weekSlots, specialSlots, absencePeriods, appointments };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // quota dépassé ou stockage désactivé : on continue sans persister.
    }
  }, [hydrated, activityTypes, weekSlots, specialSlots, absencePeriods, appointments]);

  const value: AgendaDataContextValue = {
    activityTypes,
    weekSlots,
    specialSlots,
    absencePeriods,
    appointments,
    addActivityType: (type) => setActivityTypes((prev) => [...prev, type]),
    updateActivityType: (type) => setActivityTypes((prev) => upsertById(prev, type)),
    deleteActivityType: (id) => {
      setActivityTypes((prev) => prev.filter((t) => t.id !== id));
      // Nettoie les créneaux qui référençaient ce type, pour éviter des créneaux fantômes.
      setWeekSlots((prev) => prev.filter((s) => s.activityTypeId !== id));
      setSpecialSlots((prev) => prev.filter((s) => s.activityTypeId !== id));
    },
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
