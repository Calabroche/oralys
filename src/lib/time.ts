import { Punch, PunchKind, TeamAbsence, TeamUser } from "@/types/team";

/**
 * Pointage (V3) : à partir des pointages d'une journée (arrivée, pause, reprise, départ),
 * on calcule le temps travaillé, les pauses et les anomalies à corriger.
 * Règles reprises du Code du travail : 20 min de pause dès 6 h travaillées, 10 h de travail effectif max par jour.
 */

export const PUNCH_LABELS: Record<PunchKind, string> = {
  arrivee: "Arrivée",
  pause: "Début de pause",
  reprise: "Fin de pause",
  depart: "Départ",
};

export const SOURCE_LABELS: Record<Punch["source"], string> = {
  poste: "Oralys",
  badge: "Badge",
  correction: "Correction",
};

const MIN_BREAK_AFTER_6H = 20;
const MAX_DAILY_MINUTES = 10 * 60;
/** En dessous de 15 min sur la semaine, on ne compte pas d'heures au-delà du contrat (arrondis de badge). */
const EXTRA_TOLERANCE = 15;

export type PunchState = "hors_poste" | "en_poste" | "en_pause" | "parti";

export interface DayTime {
  date: string;
  punches: Punch[];
  workedMinutes: number;
  breakMinutes: number;
  state: PunchState;
  /** Depuis quand la personne est dans l'état courant (aujourd'hui). */
  since?: string;
  anomalies: string[];
}

