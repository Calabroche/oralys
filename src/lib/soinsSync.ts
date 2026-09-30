import { AbsencePeriod } from "@/types";
import { PraticienProfile, TeamAbsence } from "@/types/team";
import { DEFAULT_SOINS_PRATICIEN } from "@/data/mockData";

const LABELS: Record<TeamAbsence["type"], string> = { conge: "Congé", maladie: "Maladie", formation: "Formation", autre: "Absence" };

/**
 * Absences validées des praticiens dans Team → périodes d'absence de leur agenda Soins (créneaux fermés).
 * Une période par absence, identifiée « team-<id> » ; les fermetures posées dans Soins ne sont pas concernées.
 */
export function teamAbsencePeriods(absences: TeamAbsence[], profiles: Pick<PraticienProfile, "id" | "praticienUserId">[]): AbsencePeriod[] {
  return absences
    .filter((a) => a.status === "validee" && a.source !== "soins")
    .flatMap((a) => {
      const profile = profiles.find((p) => p.praticienUserId === a.userId);
      if (!profile) return [];
      return [
        {
          id: `team-${a.id}`,
          praticienId: profile.id === DEFAULT_SOINS_PRATICIEN ? undefined : profile.id,
          motif: `${LABELS[a.type]} (Oralys Team)`,
          color: a.type === "maladie" ? "red" : a.type === "formation" ? "indigo" : "orange",
          startDate: a.startDate,
          startTime: "00:00",
          endDate: a.endDate,
          endTime: "23:59",
          recurrence: { frequency: "none" },
        } satisfies AbsencePeriod,
      ];
    });
}
