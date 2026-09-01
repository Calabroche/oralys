import {
  AbsencePeriod,
  ActivityType,
  Appointment,
  Patient,
  SpecialSlot,
  WeekSlot,
} from "@/types";

export const CABINET_NAME = "Cabinet Oralys";
export const PRATICIEN_NAME = "Flore Perche";
export const REFERENCE_TODAY = new Date(2026, 8, 1, 10, 30); // 1 septembre 2026, 10h30

export const activityTypes: ActivityType[] = [
  {
    id: "tous-motifs",
    name: "Tous motifs",
    description: "Accepte tout motif de rendez-vous",
    color: "gray",
    durationMinutes: 240,
    locked: true,
  },
  {
    id: "consultation",
    name: "Consultation",
    description: "Consultation",
    color: "green",
    durationMinutes: 30,
    locked: true,
  },
  {
    id: "urgences",
    name: "Urgences",
    description: "Urgences",
    color: "red",
    durationMinutes: 15,
    locked: true,
  },
  {
    id: "bloc",
    name: "Bloc",
    description: "Prothèse, Endodontie, Parodontologie, Chirurgie orale, implantologie",
    color: "blue",
    durationMinutes: 60,
    locked: true,
  },
  {
    id: "hors-bloc",
    name: "Hors bloc",
    description: "Soins, Comblés",
    color: "purple",
    durationMinutes: 45,
    locked: true,
  },
];

export function getActivityType(id: string): ActivityType {
  const found = activityTypes.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown activity type: ${id}`);
  return found;
}

export const weekSlots: WeekSlot[] = [
  { id: "ws-1", day: "lundi", activityTypeId: "consultation", start: "08:00", end: "12:00" },
  { id: "ws-2", day: "lundi", activityTypeId: "bloc", start: "14:00", end: "17:00" },
  { id: "ws-3", day: "lundi", activityTypeId: "tous-motifs", start: "17:00", end: "19:00" },
  { id: "ws-4", day: "mardi", activityTypeId: "urgences", start: "08:00", end: "13:00" },
  { id: "ws-5", day: "mardi", activityTypeId: "tous-motifs", start: "14:00", end: "18:00" },
  { id: "ws-6", day: "jeudi", activityTypeId: "tous-motifs", start: "08:00", end: "12:00" },
  { id: "ws-7", day: "jeudi", activityTypeId: "tous-motifs", start: "13:00", end: "18:00" },
  { id: "ws-8", day: "vendredi", activityTypeId: "hors-bloc", start: "08:00", end: "12:00" },
  { id: "ws-9", day: "vendredi", activityTypeId: "tous-motifs", start: "12:00", end: "18:00" },
];

export const specialSlots: SpecialSlot[] = [
  {
    id: "ss-1",
    activityTypeId: "consultation",
    label: "Consultation",
    color: "green",
    startDate: "2026-06-15",
    endDate: "2026-06-15",
    allDay: false,
    start: "09:00",
    end: "12:00",
    recurrence: { frequency: "none" },
  },
  {
    id: "ss-2",
    activityTypeId: "tous-motifs",
    label: "Indisponible",
    color: "gray",
    startDate: "2026-09-07",
    endDate: "2026-09-07",
    allDay: true,
    recurrence: { frequency: "biweekly", endDate: null },
  },
];

export const absencePeriods: AbsencePeriod[] = [
  {
    id: "abs-1",
    motif: "Congés",
    color: "orange",
    startDate: "2026-07-28",
    startTime: "00:00",
    endDate: "2026-08-15",
    endTime: "23:59",
    recurrence: { frequency: "none" },
  },
];

export const patients: Patient[] = [
  { id: "p-1", firstName: "Janet", lastName: "Jackson" },
  { id: "p-2", firstName: "Lisa", lastName: "Roude" },
  { id: "p-3", firstName: "Michael", lastName: "Jackson" },
  { id: "p-4", firstName: "Odie", lastName: "Aude" },
  { id: "p-5", firstName: "Marc", lastName: "Fontaine" },
  { id: "p-6", firstName: "Claire", lastName: "Bernard" },
];

export function getPatient(id: string): Patient {
  const found = patients.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown patient: ${id}`);
  return found;
}

export const appointments: Appointment[] = [
  { id: "apt-1", patientId: "p-3", activityTypeId: "hors-bloc", date: "2026-08-31", start: "14:00", end: "14:45" },
  { id: "apt-2", patientId: "p-2", activityTypeId: "urgences", date: "2026-09-01", start: "08:00", end: "08:15" },
  { id: "apt-3", patientId: "p-4", activityTypeId: "bloc", date: "2026-09-03", start: "15:30", end: "16:30" },
];