const minutesOf = (at: string) => {
  const [h, m] = at.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

export const timeOf = (at: string) => at.slice(11, 16);

/** "7 h 45", "35 h", "0 h 20". */
export function formatMinutes(total: number): string {
  const sign = total < 0 ? "−" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
}

/** Prochaines actions possibles selon l'état de la journée. */
export function nextKinds(state: PunchState): PunchKind[] {
  if (state === "hors_poste") return ["arrivee"];
  if (state === "en_poste") return ["pause", "depart"];
  if (state === "en_pause") return ["reprise"];
  return ["arrivee"];
}

/**
 * Journée d'une personne. `nowMinutes` (aujourd'hui seulement) fait courir le temps
 * de la période en cours ; un jour passé resté ouvert est une anomalie (oubli de départ).
 */
export function dayTime(userId: string, date: string, punches: Punch[], nowMinutes?: number): DayTime {
  const list = punches.filter((p) => p.userId === userId && p.at.startsWith(date)).sort((a, b) => a.at.localeCompare(b.at));
  let worked = 0;
  let breaks = 0;
  let workStart: number | null = null;
  let breakStart: number | null = null;
  let state: PunchState = "hors_poste";
  let since: string | undefined;
  const anomalies: string[] = [];

  for (const p of list) {
    const t = minutesOf(p.at);
    if (p.kind === "arrivee" || p.kind === "reprise") {
      if (p.kind === "reprise" && breakStart !== null) breaks += t - breakStart;
      breakStart = null;
      workStart = t;
      state = "en_poste";
    } else {
      if (workStart !== null) worked += t - workStart;
      workStart = null;
      if (p.kind === "pause") {
        breakStart = t;
        state = "en_pause";
      } else {
        state = "parti";
      }
    }
    since = p.at;
  }

  if (nowMinutes !== undefined) {
    if (workStart !== null) worked += Math.max(0, nowMinutes - workStart);
    if (breakStart !== null) breaks += Math.max(0, nowMinutes - breakStart);
  } else if (state === "en_poste" || state === "en_pause") {
    anomalies.push("Départ non pointé");
  }

  if (worked > 6 * 60 && breaks < MIN_BREAK_AFTER_6H && (nowMinutes === undefined || state === "parti")) {
    anomalies.push(`Pause de ${breaks} min pour plus de 6 h travaillées (20 min minimum)`);
  }
  if (worked > MAX_DAILY_MINUTES) anomalies.push(`Plus de 10 h travaillées (${formatMinutes(worked)})`);

  return { date, punches: list, workedMinutes: worked, breakMinutes: breaks, state, since, anomalies };
}

export interface WeekTime {
  days: DayTime[];
  workedMinutes: number;
  contractMinutes: number;
  /** Heures au-delà du contrat (heures sup, ou complémentaires pour un temps partiel). */
  extraMinutes: number;
  anomalies: number;
}

export function weekTime(user: TeamUser, dates: string[], punches: Punch[], today: string, nowMinutes: number): WeekTime {
  const days = dates.map((d) => dayTime(user.id, d, punches, d === today ? nowMinutes : undefined));
  const worked = days.reduce((n, d) => n + d.workedMinutes, 0);
  const contract = (user.weeklyHours ?? 0) * 60;
  return {
    days,
    workedMinutes: worked,
    contractMinutes: contract,
    extraMinutes: worked - contract > EXTRA_TOLERANCE ? worked - contract : 0,
    anomalies: days.reduce((n, d) => n + d.anomalies.length, 0),
  };
}

export const nowMinutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

// --- Récapitulatif du mois (préparation de la paie) -------------------------

/**
 * Règles retenues pour le prototype, à valider avec le cabinet comptable :
 * - contrat mensualisé = heures hebdo × 52 / 12 (35 h → 151,67 h) ;
 * - heures au-delà du contrat comptées à la semaine (lundi → dimanche), la semaine étant rattachée
 *   au mois de son dimanche ; temps plein : +25 % jusqu'à 43 h, +50 % au-delà ; temps partiel : heures complémentaires.
 */
export interface MonthWeek {
  /** Lundi de la semaine. */
  start: string;
  label: string;
  workedMinutes: number;
  overMinutes: number;
}

export interface MonthTime {
  workedMinutes: number;
  contractMinutes: number;
  weeks: MonthWeek[];
  overtime25: number;
  overtime50: number;
  complementary: number;
  absenceDays: Record<TeamAbsence["type"], number>;
  anomalies: number;
  /** Nombre de jours avec au moins un pointage. */
  daysWorked: number;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addD = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Numéro de semaine ISO (S39…), tel qu'il figure sur les plannings et bulletins. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function monthTime(
  user: TeamUser,
  year: number,
  month: number,
  punches: Punch[],
  absences: TeamAbsence[],
  today: string,
  nowMinutes: number,
  worksOn: (u: TeamUser, iso: string) => boolean
): MonthTime {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const inMonth = (d: string) => d >= iso(first) && d <= iso(last);
  const day = (d: string) => (d > today ? null : dayTime(user.id, d, punches, d === today ? nowMinutes : undefined));

  let worked = 0;
  let anomalies = 0;
  let daysWorked = 0;
  const absenceDays: Record<TeamAbsence["type"], number> = { conge: 0, maladie: 0, formation: 0, autre: 0 };
  for (let d = first; d <= last; d = addD(d, 1)) {
    const k = iso(d);
    const t = day(k);
    if (t) {
      worked += t.workedMinutes;
      anomalies += t.anomalies.length;
      if (t.punches.length) daysWorked++;
    }
    const abs = absences.find((a) => a.userId === user.id && a.status === "validee" && a.startDate <= k && a.endDate >= k);
    if (abs && worksOn(user, k)) absenceDays[abs.type]++;
  }

  // Semaines rattachées au mois : celles dont le dimanche tombe dans le mois.
  const weekly = (user.weeklyHours ?? 0) * 60;
  const weeks: MonthWeek[] = [];
  let overtime25 = 0;
  let overtime50 = 0;
  let complementary = 0;
  const firstMonday = addD(first, -((first.getDay() + 6) % 7));
  for (let m = firstMonday; m <= last; m = addD(m, 7)) {
    const sunday = addD(m, 6);
    if (!inMonth(iso(sunday))) continue;
    let w = 0;
    for (let i = 0; i < 7; i++) w += day(iso(addD(m, i)))?.workedMinutes ?? 0;
    const over = weekly > 0 && w - weekly > EXTRA_TOLERANCE ? w - weekly : 0;
    if (weekly >= 35 * 60) {
      const at25 = Math.min(over, Math.max(0, 43 * 60 - weekly));
      overtime25 += at25;
      overtime50 += over - at25;
    } else {
      complementary += over;
    }
    weeks.push({
      start: iso(m),
      label: `S${isoWeek(m)} · ${m.getDate()} ${SHORT_MONTHS[m.getMonth()]} → ${sunday.getDate()} ${SHORT_MONTHS[sunday.getMonth()]}`,
      workedMinutes: w,
      overMinutes: over,
    });
  }

  return {
    workedMinutes: worked,
    contractMinutes: Math.round((weekly * 52) / 12),
    weeks,
    overtime25,
    overtime50,
    complementary,
    absenceDays,
    anomalies,
    daysWorked,
  };
}

/** Heures décimales pour la paie : 151,67. */
export const decimalHours = (minutes: number) => (minutes / 60).toFixed(2).replace(".", ",");
