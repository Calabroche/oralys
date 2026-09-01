import { Appointment, Weekday, WeekSlot } from "@/types";
import { timeToMinutes } from "@/utils/date";

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Renvoie les heures de début possibles (pas de 15 min) pour un jour donné,
 * en tenant compte de la semaine type (créneaux acceptant ce motif ou "tous motifs")
 * et des rendez-vous déjà pris ce jour-là.
 */
export function getAvailableStarts(
  day: Weekday,
  date: string,
  activityTypeId: string,
  durationMinutes: number,
  weekSlots: WeekSlot[],
  appointments: Appointment[]
): string[] {
  const windows = weekSlots.filter(
    (s) => s.day === day && (s.activityTypeId === activityTypeId || s.activityTypeId === "tous-motifs")
  );
  const bookedRanges = appointments
    .filter((a) => a.date === date)
    .map((a) => [timeToMinutes(a.start), timeToMinutes(a.end)] as const);

  const starts: string[] = [];
  const step = 15;

  for (const window of windows) {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    for (let start = windowStart; start + durationMinutes <= windowEnd; start += step) {
      const end = start + durationMinutes;
      const overlaps = bookedRanges.some(([bStart, bEnd]) => start < bEnd && end > bStart);
      if (!overlaps) starts.push(minutesToTime(start));
    }
  }

  return starts;
}
