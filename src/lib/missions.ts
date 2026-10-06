import { Mission, MissionFrequence, TeamUser } from "@/types/team";
import { Weekday } from "@/types";
import { WEEKDAYS, WEEKDAY_LABELS, addDays, fromISODate, toISODate } from "@/utils/date";

export const FREQUENCE_LABELS: Record<MissionFrequence, string> = {
  aucune: "Sans suivi",
  quotidienne: "Chaque jour",
  hebdo: "Chaque semaine",
  mensuelle: "Chaque mois",
};

/** Anciennes missions (texte libre) ou missions suivies : on ramène tout à la forme suivie. */
export function missionsOf(u: Pick<TeamUser, "missions">): Mission[] {
  return (u.missions ?? []).map((m, i) =>
    typeof m === "string" ? { id: `m-${i}-${(m as string).slice(0, 12)}`, titre: m as string, frequence: "aucune" as const } : m
  );
}

/** Lundi de la semaine d'une date ISO. */
function mondayOf(iso: string): string {
  const d = fromISODate(iso);
  const offset = (d.getDay() + 6) % 7;
  return toISODate(addDays(d, -offset));
}

/** Dernière échéance d'une mission à aujourd'hui inclus : sa date et la clé de période à cocher. */
export function lastDue(m: Mission, todayIso: string): { key: string; date: string } | null {
  if (m.frequence === "aucune") return null;
  if (m.frequence === "quotidienne") return { key: todayIso, date: todayIso };
  if (m.frequence === "hebdo") {
    const monday = mondayOf(todayIso);
    const idx = WEEKDAYS.indexOf(m.jour ?? "lundi");
    let date = toISODate(addDays(fromISODate(monday), idx));
    let key = monday;
    if (date > todayIso) {
      key = toISODate(addDays(fromISODate(monday), -7));
      date = toISODate(addDays(fromISODate(date), -7));
    }
    return { key, date };
  }
  const today = fromISODate(todayIso);
  const day = Math.min(28, Math.max(1, m.jourDuMois ?? 1));
  let y = today.getFullYear();
  let mo = today.getMonth();
  if (today.getDate() < day) {
    mo -= 1;
    if (mo < 0) {
      mo = 11;
      y -= 1;
    }
  }
  const date = toISODate(new Date(y, mo, day));
  return { key: `${y}-${String(mo + 1).padStart(2, "0")}`, date };
}

export type MissionEtat = "fait" | "a_faire" | "en_retard" | "sans_suivi";

export interface MissionStatus {
  etat: MissionEtat;
  /** Échéance concernée (pour « à faire » ou « en retard »). */
  due?: { key: string; date: string };
  /** Jours de retard. */
  retard?: number;
}

export function missionStatus(m: Mission, todayIso: string): MissionStatus {
  const due = lastDue(m, todayIso);
  if (!due) return { etat: "sans_suivi" };
  if (m.faites?.includes(due.key)) return { etat: "fait", due };
  if (due.date < todayIso) {
    const retard = Math.round((fromISODate(todayIso).getTime() - fromISODate(due.date).getTime()) / 86_400_000);
    return { etat: "en_retard", due, retard };
  }
  return { etat: "a_faire", due };
}

/** Résumé pour une pastille : rouge s'il y a du retard, orange s'il reste à faire aujourd'hui, vert si tout est à jour. */
export function missionsSummary(u: Pick<TeamUser, "missions">, todayIso: string) {
  const suivies = missionsOf(u).filter((m) => m.frequence !== "aucune");
  const statuses = suivies.map((m) => ({ mission: m, ...missionStatus(m, todayIso) }));
  const enRetard = statuses.filter((s) => s.etat === "en_retard");
  const aFaire = statuses.filter((s) => s.etat === "a_faire");
  const faites = statuses.filter((s) => s.etat === "fait");
  const tone: "rouge" | "orange" | "vert" | null = !suivies.length ? null : enRetard.length ? "rouge" : aFaire.length ? "orange" : "vert";
  return { suivies: suivies.length, enRetard, aFaire, faites, tone, statuses };
}

/** « Chaque lundi », « Chaque mois le 5 », « Chaque jour · 09:00 → 12:00 ». */
export function frequenceLabel(m: Mission): string {
  const base =
    m.frequence === "hebdo"
      ? `Chaque ${WEEKDAY_LABELS[m.jour ?? "lundi"].toLowerCase()}`
      : m.frequence === "mensuelle"
        ? `Chaque mois le ${m.jourDuMois ?? 1}`
        : FREQUENCE_LABELS[m.frequence];
  return m.horaire ? `${base} · ${m.horaire}` : base;
}

export function newMissionId(): string {
  return `mi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export type { Weekday };
