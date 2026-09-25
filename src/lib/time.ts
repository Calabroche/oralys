import { Punch, PunchKind, TeamUser } from "@/types/team";

/**
 * Pointage (V4) : à partir des pointages d'une journée (arrivée, pause, reprise, départ),
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
    // Sans contrat horaire (praticien libéral), pas d'heures « au-delà du contrat ».
    extraMinutes: contract > 0 && worked - contract > EXTRA_TOLERANCE ? worked - contract : 0,
    anomalies: days.reduce((n, d) => n + d.anomalies.length, 0),
  };
}

export const nowMinutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
