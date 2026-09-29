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
  /** Besoin par défaut en assistants pour ce type (chaque praticien peut avoir le sien, voir assistantNeeds). */
  assistantsNeeded?: number;
}

export type Weekday = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";

export interface WeekSlot {
  id: string;
  /** Praticien (environnement Soins) à qui appartient ce créneau. Absent : l'agenda de la démo (Dr Perche). */
  praticienId?: string;
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

export interface AbsencePeriod {
  id: string;
  motif: string; // libre : quelques motifs usuels sont suggérés, mais on peut en saisir un autre
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
