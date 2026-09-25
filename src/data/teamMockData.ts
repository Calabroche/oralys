import {
  ActeCategory,
  AuditEntry,
  Permission,
  PermissionCategory,
  PraticienProfile,
  Punch,
  PunchKind,
  Role,
  SkillId,
  SoinsRdv,
  TeamAbsence,
  TeamNotification,
  TeamUser,
} from "@/types/team";
import { Weekday } from "@/types";
import { addDays, toISODate, toWeekday } from "@/utils/date";
import { demoShift, rangeLong, rangeShort, shiftDeep } from "@/lib/demoClock";

export const TEAM_CABINET_NAME = "Cabinet Oralpes";

export const PERMISSION_CATEGORIES: { id: PermissionCategory; label: string; hint: string }[] = [
  { id: "clinique", label: "Clinique", hint: "La décision clinique est réservée aux professionnels de santé." },
  { id: "patients", label: "Patients & rendez-vous", hint: "Organisation quotidienne du cabinet." },
  { id: "finances", label: "Facturation & finances", hint: "Données financières sensibles." },
  { id: "parametres", label: "Paramétrage", hint: "Paramètres cabinet (dont utilisateurs et rôles) et praticien." },
  { id: "team", label: "Nouveaux droits Oralys Team", hint: "Proposés par Team, ils n'existent pas encore dans Soins." },
];

/** Les 12 permissions reprises de la prod Oralys (modale « Rôles de … »), plus 2 droits proposés par Team. */
export const PERMISSIONS: Permission[] = [
  { id: "clinique.decision", label: "Décision clinique", description: "Ordonnance, plan de traitement, diagnostic.", category: "clinique", reservedToHealthPro: true },
  { id: "clinique.assistance", label: "Assistance clinique", description: "Dossier patient, aide au fauteuil.", category: "clinique" },
  { id: "sterilisation", label: "Stérilisation", description: "Lancer et tracer un cycle.", category: "clinique" },
  { id: "adressage", label: "Gestion adressage", description: "Courriers et adressages patients.", category: "patients" },
  { id: "rdv", label: "Gestion rendez-vous", description: "Agenda des praticiens dans Soins.", category: "patients" },
  { id: "facturation", label: "Carte vitale et facturation", description: "Lecture carte Vitale, feuilles de soins, encaissements.", category: "finances" },
  { id: "teletransmission", label: "Suivi télétransmission", description: "Suivi des lots et des rejets.", category: "finances" },
  { id: "compta", label: "Gestion comptable", description: "Recettes, remises, rapprochements.", category: "finances" },
  { id: "finances.individuels", label: "Résultats financiers individuels", description: "Chiffre d'affaires de son propre exercice.", category: "finances" },
  { id: "finances.cabinet", label: "Résultats financiers cabinet", description: "Chiffre d'affaires global du cabinet.", category: "finances" },
  { id: "param.cabinet", label: "Paramètres cabinet", description: "Fiche cabinet, utilisateurs, rôles, archivage et suppression.", category: "parametres" },
  { id: "param.praticien", label: "Paramètres praticien", description: "Agenda, motifs et modèles du praticien.", category: "parametres" },
  { id: "team.planning", label: "Planning d'équipe & remplacements", description: "Valider les congés, affecter les remplaçants.", category: "team", isNew: true },
  { id: "team.audit", label: "Journal d'audit", description: "Historique des actions sensibles, y compris des comptes archivés.", category: "team", isNew: true },
];

/**
 * Les 6 rôles de la prod Oralys. Les correspondances rôle → permissions sont déduites de la vidéo
 * (permissions couvertes affichées en cochant les rôles) : à confirmer avec l'équipe produit.
 */
