import { Weekday } from "@/types";

export const WEEKDAYS: Weekday[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
};

const JS_DAY_TO_WEEKDAY: (Weekday | null)[] = [
  null, // dimanche
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

export function toWeekday(date: Date): Weekday | null {
  return JS_DAY_TO_WEEKDAY[date.getDay()];
}

/** Prochaine date (à partir de `from` inclus) correspondant au jour de semaine donné. */
export function nextWeekdayOccurrence(from: Date, weekday: Weekday): Date {
  const fromIndex = WEEKDAYS.indexOf(toWeekday(from) ?? "lundi");
  const targetIndex = WEEKDAYS.indexOf(weekday);
  let offset = targetIndex - fromIndex;
  if (offset < 0) offset += 7;
  return addDays(from, offset);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lundi = début de semaine
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatMonthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayHeader(date: Date): string {
  const weekday = WEEKDAY_LABELS[toWeekday(date) ?? "lundi"];
  return `${weekday} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatLongDate(iso: string): string {
  const date = fromISODate(iso);
  const weekday = WEEKDAY_LABELS[toWeekday(date) ?? "lundi"];
  return `${weekday} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const date = fromISODate(iso);
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 4);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = sameMonth
    ? `${weekStart.getDate()}`
    : `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()]}`;
  return `${startLabel} - ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

export function diffInDays(startIso: string, endIso: string): number {
  const start = fromISODate(startIso);
  const end = fromISODate(endIso);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToDurationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}
