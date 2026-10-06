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

export type MissionEtat = "fait" | "a_controler" | "non_conforme" | "a_faire" | "en_retard" | "sans_suivi";

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
  if (m.faites?.includes(due.key)) {
    if (!m.aControler) return { etat: "fait", due };
    const c = m.controles?.[due.key];
    return { etat: c === "ok" ? "fait" : c === "ko" ? "non_conforme" : "a_controler", due };
  }
  if (due.date < todayIso) {
    const retard = Math.round((fromISODate(todayIso).getTime() - fromISODate(due.date).getTime()) / 86_400_000);
    return { etat: "en_retard", due, retard };
  }
  return { etat: "a_faire", due };
}

/** Résumé pour une pastille : rouge s'il y a du retard ou un contrôle non conforme, orange s'il reste à faire aujourd'hui, vert si tout est à jour. */
export function missionsSummary(u: Pick<TeamUser, "missions">, todayIso: string) {
  const suivies = missionsOf(u).filter((m) => m.frequence !== "aucune");
  const statuses = suivies.map((m) => ({ mission: m, ...missionStatus(m, todayIso) }));
  const enRetard = statuses.filter((s) => s.etat === "en_retard" || s.etat === "non_conforme");
  const aFaire = statuses.filter((s) => s.etat === "a_faire");
  const aControler = statuses.filter((s) => s.etat === "a_controler");
  const faites = statuses.filter((s) => s.etat === "fait" || s.etat === "a_controler");
  const tone: "rouge" | "orange" | "vert" | null = !suivies.length ? null : enRetard.length ? "rouge" : aFaire.length ? "orange" : "vert";
  return { suivies: suivies.length, enRetard, aFaire, aControler, faites, tone, statuses };
}

// --- Suivi dans la durée -------------------------------------------------------------

/** Fenêtre du taux de réalisation : les 8 dernières semaines. */
export const TAUX_FENETRE_JOURS = 56;

/** Explication affichée en petit sous le taux de réalisation. */
export const TAUX_MISSIONS_NB =
  "Taux de réalisation : échéances faites (et jugées conformes quand la mission est contrôlée) sur celles des 8 dernières semaines (6 mois pour une mission mensuelle).";

/** Clé de période d'une date si la mission est due ce jour-là, sinon null. */
export function dueKeyOn(m: Mission, iso: string): string | null {
  const d = fromISODate(iso);
  if (m.frequence === "quotidienne") return iso;
  if (m.frequence === "hebdo") return WEEKDAYS[(d.getDay() + 6) % 7] === (m.jour ?? "lundi") ? mondayOf(iso) : null;
  if (m.frequence === "mensuelle") return d.getDate() === Math.min(28, Math.max(1, m.jourDuMois ?? 1)) ? iso.slice(0, 7) : null;
  return null;
}

/**
 * Échéances passées d'une mission sur la fenêtre (aujourd'hui exclu : on ne compte pas en retard ce qui peut encore
 * être fait). `travaille` écarte, pour une mission quotidienne, les jours où la personne n'est pas là. Une mission
 * mensuelle se regarde sur 6 mois, sinon on n'aurait que deux échéances.
 */
export function echeances(m: Mission, todayIso: string, travaille?: (iso: string) => boolean) {
  const jours = m.frequence === "mensuelle" ? 182 : TAUX_FENETRE_JOURS;
  const out: { key: string; date: string }[] = [];
  for (let d = addDays(fromISODate(todayIso), -jours); toISODate(d) < todayIso; d = addDays(d, 1)) {
    const iso = toISODate(d);
    const key = dueKeyOn(m, iso);
    if (key && (m.frequence !== "quotidienne" || !travaille || travaille(iso))) out.push({ key, date: iso });
  }
  return out;
}

/** Une échéance compte comme réussie si elle est cochée, et jugée conforme quand la mission est contrôlée. */
export function reussie(m: Mission, key: string): boolean {
  if (!m.faites?.includes(key)) return false;
  return !m.aControler || m.controles?.[key] !== "ko";
}

/** Taux de réalisation d'une mission sur les 8 dernières semaines (null s'il n'y a pas encore eu d'échéance). */
export function missionRate(m: Mission, todayIso: string, travaille?: (iso: string) => boolean) {
  const dues = echeances(m, todayIso, travaille);
  if (!dues.length) return null;
  const ok = dues.filter((e) => reussie(m, e.key)).length;
  return { taux: Math.round((ok / dues.length) * 100), faites: ok, dues: dues.length };
}

/** Taux global d'une personne : toutes ses missions suivies mises bout à bout. */
export function personMissionRate(u: Pick<TeamUser, "missions">, todayIso: string, travaille?: (iso: string) => boolean) {
  let faites = 0;
  let dues = 0;
  for (const m of missionsOf(u).filter((x) => x.frequence !== "aucune")) {
    const r = missionRate(m, todayIso, travaille);
    if (r) {
      faites += r.faites;
      dues += r.dues;
    }
  }
  return dues ? { taux: Math.round((faites / dues) * 100), faites, dues } : null;
}

/** Vert à partir de 90 %, orange de 70 à 89 %, rouge en dessous. */
export function rateTone(taux: number): "vert" | "orange" | "rouge" {
  return taux >= 90 ? "vert" : taux >= 70 ? "orange" : "rouge";
}

/**
 * Couleur de la pastille du trombinoscope, calée sur les mêmes seuils que `rateTone` : vert à partir de 90 %,
 * de l'orange à l'ambre entre 70 et 89 %, un dégradé de rouge en dessous (plus foncé quand c'est plus bas).
 */
export function rateColor(taux: number): string {
  if (taux >= 90) return "hsl(142 65% 42%)";
  if (taux >= 70) return `hsl(${Math.round(25 + ((taux - 70) / 19) * 20)} 92% 50%)`;
  const t = Math.max(0, Math.min(1, taux / 70));
  return `hsl(${Math.round(t * 10)} 75% ${Math.round(32 + t * 18)}%)`;
}

/** Missions dues un jour donné (pour le planning et la semaine en cours), avec leur état. */
export function missionsDueOn(u: Pick<TeamUser, "missions">, iso: string, todayIso: string) {
  return missionsOf(u)
    .filter((m) => m.frequence !== "aucune")
    .map((m) => ({ mission: m, key: dueKeyOn(m, iso) }))
    .filter((x): x is { mission: Mission; key: string } => x.key !== null)
    .map(({ mission, key }) => {
      const done = mission.faites?.includes(key);
      const ctrl = mission.controles?.[key];
      const etat: MissionEtat = done
        ? !mission.aControler || ctrl === "ok"
          ? "fait"
          : ctrl === "ko"
            ? "non_conforme"
            : "a_controler"
        : iso < todayIso
          ? "en_retard"
          : "a_faire";
      return { mission, key, etat };
    });
}

/** « Chaque lundi », « Chaque mois le 5 », « Chaque jour · 09:00 → 12:00 ». */
export function frequenceLabel(m: Pick<Mission, "frequence" | "jour" | "jourDuMois" | "horaire">): string {
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
