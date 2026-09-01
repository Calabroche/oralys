export type ActivityColor =
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "purple"
  | "fuchsia"
  | "pink"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "stone"
  | "gray";

export interface ActivityType {
  id: string;
  name: string;
  description: string;
  color: ActivityColor;
  durationMinutes: number;
  locked?: boolean;
}

export type Weekday = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";

export interface WeekSlot {
  id: string;
  day: Weekday;
  activityTypeId: string;
  start: string; // "08:00"
  end: string; // "12:00"
}

export type RecurrenceFrequency = "none" | "weekly" | "biweekly" | "monthly" | "custom";
export type RecurrenceUnit = "weeks" | "months";

export interface Recurrence {
  frequency: RecurrenceFrequency;
  customInterval?: number;
  customUnit?: RecurrenceUnit;
  endDate?: string | null; // ISO date, null/undefined = jamais
}

export interface SpecialSlot {
  id: string;
  activityTypeId: string;
  label: string; // ex: "Indisponible", ou nom du type d'activité
  color: ActivityColor;
  startDate: string; // ISO date "2026-06-15"
  endDate: string; // ISO date, ponctuel = startDate === endDate
  allDay: boolean;
  start?: string; // heure, absente si allDay
  end?: string;
  recurrence: Recurrence;
}

export type AbsenceMotif = "Congés" | "Formation" | "Maladie" | "Fermeture cabinet" | "Autre";

export interface AbsencePeriod {
  id: string;
  motif: AbsenceMotif;
  color: ActivityColor;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  recurrence: Recurrence;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  activityTypeId: string;
  date: string; // ISO date
  start: string;
  end: string;
  notes?: string;
}