export const ROLES: Role[] = [
  {
    id: "role-praticien",
    name: "Praticien",
    description: "Chirurgien-dentiste. Seul rôle à porter la décision clinique.",
    predefined: true,
    healthProfessional: true,
    permissions: ["clinique.decision", "clinique.assistance", "sterilisation", "adressage", "rdv", "facturation", "teletransmission", "finances.individuels", "param.praticien"],
  },
  {
    id: "role-gestionnaire",
    name: "Gestionnaire",
    description: "Titulaire ou office manager. Gère le cabinet, les accès et le planning.",
    predefined: true,
    healthProfessional: false,
    permissions: ["adressage", "rdv", "finances.cabinet", "param.cabinet", "team.planning", "team.audit"],
  },
  {
    id: "role-assistant",
    name: "Assistant dentaire",
    description: "Assistant(e) dentaire qualifié(e), au fauteuil.",
    predefined: true,
    healthProfessional: false,
    permissions: ["clinique.assistance", "sterilisation"],
  },
  {
    id: "role-aide",
    name: "Aide dentaire",
    description: "Aide dentaire : stérilisation et logistique.",
    predefined: true,
    healthProfessional: false,
    permissions: ["sterilisation"],
  },
  {
    id: "role-secretaire",
    name: "Secrétaire",
    description: "Accueil, rendez-vous, carte Vitale et télétransmission.",
    predefined: true,
    healthProfessional: false,
    permissions: ["adressage", "rdv", "facturation", "teletransmission"],
  },
  {
    id: "role-comptable",
    name: "Comptable",
    description: "Comptabilité et résultats financiers.",
    predefined: true,
    healthProfessional: false,
    permissions: ["facturation", "teletransmission", "compta", "finances.individuels", "finances.cabinet"],
  },
  {
    id: "role-sterilisation",
    name: "Resp. stérilisation",
    description: "Proposition Team : rôle transverse, cumulable avec un rôle principal.",
    predefined: true,
    healthProfessional: false,
    transverse: true,
    permissions: ["sterilisation", "team.audit"],
  },
];

export const SKILLS: { id: SkillId; label: string }[] = [
  { id: "radioprotection", label: "Radioprotection" },
  { id: "aide_operatoire", label: "Aide opératoire (bloc)" },
  { id: "sterilisation", label: "Stérilisation" },
  { id: "accueil", label: "Accueil patient" },
  { id: "cotation", label: "Aide à la cotation" },
];

/** Spécialités de la prod Oralys (page Équipe), plus « Soins courants » comme motif générique. */
export const ACTES: { id: ActeCategory; label: string; requiredSkills: SkillId[]; specialty: boolean }[] = [
  { id: "implantologie", label: "Implantologie", requiredSkills: ["aide_operatoire", "radioprotection"], specialty: true },
  { id: "chirurgie_orale", label: "Chirurgie orale", requiredSkills: ["aide_operatoire", "radioprotection"], specialty: true },
  { id: "parodontie", label: "Parodontie", requiredSkills: [], specialty: true },
  { id: "endodontie", label: "Endodontie", requiredSkills: [], specialty: true },
  { id: "examen_3d", label: "Examen 3D", requiredSkills: ["radioprotection"], specialty: true },
  { id: "pedodontie", label: "Pédodontie", requiredSkills: [], specialty: true },
  { id: "prothese", label: "Prothèse", requiredSkills: [], specialty: true },
  { id: "soins", label: "Soins courants", requiredSkills: [], specialty: false },
];

export const SPECIALTIES = ACTES.filter((a) => a.specialty);

const WEEK: Weekday[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

function user(partial: Partial<TeamUser> & Pick<TeamUser, "id" | "firstName" | "lastName" | "roleIds" | "poste">): TeamUser {
  return {
    email: `${partial.firstName}.${partial.lastName}@oralpes.fr`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""),
    status: "actif",
    createdAt: "2024-01-08T09:00:00",
    defaultEnvironmentId: null,
    pin: "1234",
    workDays: WEEK,
    skills: [],
    preferredActs: [],
    prefersWith: [],
    avoidsWith: [],
    specialties: [],
    ...partial,
  };
}

