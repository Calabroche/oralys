import { TeamAbsence, TeamUser } from "@/types/team";
import { addDays, fromISODate, toISODate } from "@/utils/date";
import { worksOn } from "@/lib/team";

/** Explication affichée en petit sous le taux, partout où il apparaît. */
export const ASSIDUITE_NB =
  "Calcul : jours d'absence (maladie et autre, hors congés payés et formation) rapportés aux jours de travail prévus sur les 12 derniers mois.";

/**
 * Taux d'assiduité sur les 12 derniers mois : part des jours de travail prévus où la personne était là.
 * Seules les absences subies comptent (maladie, autre) : congés et formations sont prévus, pas de l'absentéisme.
 */
export function assiduite(user: TeamUser, absences: TeamAbsence[], todayIso: string) {
  const start = addDays(fromISODate(todayIso), -365);
  const mine = absences.filter((a) => a.userId === user.id && a.status === "validee" && (a.type === "maladie" || a.type === "autre"));
  let prevus = 0;
  let absents = 0;
  for (let d = start; toISODate(d) < todayIso; d = addDays(d, 1)) {
    const iso = toISODate(d);
    if (!worksOn(user, iso)) continue;
    prevus++;
    if (mine.some((a) => a.startDate <= iso && a.endDate >= iso)) absents++;
  }
  const taux = prevus ? Math.round(((prevus - absents) / prevus) * 1000) / 10 : 100;
  return { taux, absents, prevus };
}
