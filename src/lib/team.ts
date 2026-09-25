import { Weekday } from "@/types";
import {
  ActeCategory,
  DayNeed,
  DayOverride,
  PermissionId,
  PraticienProfile,
  Role,
  SoinsRdv,
  TeamAbsence,
  TeamUser,
} from "@/types/team";
import { ACTES, COLLABORATIONS, SKILLS } from "@/data/teamMockData";
import { fromISODate, toWeekday, WEEKDAY_LABELS } from "@/utils/date";

export function fullName(u: Pick<TeamUser, "firstName" | "lastName">): string {
  return `${u.firstName} ${u.lastName}`;
}

export function initials(u: Pick<TeamUser, "firstName" | "lastName">): string {
  return `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
}

export function displayName(u: TeamUser): string {
  return u.poste === "praticien" ? `Dr ${fullName(u)}` : fullName(u);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function permissionsOf(user: TeamUser | undefined, roles: Role[]): Set<PermissionId> {
  const set = new Set<PermissionId>();
  if (!user || user.status !== "actif") return set;
  for (const roleId of user.roleIds) {
    roles.find((r) => r.id === roleId)?.permissions.forEach((p) => set.add(p));
  }
  return set;
}

export function isHealthProfessional(user: TeamUser, roles: Role[]): boolean {
  return user.roleIds.some((id) => roles.find((r) => r.id === id)?.healthProfessional);
}

export function roleNames(user: TeamUser, roles: Role[]): string[] {
  return user.roleIds.map((id) => roles.find((r) => r.id === id)?.name).filter((n): n is string => Boolean(n));
}

// --- Absences & disponibilités ---------------------------------------------

export const ABSENCE_TYPE_LABELS: Record<TeamAbsence["type"], string> = {
  conge: "Congé",
  maladie: "Maladie",
  formation: "Formation",
  autre: "Autre",
};

/** Une absence est "de dernier moment" si elle commence moins de 48h après sa déclaration. */
export function isLastMinute(absence: TeamAbsence): boolean {
  const declared = new Date(absence.declaredAt).getTime();
  const start = fromISODate(absence.startDate).getTime();
  return start - declared < 48 * 3600 * 1000;
}

export function absenceOn(userId: string, iso: string, absences: TeamAbsence[]): TeamAbsence | undefined {
  return absences.find(
    (a) => a.userId === userId && a.status !== "refusee" && a.startDate <= iso && a.endDate >= iso
  );
}

export function worksOn(user: TeamUser, iso: string): boolean {
  const day = toWeekday(fromISODate(iso));
  return day !== null && user.workDays.includes(day);
}

export function isAvailable(user: TeamUser, iso: string, absences: TeamAbsence[]): boolean {
  return user.status === "actif" && worksOn(user, iso) && !absenceOn(user.id, iso, absences);
}

export function datesBetween(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const d = fromISODate(startIso);
  const end = fromISODate(endIso);
  while (d <= end) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** RDV Soins qui deviennent à risque à cause d'une absence (praticien ou assistant absent). */
export function rdvsAtRisk(rdvs: SoinsRdv[], absences: TeamAbsence[], profiles: PraticienProfile[] = []): { rdv: SoinsRdv; reason: "praticien" | "assistant" | "sans_assistant" }[] {
  const out: { rdv: SoinsRdv; reason: "praticien" | "assistant" | "sans_assistant" }[] = [];
  for (const rdv of rdvs) {
    // Un praticien qui travaille sans assistant n'a pas de RDV à risque côté assistant.
    const needsAssistant = (profiles.find((p) => p.praticienUserId === rdv.praticienUserId)?.assistantsNeeded ?? 1) > 0;
    if (absenceOn(rdv.praticienUserId, rdv.date, absences)) out.push({ rdv, reason: "praticien" });
    else if (!needsAssistant) continue;
    else if (rdv.assistantUserId && absenceOn(rdv.assistantUserId, rdv.date, absences)) out.push({ rdv, reason: "assistant" });
    else if (!rdv.assistantUserId) out.push({ rdv, reason: "sans_assistant" });
  }
  return out;
}

/** Jours où tous les assistants rattachés à un praticien sont absents alors que le praticien travaille. */
export function tensionsFor(
  profile: PraticienProfile,
  users: TeamUser[],
  absences: TeamAbsence[],
  dates: string[]
): string[] {
  const praticien = users.find((u) => u.id === profile.praticienUserId);
  if (!praticien || praticien.status !== "actif") return [];
  return dates.filter((iso) => {
    if (!isAvailable(praticien, iso, absences)) return false;
    const day = toWeekday(fromISODate(iso));
    const linked = profile.team
      .filter((l) => l.days.length === 0 || (day && l.days.includes(day)))
      .map((l) => users.find((u) => u.id === l.userId))
      .filter((u): u is TeamUser => Boolean(u) && u!.status === "actif" && worksOn(u!, iso));
    return linked.length > 0 && linked.every((u) => absenceOn(u.id, iso, absences));
  });
}

/** Charge d'agenda d'un praticien sur une période (RDV posés / capacité théorique). */
export function agendaLoad(praticien: TeamUser, startIso: string, endIso: string, rdvs: SoinsRdv[]) {
  const days = datesBetween(startIso, endIso).filter((iso) => worksOn(praticien, iso));
  const booked = rdvs.filter((r) => r.praticienUserId === praticien.id && r.date >= startIso && r.date <= endIso);
  const capacity = days.length * 4;
  return { booked: booked.length, capacity, ratio: capacity === 0 ? 0 : booked.length / capacity, rdvs: booked };
}

// --- Algorithme de suggestion ---------------------------------------------

export interface ScorePart {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface Candidate {
  user: TeamUser;
  eligible: boolean;
  blockers: string[];
  /** Brique 1 : niveau de priorité déclaré (0 = titulaire, 1 = back-up, 2 = autre). */
  tier: 0 | 1 | 2;
  rank: number;
  tierLabel: string;
  /** Brique 2 : score d'affinité 0-100. */
  score: number;
  parts: ScorePart[];
}

export interface SuggestionContext {
  praticienUserId: string;
  date: string;
  start?: string;
  acte: ActeCategory;
  /** RDV à exclure du contrôle "déjà occupé" (le RDV en cours de réaffectation). */
  excludeRdvId?: string;
}

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label ?? id;
}

export function acteLabel(id: ActeCategory): string {
  return ACTES.find((a) => a.id === id)?.label ?? id;
}

export function suggestAssistants(
  ctx: SuggestionContext,
  data: { users: TeamUser[]; profiles: PraticienProfile[]; absences: TeamAbsence[]; rdvs: SoinsRdv[] }
): Candidate[] {
  const praticien = data.users.find((u) => u.id === ctx.praticienUserId);
  const profile = data.profiles.find((p) => p.praticienUserId === ctx.praticienUserId);
  if (!praticien || !profile) return [];
  const day = toWeekday(fromISODate(ctx.date));
  const required = ACTES.find((a) => a.id === ctx.acte)?.requiredSkills ?? [];
  const assistants = data.users.filter((u) => isChairAssistant(u) && u.status !== "archive");

  const candidates = assistants.map<Candidate>((u) => {
    const blockers: string[] = [];
    if (u.status !== "actif") blockers.push("Compte pas encore activé");
    const abs = absenceOn(u.id, ctx.date, data.absences);
    if (abs) blockers.push(`Absent(e) : ${ABSENCE_TYPE_LABELS[abs.type].toLowerCase()}`);
    else if (!worksOn(u, ctx.date)) blockers.push(`Ne travaille pas le ${day ? WEEKDAY_LABELS[day].toLowerCase() : "dimanche"}`);
    const missing = required.filter((s) => !u.skills.includes(s));
    if (missing.length) blockers.push(`Habilitation manquante : ${missing.map(skillLabel).join(", ")}`);
    if (ctx.start) {
      const busy = data.rdvs.find(
        (r) => r.id !== ctx.excludeRdvId && r.assistantUserId === u.id && r.date === ctx.date && r.start === ctx.start
      );
      if (busy) {
        const other = data.users.find((x) => x.id === busy.praticienUserId);
        blockers.push(`Déjà au fauteuil avec ${other ? displayName(other) : "un autre praticien"} sur ce créneau`);
      }
    }

    const link = profile.team.find((l) => l.userId === u.id);
    const tier: Candidate["tier"] = link ? (link.priority === "titulaire" ? 0 : 1) : 2;
    const rank = link?.rank ?? 99;
    const tierLabel = link ? (link.priority === "titulaire" ? `Titulaire n°${link.rank}` : `Back-up n°${link.rank}`) : "Non rattaché(e)";

    const parts: ScorePart[] = [];
    const linkPts = !link ? 0 : link.priority === "titulaire" ? 25 : Math.max(10, 20 - (link.rank - 1) * 4);
    parts.push({ label: "Rattachement", points: linkPts, max: 25, detail: tierLabel });

    const collab = COLLABORATIONS.find((c) => c.praticienUserId === praticien.id && c.assistantUserId === u.id)?.count ?? 0;
    parts.push({
      label: "Historique Soins",
      points: Math.round(Math.min(collab / 150, 1) * 25),
      max: 25,
      detail: `${collab} RDV ensemble sur 12 mois`,
    });

    const actePts = u.preferredActs.includes(ctx.acte) ? 15 : u.preferredActs.some((a) => praticien.specialties.includes(a)) ? 8 : 0;
    parts.push({
      label: "Préférence d'actes",
      points: actePts,
      max: 15,
      detail: actePts === 15 ? `Préfère ${acteLabel(ctx.acte).toLowerCase()}` : actePts ? "Proche des spécialités du praticien" : "Pas de préférence déclarée",
    });

    const fb = profile.feedback[u.id];
    parts.push({
      label: "Retours du cabinet",
      points: fb ? Math.round((fb / 5) * 15) : 7,
      max: 15,
      detail: fb ? `${fb}/5` : "Aucun retour saisi (neutre)",
    });

    parts.push({ label: "Habilitations", points: missing.length ? 0 : 10, max: 10, detail: required.length ? required.map(skillLabel).join(", ") : "Aucune requise" });

    let rel = 0;
    let relDetail = "Neutre";
    if (praticien.prefersWith.includes(u.id) || u.prefersWith.includes(praticien.id)) {
      rel = 10;
      relDetail = "Préférence déclarée";
    }
    if (praticien.avoidsWith.includes(u.id) || u.avoidsWith.includes(praticien.id)) {
      rel = -25;
      relDetail = "Préférence de ne pas travailler ensemble";
    }
    parts.push({ label: "Préférences relationnelles", points: rel, max: 10, detail: relDetail });

    const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.points, 0)));
    return { user: u, eligible: blockers.length === 0, blockers, tier, rank, tierLabel, score, parts };
  });

  return candidates;
}

export function sortCandidates(list: Candidate[], mode: "regles" | "affinite"): Candidate[] {
  return [...list].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (mode === "regles") {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.rank !== b.rank) return a.rank - b.rank;
    }
    return b.score - a.score;
  });
}

/** Date courte lisible : "lun. 14 sept." */
export function shortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

// --- Composition des binômes au jour le jour -------------------------------

export interface StaffingSlot {
  assistantId: string;
  kind: "titulaire" | "backup" | "pret";
}

export interface PraticienDay {
  profile: PraticienProfile;
  praticien: TeamUser;
  status: "travaille" | "absent" | "repos";
  need: number;
  /** Besoin habituel (fiche praticien), quand il est ajusté pour la journée. */
  baseNeed: number;
  /** Ajustement du besoin pour cette journée, s'il y en a un. */
  dayNeed?: DayNeed;
  slots: StaffingSlot[];
  missing: number;
  /** Titulaires attendus ce jour-là mais absents (pour expliquer le trou). */
  absentTitulaires: string[];
  /** Titulaires présents mais déjà en binôme avec un autre praticien ce jour-là. */
  busyTitulaires: string[];
}

export interface DayStaffing {
  date: string;
  praticiens: PraticienDay[];
  /** assistantId → praticienId pour la journée. */
  assignmentOf: Record<string, string>;
  /** Assistants présents mais affectés à personne. */
  free: string[];
  /** Assistants absents ce jour-là. */
  absent: string[];
}

/**
 * Compose l'équipe du jour : d'abord chaque titulaire avec son praticien, puis on comble les trous
 * avec les back-ups disponibles, en faisant un tour de table (1er assistant de chaque praticien
 * avant le 2e) pour ne pas qu'un praticien à gros besoin prenne tous les back-ups.
 */
export function dayStaffing(
  date: string,
  profiles: PraticienProfile[],
  users: TeamUser[],
  absences: TeamAbsence[],
  overrides: DayOverride[] = [],
  needs: DayNeed[] = []
): DayStaffing {
  const day = toWeekday(fromISODate(date));
  const applies = (l: PraticienProfile["team"][number]) => l.days.length === 0 || (day !== null && l.days.includes(day));
  const assistants = users.filter((u) => isChairAssistant(u) && u.status === "actif");
  const available = new Set(assistants.filter((u) => isAvailable(u, date, absences)).map((u) => u.id));
  const used = new Set<string>();

  const praticiens: PraticienDay[] = profiles
    .map((profile) => ({ profile, praticien: users.find((u) => u.id === profile.praticienUserId) }))
    .filter((x): x is { profile: PraticienProfile; praticien: TeamUser } => Boolean(x.praticien) && x.praticien!.status === "actif")
    .map(({ profile, praticien }) => {
      const status: PraticienDay["status"] = !worksOn(praticien, date) ? "repos" : absenceOn(praticien.id, date, absences) ? "absent" : "travaille";
      const baseNeed = status === "travaille" ? profile.assistantsNeeded ?? 1 : 0;
      const dayNeed = status === "travaille" ? needs.find((n) => n.date === date && n.praticienId === praticien.id) : undefined;
      const need = dayNeed ? dayNeed.need : baseNeed;
      return { profile, praticien, status, need, baseNeed, dayNeed, slots: [], missing: 0, absentTitulaires: [], busyTitulaires: [] };
    });

  const working = praticiens.filter((p) => p.status === "travaille");

  // Les prêts du jour passent avant tout : c'est une décision explicite du gestionnaire.
  for (const o of overrides.filter((x) => x.date === date)) {
    const p = working.find((w) => w.praticien.id === o.praticienId);
    if (p && available.has(o.assistantId) && !used.has(o.assistantId)) {
      p.slots.push({ assistantId: o.assistantId, kind: "pret" });
      used.add(o.assistantId);
    }
  }

  const rankSort = (a: { rank: number }, b: { rank: number }) => a.rank - b.rank;

  for (const p of working) {
    for (const l of p.profile.team.filter((l) => l.priority === "titulaire" && applies(l)).sort(rankSort)) {
      if (p.slots.length >= p.need) break;
      if (available.has(l.userId) && !used.has(l.userId)) {
        p.slots.push({ assistantId: l.userId, kind: "titulaire" });
        used.add(l.userId);
      } else if (!available.has(l.userId) && users.find((u) => u.id === l.userId && worksOn(u, date))) {
        p.absentTitulaires.push(l.userId);
      } else if (used.has(l.userId)) {
        p.busyTitulaires.push(l.userId);
      }
    }
  }

  const maxNeed = Math.max(0, ...working.map((p) => p.need));
  for (let slot = 1; slot <= maxNeed; slot++) {
    for (const p of working) {
      if (p.slots.length >= slot || p.slots.length >= p.need) continue;
      const pick = p.profile.team
        .filter((l) => l.priority === "backup" && applies(l) && available.has(l.userId) && !used.has(l.userId))
        .sort(rankSort)[0];
      if (pick) {
        p.slots.push({ assistantId: pick.userId, kind: "backup" });
        used.add(pick.userId);
      }
    }
  }
  working.forEach((p) => (p.missing = p.need - p.slots.length));

  const assignmentOf: Record<string, string> = {};
  working.forEach((p) => p.slots.forEach((s) => (assignmentOf[s.assistantId] = p.praticien.id)));
  return {
    date,
    praticiens,
    assignmentOf,
    free: [...available].filter((id) => !used.has(id)),
    absent: assistants.filter((u) => worksOn(u, date) && absenceOn(u.id, date, absences)).map((u) => u.id),
  };
}

// --- Rôles comme axe de lecture du planning ---------------------------------

/** Ordre d'affichage des 6 rôles de la prod ; le premier rôle détenu sert de groupe principal. */
export const ROLE_ORDER = ["role-praticien", "role-assistant", "role-aide", "role-secretaire", "role-comptable", "role-gestionnaire"];

export const ROLE_GROUP_LABELS: Record<string, string> = {
  "role-praticien": "Praticiens",
  "role-assistant": "Assistants dentaires",
  "role-aide": "Aides dentaires",
  "role-secretaire": "Secrétaires",
  "role-comptable": "Comptables",
  "role-gestionnaire": "Gestionnaires",
};

/** Couverture minimale attendue chaque jour ouvré, pour les rôles hors binômes. */
export const ROLE_MIN_COVERAGE: Record<string, { min: number; label: string }> = {
  "role-secretaire": { min: 1, label: "Accueil non couvert" },
  "role-aide": { min: 1, label: "Stérilisation sans aide dentaire" },
};

export function primaryRoleId(u: TeamUser): string {
  return ROLE_ORDER.find((r) => u.roleIds.includes(r)) ?? u.roleIds[0] ?? "autre";
}

/** Seuls les assistants dentaires (qualifiés) travaillent au fauteuil en binôme avec un praticien. */
export function isChairAssistant(u: TeamUser): boolean {
  return u.roleIds.includes("role-assistant");
}

// --- Ajustement de l'équipe au besoin en assistants --------------------------

/** Nombre de titulaires couvrant chaque jour travaillé du praticien. */
export function titularCoverage(profile: PraticienProfile, praticien: TeamUser): { day: Weekday; count: number }[] {
  return praticien.workDays.map((day) => ({
    day,
    count: profile.team.filter((l) => l.priority === "titulaire" && (l.days.length === 0 || l.days.includes(day))).length,
  }));
}

function renumberTeam(team: PraticienProfile["team"]): PraticienProfile["team"] {
  const counters = { titulaire: 0, backup: 0 };
  return [...team]
    .sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1))
    .map((l) => ({ ...l, rank: ++counters[l.priority] }));
}

/**
 * Aligne les titulaires sur le besoin : on promeut les back-ups (par ordre de priorité) tant qu'un jour
 * manque de titulaires, et on rétrograde les derniers titulaires tant que chaque jour reste couvert sans eux.
 */
export function adjustTeamToNeed(profile: PraticienProfile, praticien: TeamUser, need: number, users: TeamUser[]) {
  // Sans assistant : on garde l'équipe telle quelle, elle resservira si le besoin remonte.
  if (need === 0) return { team: profile.team, changes: [] as string[], stillMissing: [] as Weekday[] };
  let team = profile.team.map((l) => ({ ...l }));
  const changes: string[] = [];
  const name = (id: string) => users.find((u) => u.id === id)?.firstName ?? "?";
  const lacks = (t: typeof team) =>
    titularCoverage({ ...profile, team: t }, praticien).filter((c) => c.count < need).map((c) => c.day);

  // Promotion
  for (;;) {
    const missingDays = lacks(team);
    if (!missingDays.length) break;
    const candidate = team
      .filter((l) => l.priority === "backup" && (l.days.length === 0 || l.days.some((d) => missingDays.includes(d))))
      .sort((a, b) => a.rank - b.rank)[0];
    if (!candidate) break;
    candidate.priority = "titulaire";
    candidate.rank = 99;
    changes.push(`${name(candidate.userId)} passe titulaire`);
    team = renumberTeam(team);
  }

  // Rétrogradation
  for (;;) {
    const titulaires = team.filter((l) => l.priority === "titulaire").sort((a, b) => b.rank - a.rank);
    const removable = titulaires.find((l) => {
      const without = team.map((x) => (x === l ? { ...x, priority: "backup" as const } : x));
      return titularCoverage({ ...profile, team: without }, praticien).every((c) => c.count >= need);
    });
    if (!removable) break;
    removable.priority = "backup";
    removable.rank = 0;
    changes.push(`${name(removable.userId)} repasse back-up`);
    team = renumberTeam(team);
  }

  return { team: renumberTeam(team), changes, stillMissing: lacks(team) };
}

// --- Reprogrammation d'un RDV ------------------------------------------------

const REBOOK_SLOTS: [string, string][] = [
  ["09:00", "10:00"],
  ["10:30", "11:30"],
  ["14:00", "15:00"],
  ["15:30", "16:30"],
  ["17:00", "18:00"],
];

export interface RebookSlot {
  date: string;
  start: string;
  end: string;
  assistant: Candidate | null;
}

/**
 * Prochains créneaux où le RDV peut être déplacé : praticien présent et libre, et (s'il a besoin
 * d'un assistant) au moins un assistant admissible pour l'acte. Le meilleur binôme est pré-choisi.
 */
export function findRebookSlots(
  rdv: SoinsRdv,
  fromIso: string,
  data: { users: TeamUser[]; profiles: PraticienProfile[]; absences: TeamAbsence[]; rdvs: SoinsRdv[] },
  max = 6
): RebookSlot[] {
  const praticien = data.users.find((u) => u.id === rdv.praticienUserId);
  if (!praticien) return [];
  const need = data.profiles.find((p) => p.praticienUserId === praticien.id)?.assistantsNeeded ?? 1;
  const out: RebookSlot[] = [];
  const start = fromISODate(fromIso > rdv.date ? fromIso : rdv.date);
  for (let i = 0; i < 30 && out.length < max; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!isAvailable(praticien, iso, data.absences)) continue;
    for (const [s, e] of REBOOK_SLOTS) {
      if (out.length >= max) break;
      if (iso === rdv.date && s === rdv.start) continue;
      const busy = data.rdvs.some((r) => r.id !== rdv.id && r.praticienUserId === praticien.id && r.date === iso && r.start === s);
      if (busy) continue;
      if (need === 0) {
        out.push({ date: iso, start: s, end: e, assistant: null });
        continue;
      }
      const best = sortCandidates(
        suggestAssistants({ praticienUserId: praticien.id, date: iso, start: s, acte: rdv.acte, excludeRdvId: rdv.id }, data),
        "affinite"
      ).find((c) => c.eligible);
      if (best) out.push({ date: iso, start: s, end: e, assistant: best });
    }
  }
  return out;
}

// --- Pourquoi un rattaché n'est pas aux côtés de son praticien --------------

export interface TeamMemberStatus {
  user: TeamUser;
  priority: "titulaire" | "backup";
  /** present : avec ce praticien ; ailleurs : avec un autre praticien ; absent ; off : ne travaille pas ou libre ; autre_jour : rattachement limité à d'autres jours. */
  state: "present" | "ailleurs" | "absent" | "off" | "autre_jour";
  /** Praticien chez qui la personne travaille ce jour-là. */
  elsewhere?: TeamUser;
  /** Prêt du jour qui l'envoie ailleurs (on peut l'annuler pour la récupérer). */
  loan?: DayOverride;
  absence?: TeamAbsence;
  label: string;
}

/** État de chaque assistant rattaché à un praticien pour une journée, avec une raison lisible. */
export function teamMembersOn(
  day: PraticienDay,
  staffing: DayStaffing,
  users: TeamUser[],
  absences: TeamAbsence[],
  overrides: DayOverride[]
): TeamMemberStatus[] {
  const weekday = toWeekday(fromISODate(staffing.date));
  return [...day.profile.team]
    .sort((a, b) => (a.priority === b.priority ? a.rank - b.rank : a.priority === "titulaire" ? -1 : 1))
    .map((l): TeamMemberStatus | null => {
      const user = users.find((u) => u.id === l.userId);
      if (!user || user.status !== "actif") return null;
      const role = l.priority === "titulaire" ? "titulaire" : "back-up";
      if (day.slots.some((s) => s.assistantId === user.id)) return { user, priority: l.priority, state: "present", label: `${user.firstName} (${role}) est là` };
      if (weekday && l.days.length && !l.days.includes(weekday)) return { user, priority: l.priority, state: "autre_jour", label: `${user.firstName} (${role}) n'est rattaché(e) que d'autres jours` };
      const absence = absenceOn(user.id, staffing.date, absences);
      if (absence) return { user, priority: l.priority, state: "absent", absence, label: `${user.firstName} (${role}) : ${ABSENCE_TYPE_LABELS[absence.type].toLowerCase()}` };
      if (!worksOn(user, staffing.date)) return { user, priority: l.priority, state: "off", label: `${user.firstName} (${role}) ne travaille pas ce jour-là` };
      const otherId = staffing.assignmentOf[user.id];
      if (otherId && otherId !== day.praticien.id) {
        const elsewhere = users.find((u) => u.id === otherId);
        const loan = overrides.find((o) => o.date === staffing.date && o.assistantId === user.id);
        const where = elsewhere ? displayName(elsewhere) : "un autre praticien";
        return {
          user,
          priority: l.priority,
          state: "ailleurs",
          elsewhere,
          loan,
          label: loan ? `${user.firstName} (${role}) est prêté(e) à ${where}` : `${user.firstName} (${role}) est avec ${where}`,
        };
      }
      return { user, priority: l.priority, state: "off", label: `${user.firstName} (${role}) est libre` };
    })
    .filter((x): x is TeamMemberStatus => x !== null);
}