export const USERS: TeamUser[] = [
  user({ id: "u-delphine", firstName: "Delphine", lastName: "Girard", roleIds: ["role-gestionnaire"], poste: "gestion", skills: ["cotation"], createdAt: "2023-02-01T09:00:00" }),
  user({ id: "u-sophie", firstName: "Sophie", lastName: "Martin", roleIds: ["role-praticien", "role-gestionnaire"], poste: "praticien", defaultEnvironmentId: "env-martin", specialties: ["implantologie", "chirurgie_orale"], prefersWith: ["u-thomas"], createdAt: "2023-02-01T09:00:00" }),
  user({ id: "u-flore", firstName: "Flore", lastName: "Perche", roleIds: ["role-praticien"], poste: "praticien", defaultEnvironmentId: "env-perche", specialties: ["parodontie", "prothese"] }),
  user({ id: "u-dray", firstName: "Paul", lastName: "Dray", roleIds: ["role-praticien"], poste: "praticien", defaultEnvironmentId: "env-dray", specialties: ["pedodontie", "endodontie"], workDays: ["lundi", "mardi", "jeudi", "vendredi"], avoidsWith: ["u-thomas"] }),
  user({ id: "u-thomas", firstName: "Thomas", lastName: "Dupont", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-martin", skills: ["radioprotection", "aide_operatoire"], preferredActs: ["implantologie", "chirurgie_orale"] }),
  user({ id: "u-ines", firstName: "Inès", lastName: "Moreau", roleIds: ["role-assistant", "role-sterilisation"], poste: "assistant", defaultEnvironmentId: "env-perche", skills: ["radioprotection", "aide_operatoire", "sterilisation"], preferredActs: ["chirurgie_orale", "parodontie"] }),
  user({ id: "u-camille", firstName: "Camille", lastName: "Laurent", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-dray", skills: ["radioprotection"], preferredActs: ["pedodontie", "endodontie"] }),
  user({ id: "u-lea", firstName: "Léa", lastName: "Garnier", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-perche", skills: ["radioprotection"], preferredActs: ["soins", "prothese", "parodontie"], workDays: ["lundi", "mardi", "jeudi"] }),
  user({ id: "u-manon", firstName: "Manon", lastName: "Leroy", roleIds: ["role-aide"], poste: "assistant", skills: ["sterilisation"], workDays: ["lundi", "mardi", "mercredi", "jeudi"] }),
  user({ id: "u-karima", firstName: "Karima", lastName: "Benali", roleIds: ["role-comptable"], poste: "gestion", workDays: ["mardi", "jeudi"] }),
  user({ id: "u-nathalie", firstName: "Nathalie", lastName: "Roux", roleIds: ["role-secretaire"], poste: "secretariat", skills: ["accueil", "cotation"] }),
  user({ id: "u-julie", firstName: "Julie", lastName: "Dubois", roleIds: ["role-secretaire"], poste: "secretariat", status: "en_attente", createdAt: "2026-08-20T14:12:00", invitedAt: "2026-08-20T14:12:00", lastInviteSentAt: "2026-08-20T14:12:00", skills: ["accueil"] }),
  user({ id: "u-hugo", firstName: "Hugo", lastName: "Petit", roleIds: ["role-aide", "role-sterilisation"], poste: "assistant", status: "archive", archivedAt: "2026-06-30T18:00:00", archiveReason: "Fin de CDD", skills: ["sterilisation"], createdAt: "2025-09-01T09:00:00" }),
  user({ id: "u-michel", firstName: "Michel", lastName: "Fontaine", roleIds: ["role-praticien"], poste: "praticien", status: "archive", archivedAt: "2025-09-30T18:00:00", archiveReason: "Remplacement saisonnier terminé", defaultEnvironmentId: "env-fontaine", specialties: ["endodontie"], createdAt: "2025-06-02T09:00:00" }),
];

export const PRATICIEN_PROFILES: PraticienProfile[] = [
  {
    id: "env-martin",
    praticienUserId: "u-sophie",
    label: "Dr Sophie Martin",
    rooms: ["Bloc 1", "Salle 2"],
    assistantsNeeded: 2,
    team: [
      { userId: "u-thomas", priority: "titulaire", rank: 1, days: [] },
      { userId: "u-ines", priority: "backup", rank: 1, days: [] },
      { userId: "u-camille", priority: "backup", rank: 2, days: [] },
    ],
    feedback: { "u-thomas": 5, "u-ines": 4, "u-camille": 3 },
  },
  {
    id: "env-perche",
    praticienUserId: "u-flore",
    label: "Dr Flore Perche",
    rooms: ["Salle 1"],
    team: [
      { userId: "u-lea", priority: "titulaire", rank: 1, days: ["lundi", "mardi", "jeudi"] },
      { userId: "u-ines", priority: "titulaire", rank: 2, days: ["mercredi", "vendredi"] },
      { userId: "u-thomas", priority: "backup", rank: 1, days: [] },
    ],
    feedback: { "u-lea": 4, "u-ines": 5 },
  },
  {
    id: "env-dray",
    praticienUserId: "u-dray",
    label: "Dr Paul Dray",
    rooms: ["Salle 3"],
    team: [
      { userId: "u-camille", priority: "titulaire", rank: 1, days: [] },
      { userId: "u-lea", priority: "backup", rank: 1, days: [] },
    ],
    feedback: { "u-camille": 5, "u-lea": 4 },
  },
  {
    id: "env-fontaine",
    praticienUserId: "u-michel",
    label: "Dr Michel Fontaine",
    rooms: ["Salle 2"],
    team: [{ userId: "u-hugo", priority: "titulaire", rank: 1, days: [] }],
    feedback: {},
  },
];

/** Signal implicite remonté par Soins : nombre de RDV réalisés ensemble sur 12 mois. */
export const COLLABORATIONS: { praticienUserId: string; assistantUserId: string; count: number }[] = [
  { praticienUserId: "u-sophie", assistantUserId: "u-thomas", count: 212 },
  { praticienUserId: "u-sophie", assistantUserId: "u-ines", count: 64 },
  { praticienUserId: "u-sophie", assistantUserId: "u-camille", count: 18 },
  { praticienUserId: "u-sophie", assistantUserId: "u-lea", count: 5 },
  { praticienUserId: "u-flore", assistantUserId: "u-lea", count: 150 },
  { praticienUserId: "u-flore", assistantUserId: "u-ines", count: 88 },
  { praticienUserId: "u-flore", assistantUserId: "u-thomas", count: 22 },
  { praticienUserId: "u-flore", assistantUserId: "u-camille", count: 3 },
  { praticienUserId: "u-dray", assistantUserId: "u-camille", count: 176 },
  { praticienUserId: "u-dray", assistantUserId: "u-lea", count: 31 },
  { praticienUserId: "u-dray", assistantUserId: "u-ines", count: 9 },
  { praticienUserId: "u-dray", assistantUserId: "u-thomas", count: 2 },
];

const ABSENCES: TeamAbsence[] = [
  { id: "abs-t1", userId: "u-thomas", type: "maladie", startDate: "2026-09-01", endDate: "2026-09-02", motif: "Arrêt maladie", status: "validee", declaredAt: "2026-09-01T07:40:00", declaredById: "u-thomas" },
  { id: "abs-t2", userId: "u-camille", type: "conge", startDate: "2026-09-14", endDate: "2026-09-18", status: "validee", declaredAt: "2026-07-10T11:02:00", declaredById: "u-camille" },
  { id: "abs-t3", userId: "u-flore", type: "conge", startDate: "2026-09-21", endDate: "2026-09-25", motif: "Vacances", status: "demandee", declaredAt: "2026-08-31T17:20:00", declaredById: "u-flore" },
  { id: "abs-t4", userId: "u-ines", type: "formation", startDate: "2026-09-08", endDate: "2026-09-08", motif: "Recyclage radioprotection", status: "validee", declaredAt: "2026-06-15T10:00:00", declaredById: "u-ines" },
  { id: "abs-t5", userId: "u-nathalie", type: "conge", startDate: "2026-09-03", endDate: "2026-09-04", status: "validee", declaredAt: "2026-07-22T09:30:00", declaredById: "u-nathalie" },
  { id: "abs-t7", userId: "u-manon", type: "formation", startDate: "2026-09-16", endDate: "2026-09-17", motif: "Hygiène et asepsie", status: "validee", declaredAt: "2026-07-01T09:00:00", declaredById: "u-manon" },
  { id: "abs-t8", userId: "u-karima", type: "conge", startDate: "2026-09-08", endDate: "2026-09-10", status: "validee", declaredAt: "2026-07-20T09:00:00", declaredById: "u-karima" },
  { id: "abs-t6", userId: "u-lea", type: "conge", startDate: "2026-09-14", endDate: "2026-09-15", status: "demandee", declaredAt: "2026-08-28T16:45:00", declaredById: "u-lea" },
];

const AUDIT_LOG: AuditEntry[] = [
  { id: "a-1", at: "2025-06-02T09:10:00", actorId: "u-delphine", actorRoles: ["Gestionnaire"], action: "user.create", summary: "Création de Michel Fontaine (Praticien, remplaçant saisonnier)", targetUserId: "u-michel" },
  { id: "a-2", at: "2025-09-30T18:02:00", actorId: "u-delphine", actorRoles: ["Gestionnaire"], action: "user.archive", summary: "Archivage de Michel Fontaine : remplacement saisonnier terminé", targetUserId: "u-michel" },
  { id: "a-3", at: "2026-03-12T08:14:00", actorId: "u-hugo", actorRoles: ["Aide dentaire", "Resp. stérilisation"], action: "sterilisation.cycle", summary: "Cycle de stérilisation n°1187 lancé (autoclave B)", workstation: "Poste stérilisation" },
  { id: "a-4", at: "2026-05-28T12:40:00", actorId: "u-hugo", actorRoles: ["Aide dentaire", "Resp. stérilisation"], action: "sterilisation.cycle", summary: "Cycle de stérilisation n°1243 lancé (autoclave A)", workstation: "Poste stérilisation" },
  { id: "a-5", at: "2026-06-30T18:00:00", actorId: "u-delphine", actorRoles: ["Gestionnaire"], action: "user.archive", summary: "Archivage de Hugo Petit : fin de CDD", targetUserId: "u-hugo" },
  { id: "a-6", at: "2026-07-10T11:02:00", actorId: "u-camille", actorRoles: ["Assistant dentaire"], action: "absence.declare", summary: "Demande de congé {long:abs-t2}", targetUserId: "u-camille" },
  { id: "a-7", at: "2026-07-11T09:15:00", actorId: "u-delphine", actorRoles: ["Gestionnaire"], action: "absence.validate", summary: "Congé de Camille Laurent validé ({short:abs-t2})", targetUserId: "u-camille" },
  { id: "a-8", at: "2026-08-20T14:12:00", actorId: "u-delphine", actorRoles: ["Gestionnaire"], action: "user.create", summary: "Création de Julie Dubois (Secrétaire), invitation envoyée", targetUserId: "u-julie" },
  { id: "a-9", at: "2026-08-25T10:30:00", actorId: "u-sophie", actorRoles: ["Praticien", "Gestionnaire"], action: "role.assign", summary: "Nathalie Roux : retrait du rôle Gestionnaire", targetUserId: "u-nathalie" },
  { id: "a-10", at: "2026-08-27T16:05:00", actorId: "u-nathalie", actorRoles: ["Secrétaire"], action: "paiement.note", summary: "Note ajoutée sur un paiement échelonné (patient C. Bernard)", workstation: "Poste accueil" },
  { id: "a-11", at: "2026-08-31T17:20:00", actorId: "u-flore", actorRoles: ["Praticien"], action: "absence.declare", summary: "Demande de congé {long:abs-t3}", targetUserId: "u-flore" },
  { id: "a-12", at: "2026-09-01T07:40:00", actorId: "u-thomas", actorRoles: ["Assistant dentaire"], action: "absence.declare", summary: "Arrêt maladie déclaré le jour même ({short:abs-t1})", targetUserId: "u-thomas" },
  { id: "a-13", at: "2026-09-01T08:05:00", actorId: "u-ines", actorRoles: ["Assistant dentaire", "Resp. stérilisation"], action: "sterilisation.cycle", summary: "Cycle de stérilisation n°1302 lancé (autoclave A)", workstation: "Poste stérilisation" },
];

const NOTIFICATIONS: TeamNotification[] = [
  {
    id: "n-1",
    at: "2026-09-01T07:41:00",
    kind: "absence_last_minute",
    title: "Absence de dernier moment : Thomas Dupont",
    body: "Arrêt maladie aujourd'hui et demain. Des RDV de Dr Martin sont à réaffecter.",
    href: "/team/remplacements?absence=abs-t1",
    read: false,
  },
  {
    id: "n-2",
    at: "2026-08-31T17:21:00",
    kind: "conge_request",
    title: "Demande de congé : Dr Flore Perche",
    body: "{Long:abs-t3}. Vérifiez la charge d'agenda avant de valider.",
    href: "/team/planning?tab=demandes",
    read: false,
  },
];

// --- RDV simulés côté Soins -------------------------------------------------

const PATIENTS = [
  "J. Jackson", "L. Roude", "M. Jackson", "O. Aude", "M. Fontaine", "C. Bernard", "A. Morel", "P. Lambert",
  "S. Faure", "N. Chevalier", "E. Blanc", "R. Guerin", "T. Muller", "H. Henry", "V. Roussel", "D. Perrin",
];
const SLOTS: [string, string][] = [
  ["09:00", "10:00"],
  ["10:30", "11:30"],
  ["14:00", "15:00"],
  ["15:30", "16:30"],
];

/** Assistant attendu par défaut pour un praticien un jour donné (titulaire applicable ce jour-là). */
export function defaultAssistantFor(profile: PraticienProfile, day: Weekday): string | null {
  const titulaires = profile.team
    .filter((l) => l.priority === "titulaire" && (l.days.length === 0 || l.days.includes(day)))
    .sort((a, b) => a.rank - b.rank);
  return titulaires[0]?.userId ?? null;
}

function buildRdvs(start: Date, users: TeamUser[]): SoinsRdv[] {
  const result: SoinsRdv[] = [];
  let seq = 0;
  for (let d = 0; d < 42; d++) {
    const date = addDays(start, d);
    const day = toWeekday(date);
    if (!day || day === "samedi") continue;
    for (const profile of PRATICIEN_PROFILES) {
      const praticien = users.find((u) => u.id === profile.praticienUserId)!;
      if (praticien.status !== "actif" || !praticien.workDays.includes(day)) continue;
      const count = 2 + ((d * 7 + praticien.lastName.length) % 3);
      const acts: ActeCategory[] = [...praticien.specialties, "soins"];
      for (let i = 0; i < count; i++) {
        const acte = acts[(d + i) % acts.length];
        const room = acte === "chirurgie_orale" || acte === "implantologie" ? profile.rooms[0] : profile.rooms[profile.rooms.length - 1];
        result.push({
          id: `rdv-${++seq}`,
          date: toISODate(date),
          start: SLOTS[i][0],
          end: SLOTS[i][1],
          praticienUserId: praticien.id,
          assistantUserId: defaultAssistantFor(profile, day),
          patient: PATIENTS[(seq * 5) % PATIENTS.length],
          acte,
          room,
        });
      }
    }
  }
  return result;
}

// --- Données de démo recalées sur la date du jour ----------------------------

/** Ce qui se passe « aujourd'hui » dans le scénario (arrêt maladie du matin, alertes) suit le jour exact. */
const TODAY_ANCHORED = new Set(["abs-t1", "a-11", "a-12", "a-13", "n-1", "n-2"]);

export interface TeamSeed {
  users: TeamUser[];
  punches: Punch[];
  absences: TeamAbsence[];
  audit: AuditEntry[];
  notifications: TeamNotification[];
  rdvs: SoinsRdv[];
}

/** Jeu de données de démo, daté autour de `today` (voir `lib/demoClock`). */
export function buildTeamSeed(today: Date = new Date()): TeamSeed {
  const shift = demoShift(today);
  const move = <T extends { id: string }>(x: T): T => shiftDeep(x, TODAY_ANCHORED.has(x.id) ? shift.day : shift.week);
  const absences = ABSENCES.map(move);
  // Les textes du journal citent les dates des absences : on les réécrit avec les dates recalées.
  const text = (s: string) =>
    s.replace(/\{(long|Long|short):([\w-]+)\}/g, (_, kind: string, id: string) => {
      const a = absences.find((x) => x.id === id)!;
      if (kind === "short") return rangeShort(a.startDate, a.endDate);
      const long = rangeLong(a.startDate, a.endDate);
      return kind === "Long" ? long[0].toUpperCase() + long.slice(1) : long;
    });
  const users = USERS.map((u) => ({ ...shiftDeep(u, shift.week), weeklyHours: WEEKLY_HOURS[u.id] }));
  return {
    users,
    absences,
    audit: AUDIT_LOG.map(move).map((e) => ({ ...e, summary: text(e.summary) })),
    notifications: NOTIFICATIONS.map(move).map((n) => ({ ...n, body: text(n.body) })),
    rdvs: buildRdvs(addDays(new Date(2026, 7, 31), shift.week), users),
    punches: buildPunches(today, users, absences),
  };
}

// --- Pointages de démo (V4) --------------------------------------------------

/** Contrats hebdomadaires. Les praticiens (libéraux) ne pointent pas. */
const WEEKLY_HOURS: Record<string, number> = {
  "u-delphine": 39,
  "u-thomas": 35,
  "u-ines": 35,
  "u-camille": 35,
  "u-lea": 21,
  "u-manon": 28,
  "u-nathalie": 35,
  "u-karima": 14,
};

const STATION: Record<string, string> = {
  "u-nathalie": "Poste accueil",
  "u-delphine": "Poste accueil",
  "u-karima": "Poste accueil",
  "u-manon": "Poste stérilisation",
  "u-ines": "Poste stérilisation",
};

/** Petit aléa déterministe (même démo à chaque rechargement). */
function jitter(key: string, span: number): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % (2 * span + 1)) - span;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`;

/**
 * Deux semaines de pointages : la semaine dernière vient des badges actuels (import), la semaine en cours d'Oralys.
 * Quelques cas réels pour la démo : heures sup d'Inès, oubli de départ de Camille, pause trop courte de Nathalie.
 * Delphine (session par défaut) n'a pas encore pointé aujourd'hui : on peut essayer le bouton.
 */
function buildPunches(today: Date, users: TeamUser[], absences: TeamAbsence[]): Punch[] {
  const out: Punch[] = [];
  const todayIso = toISODate(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const start = addDays(monday, -7);
  const validated = absences.filter((a) => a.status === "validee");
  let seq = 0;
  for (let i = 0; i < 14; i++) {
    const date = addDays(start, i);
    const iso = toISODate(date);
    if (iso > todayIso) break;
    const lastWeek = date < monday;
    const weekday = toWeekday(date);
    for (const u of users) {
      const hours = WEEKLY_HOURS[u.id];
      if (!hours || u.status !== "actif" || !weekday || !u.workDays.includes(weekday)) continue;
      if (validated.some((a) => a.userId === u.id && a.startDate <= iso && a.endDate >= iso)) continue;
      if (iso === todayIso && u.id === "u-delphine") continue;
      const k = u.id + iso;
      const daily = Math.round((hours * 60) / u.workDays.length);
      const arrival = (hours < 20 ? 540 : 480) + jitter(k + "a", 12);
      const breakLen = daily > 6 * 60 ? 45 + jitter(k + "p", 10) : 0;
      let pause = 750 + jitter(k + "b", 15);
      let depart = arrival + daily + breakLen + jitter(k + "d", 10);
      let shortBreak = breakLen;
      let noDepart = false;
      // Cas de démo.
      if (u.id === "u-ines" && lastWeek && (weekday === "mardi" || weekday === "jeudi")) depart += 95;
      if (u.id === "u-manon" && !lastWeek && weekday === "lundi") depart += 70;
      if (u.id === "u-camille" && lastWeek && weekday === "mercredi") noDepart = true;
      if (u.id === "u-nathalie" && !lastWeek && weekday === "mardi") shortBreak = 10;
      if (breakLen && shortBreak !== breakLen) depart -= breakLen - shortBreak;
      if (!breakLen) pause = -1;
      const events: [PunchKind, number][] = [["arrivee", arrival]];
      if (pause > 0) events.push(["pause", pause], ["reprise", pause + shortBreak]);
      if (!noDepart) events.push(["depart", depart]);
      for (const [kind, min] of events) {
        if (iso === todayIso && min > nowMin) break;
        out.push({
          id: `pt-${++seq}`,
          userId: u.id,
          at: `${iso}T${hhmm(min)}`,
          kind,
          source: lastWeek ? "badge" : "poste",
          workstation: lastWeek ? undefined : STATION[u.id] ?? "Poste salle 1",
        });
      }
    }
  }
  return out;
}
