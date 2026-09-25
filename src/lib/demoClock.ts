/**
 * La démo vit à la date réelle du jour.
 *
 * Les données d'exemple sont écrites autour du mardi 1er septembre 2026. Au premier
 * chargement (ou après « Réinitialiser la démo »), elles sont recalées sur aujourd'hui :
 * - décalage « semaine » : même jour de la semaine, la semaine du 31 août devient la semaine en cours
 *   (les congés du lundi au vendredi restent du lundi au vendredi) ;
 * - décalage « jour » : pour ce qui se passe aujourd'hui (arrêt maladie du jour, alertes du matin).
 * Ensuite, les données sauvegardées ne bougent plus : ce sont de vraies dates.
 */

const SEED_TODAY = new Date(2026, 8, 1);
const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

export interface DemoShift {
  day: number;
  week: number;
}

export function demoShift(today: Date = new Date()): DemoShift {
  return { day: diffDays(today, SEED_TODAY), week: diffDays(mondayOf(today), mondayOf(SEED_TODAY)) };
}

const ISO_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Décale une date ISO ("2026-09-14" ou "2026-09-14T08:05:00") de `days` jours, heure conservée. */
export function shiftISO(iso: string, days: number): string {
  const m = ISO_PREFIX.exec(iso);
  if (!m || days === 0) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${iso.slice(10)}`;
}

/** Décale toutes les dates ISO contenues dans un objet de données (récursif). */
export function shiftDeep<T>(value: T, days: number): T {
  if (typeof value === "string") return (ISO_PREFIX.test(value) ? shiftISO(value, days) : value) as T;
  if (Array.isArray(value)) return value.map((v) => shiftDeep(v, days)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDeep(v, days)])) as T;
  }
  return value;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parts(iso: string) {
  const m = ISO_PREFIX.exec(iso)!;
  const day = Number(m[3]);
  return { day: day === 1 ? "1er" : String(day), month: Number(m[2]) - 1 };
}

/** « du 14 au 18 septembre », « du 29 septembre au 3 octobre », « le 8 septembre ». */
export function rangeLong(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  if (start === end) return `le ${a.day} ${MONTHS[a.month]}`;
  return a.month === b.month ? `du ${a.day} au ${b.day} ${MONTHS[b.month]}` : `du ${a.day} ${MONTHS[a.month]} au ${b.day} ${MONTHS[b.month]}`;
}

/** « 14 → 18 sept. », « 29 sept. → 3 oct. ». */
export function rangeShort(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  return a.month === b.month ? `${a.day} → ${b.day} ${MONTHS_SHORT[b.month]}` : `${a.day} ${MONTHS_SHORT[a.month]} → ${b.day} ${MONTHS_SHORT[b.month]}`;
}
