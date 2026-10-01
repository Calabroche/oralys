import { demoShift, shiftDeep } from "@/lib/demoClock";
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

export const activityTypes: ActivityType[] = [
  {
    id: "tous-motifs",
    name: "Tous motifs",
    description: "Accepte tout motif de rendez-vous",
    color: "gray",
    durationMinutes: 240,
    assistantsNeeded: 1,
    locked: true,
  },
  {
    id: "consultation",
    name: "Consultation",
    description: "Consultation",
    color: "green",
    durationMinutes: 30,
    assistantsNeeded: 1,
    locked: true,
  },
  {
    id: "urgences",
    name: "Urgences",
    description: "Urgences",
    color: "red",
    durationMinutes: 15,
    assistantsNeeded: 1,
    locked: true,
  },
  {
    id: "bloc",
    name: "Bloc",
    description: "Prothèse, Endodontie, Parodontologie, Chirurgie orale, implantologie",
    color: "blue",
    durationMinutes: 60,
    assistantsNeeded: 2,
    locked: true,
  },
  {
    id: "hors-bloc",
    name: "Hors bloc",
    description: "Soins, Comblés",
    color: "purple",
    durationMinutes: 45,
    assistantsNeeded: 1,
    locked: true,
  },
];

export function getActivityType(id: string): ActivityType {
  const found = activityTypes.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown activity type: ${id}`);
  return found;
}

/** Agendas Soins de la démo : l'agenda « courant » (sans praticienId) est celui de Dr Perche. */
export const SOINS_PRATICIENS: { id: string; name: string }[] = [
  { id: "env-perche", name: "Dr Flore Perche" },
  { id: "env-martin", name: "Dr Sophie Martin" },
  { id: "env-dray", name: "Dr Paul Dray" },
];
export const DEFAULT_SOINS_PRATICIEN = "env-perche";

/** Salles de chaque praticien. Pas de limite à 2 : la vue multi-salles itère sur cette liste. */
export const ROOMS: Record<string, string[]> = {
  "env-perche": ["Salle 1"],
  "env-martin": ["Bloc 1", "Salle 2"],
  "env-dray": ["Salle 1", "Salle 2"],
};

/** Assistants nécessaires par type d'activité, pour chaque praticien (ex. bloc : 2 pour Dr Martin, 1 pour Dr Dray). */
export const ASSISTANT_NEEDS: Record<string, Record<string, number>> = {
  "env-perche": { "tous-motifs": 1, consultation: 1, urgences: 1, bloc: 2, "hors-bloc": 1 },
  "env-martin": { "tous-motifs": 1, consultation: 1, urgences: 1, bloc: 4, "hors-bloc": 1 },
  "env-dray": { "tous-motifs": 1, consultation: 1, urgences: 1, bloc: 1, "hors-bloc": 1 },
};

const slot = (id: string, praticienId: string, day: WeekSlot["day"], activityTypeId: string, start: string, end: string, room?: string): WeekSlot => ({
  id,
  praticienId,
  day,
  activityTypeId,
  start,
  end,
  room,
});
/**
 * Semaines types des autres praticiens de la démo. Dr Martin a 2 salles (voir ROOMS) : le lundi et le
 * mardi, un petit contrôle est posé en Salle 2 PENDANT le bloc de Bloc 1, pour montrer un vrai
 * chevauchement de salles sur le même praticien (le cas remonté par le praticien consulté).
 */
export const OTHER_WEEK_SLOTS: WeekSlot[] = [
  slot("wm-1", "env-martin", "lundi", "bloc", "08:00", "12:00", "Bloc 1"),
  slot("wm-1b", "env-martin", "lundi", "consultation", "09:00", "09:30", "Salle 2"),
  slot("wm-2", "env-martin", "lundi", "consultation", "14:00", "18:00", "Salle 2"),
  slot("wm-3", "env-martin", "mardi", "bloc", "08:00", "12:30", "Bloc 1"),
  slot("wm-3b", "env-martin", "mardi", "consultation", "09:15", "09:45", "Salle 2"),
  slot("wm-4", "env-martin", "mardi", "consultation", "14:00", "16:00", "Salle 2"),
  slot("wm-4b", "env-martin", "mardi", "tous-motifs", "16:00", "18:00", "Salle 2"),
  slot("wm-5", "env-martin", "mercredi", "consultation", "08:00", "12:00", "Salle 2"),
  slot("wm-6", "env-martin", "mercredi", "hors-bloc", "14:00", "18:00", "Bloc 1"),
  slot("wm-7", "env-martin", "jeudi", "bloc", "08:00", "12:00", "Bloc 1"),
  slot("wm-8", "env-martin", "jeudi", "bloc", "14:00", "17:00", "Bloc 1"),
  slot("wm-9", "env-martin", "vendredi", "consultation", "08:00", "12:00", "Salle 2"),
  slot("wm-10", "env-martin", "vendredi", "urgences", "14:00", "17:00", "Salle 2"),
  slot("wd-1", "env-dray", "lundi", "consultation", "08:00", "12:00", "Salle 1"),
  slot("wd-2", "env-dray", "lundi", "tous-motifs", "14:00", "18:00", "Salle 1"),
  slot("wd-3", "env-dray", "mardi", "hors-bloc", "08:00", "12:00", "Salle 1"),
  slot("wd-4", "env-dray", "mardi", "tous-motifs", "14:00", "18:00", "Salle 1"),
  slot("wd-5", "env-dray", "jeudi", "urgences", "08:00", "12:00", "Salle 1"),
  slot("wd-6", "env-dray", "jeudi", "tous-motifs", "14:00", "18:00", "Salle 1"),
  slot("wd-7", "env-dray", "vendredi", "consultation", "08:00", "12:00", "Salle 1"),
];

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

const specialSlots: SpecialSlot[] = [
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

const absencePeriods: AbsencePeriod[] = [
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

const appointments: Appointment[] = [
  { id: "apt-1", patientId: "p-3", activityTypeId: "hors-bloc", date: "2026-08-31", start: "14:00", end: "14:45" },
  { id: "apt-2", patientId: "p-2", activityTypeId: "urgences", date: "2026-09-01", start: "08:00", end: "08:15" },
  { id: "apt-3", patientId: "p-4", activityTypeId: "bloc", date: "2026-09-03", start: "15:30", end: "16:30" },
  // Dr Martin, aujourd'hui, deux salles en vrai parallèle : le même exemple que la semaine type
  // (Bloc 1 + Salle 2), mais posé comme de vrais rendez-vous pour la vue Activité.
  { id: "apt-martin-1", praticienId: "env-martin", patientId: "p-5", activityTypeId: "bloc", date: "2026-09-01", start: "11:00", end: "12:00", room: "Bloc 1" },
  { id: "apt-martin-2", praticienId: "env-martin", patientId: "p-6", activityTypeId: "consultation", date: "2026-09-01", start: "11:15", end: "11:45", room: "Salle 2" },
];

/** Agenda de démo recalé sur la date du jour (voir `lib/demoClock`) : le RDV d'urgence et ceux de Dr Martin tombent aujourd'hui. */
export function buildAgendaSeed(today: Date = new Date()) {
  const shift = demoShift(today);
  const onToday = new Set(["apt-2", "apt-martin-1", "apt-martin-2"]);
  return {
    specialSlots: shiftDeep(specialSlots, shift.week),
    absencePeriods: shiftDeep(absencePeriods, shift.week),
    appointments: appointments.map((a) => shiftDeep(a, onToday.has(a.id) ? shift.day : shift.week)),
  };
}
