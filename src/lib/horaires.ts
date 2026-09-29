import { Weekday } from "@/types";
import { HalfDay, TeamUser, TimeRange, WeekHours } from "@/types/team";
import { WEEKDAYS } from "@/utils/date";

/**
 * Horaires habituels de chacun (plages de travail par jour). Ils servent au planning (on en déduit
 * matin, après-midi ou journée) et, côté RH, à comparer les heures prévues aux heures pointées.
 */

/** Limite entre le matin et l'après-midi. */
const MIDI = "13:00";

/** Plages proposées par défaut quand on coche un jour ou qu'aucun horaire n'est encore saisi. */
export const DEFAULT_RANGES: Record<"journee" | HalfDay, TimeRange[]> = {
  journee: [
    { start: "08:30", end: "12:30" },
    { start: "14:00", end: "17:00" },
  ],
  matin: [{ start: "08:30", end: "12:30" }],
  apres_midi: [{ start: "14:00", end: "18:00" }],
};

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function rangeMinutes(r: TimeRange): number {
  return Math.max(0, toMinutes(r.end) - toMinutes(r.start));
}

export function dayMinutes(ranges: TimeRange[] = []): number {
  return ranges.reduce((s, r) => s + rangeMinutes(r), 0);
}

/** Horaires de la personne : ceux qu'elle a saisis, sinon des horaires par défaut déduits de ses jours et demi-journées. */
export function effectiveHours(user: Pick<TeamUser, "schedule" | "workDays" | "halfDays">): WeekHours {
  if (user.schedule) return user.schedule;
  return Object.fromEntries(user.workDays.map((d) => [d, DEFAULT_RANGES[user.halfDays?.[d] ?? "journee"]]));
}

export function weekMinutes(hours: WeekHours): number {
  return WEEKDAYS.reduce((s, d) => s + dayMinutes(hours[d]), 0);
}

/** Matin si une plage commence avant 13 h, après-midi si une plage finit après 13 h. */
export function halvesOfRanges(ranges: TimeRange[] = []): HalfDay[] {
  const out: HalfDay[] = [];
  if (ranges.some((r) => r.start < MIDI && rangeMinutes(r) > 0)) out.push("matin");
  if (ranges.some((r) => r.end > MIDI && rangeMinutes(r) > 0)) out.push("apres_midi");
  return out;
}

/** Jours et demi-journées travaillés, déduits des horaires (ce que lit le planning). */
export function daysFromHours(hours: WeekHours): Pick<TeamUser, "workDays" | "halfDays"> {
  const workDays: Weekday[] = [];
  const halfDays: Partial<Record<Weekday, HalfDay>> = {};
  for (const d of WEEKDAYS) {
    const halves = halvesOfRanges(hours[d]);
    if (!halves.length) continue;
    workDays.push(d);
    if (halves.length === 1) halfDays[d] = halves[0];
  }
  return { workDays, halfDays };
}

/** « 7 h 30 », « 35 h ». */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Plages invalides : fin avant début, ou plages qui se chevauchent. */
export function rangesError(ranges: TimeRange[] = []): string | null {
  if (ranges.some((r) => toMinutes(r.end) <= toMinutes(r.start))) return "La fin doit être après le début.";
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  if (sorted.some((r, i) => i > 0 && toMinutes(r.start) < toMinutes(sorted[i - 1].end))) return "Deux plages se chevauchent.";
  return null;
}
