import { TeamAbsence, TeamUser } from "@/types/team";
import { addDays, fromISODate, toISODate } from "@/utils/date";

/** Congés payés acquis par an : fixe, le même pour tous les salariés (5 semaines de jours ouvrés). */
export const CP_PAR_AN = 25;

/** Les congés payés ne concernent que les salariés : un praticien libéral organise ses congés comme il veut. */
export function hasCongesPayes(u: TeamUser): boolean {
  return !u.roleIds.includes("role-praticien");
}

/** Période de référence des congés payés : du 1er juin au 31 mai suivant. */
export function cpPeriod(todayIso: string): { start: string; end: string } {
  const d = fromISODate(todayIso);
  const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return { start: `${y}-06-01`, end: `${y + 1}-05-31` };
}

/** Jours ouvrés (lundi → vendredi) entre deux dates incluses : c'est ce qui se décompte d'un congé. */
export function joursOuvres(startIso: string, endIso: string): number {
  let n = 0;
  for (let d = fromISODate(startIso); toISODate(d) <= endIso; d = addDays(d, 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

export interface CongeLine {
  absence: TeamAbsence;
  jours: number;
  etat: "pris" | "pose" | "attente";
}

export interface CpSummary {
  acquis: number;
  /** Jours pris hors de l'application (avant sa mise en place) : seul chiffre saisi à la main, par le gestionnaire. */
  horsAppli: number;
  /** Jours de congés déjà passés sur la période. */
  pris: number;
  /** Jours validés mais pas encore passés. */
  poses: number;
  /** Jours demandés, pas encore validés : pas décomptés. */
  enAttente: number;
  /** Toujours calculé : acquis − hors appli − pris − posés. Jamais saisi. */
  solde: number;
  period: { start: string; end: string };
  lines: CongeLine[];
}

/**
 * Solde de congés payés, calculé depuis les absences « congé » déclarées dans Team
 * (par la personne, son manager ou la gestionnaire) sur la période en cours.
 */
export function cpSummary(user: TeamUser, absences: TeamAbsence[], todayIso: string): CpSummary {
  const period = cpPeriod(todayIso);
  const horsAppli = user.congesPayes?.prisHorsAppli ?? 0;
  const lines: CongeLine[] = [];
  let pris = 0;
  let poses = 0;
  let enAttente = 0;
  for (const a of absences) {
    if (a.userId !== user.id || a.type !== "conge" || a.status === "refusee" || a.source === "soins") continue;
    const start = a.startDate < period.start ? period.start : a.startDate;
    const end = a.endDate > period.end ? period.end : a.endDate;
    if (start > end) continue;
    const jours = joursOuvres(start, end);
    if (a.status === "demandee") {
      enAttente += jours;
      lines.push({ absence: a, jours, etat: "attente" });
      continue;
    }
    // Un congé en cours compte pour la partie déjà passée en « pris », le reste en « posé ».
    const yesterday = toISODate(addDays(fromISODate(todayIso), -1));
    const passe = start <= yesterday ? joursOuvres(start, end < yesterday ? end : yesterday) : 0;
    pris += passe;
    poses += jours - passe;
    lines.push({ absence: a, jours, etat: passe === jours ? "pris" : "pose" });
  }
  return { acquis: CP_PAR_AN, horsAppli, pris, poses, enAttente, solde: CP_PAR_AN - horsAppli - pris - poses, period, lines };
}
