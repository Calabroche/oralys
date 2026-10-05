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
    // Pas de team.planning : elle voit le planning (via "rdv") mais ne peut rien y valider, refuser
    // ni réaffecter — lecture seule, comme les assistants et aides, mais avec un périmètre plus large.
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
  user({ id: "u-flore", firstName: "Flore", lastName: "Perche", roleIds: ["role-praticien"], poste: "praticien", defaultEnvironmentId: "env-perche", specialties: ["parodontie", "prothese"], workDays: ["lundi", "mardi", "jeudi", "vendredi"] }),
  user({ id: "u-dray", firstName: "Paul", lastName: "Dray", roleIds: ["role-praticien"], poste: "praticien", defaultEnvironmentId: "env-dray", specialties: ["pedodontie", "endodontie"], workDays: ["lundi", "mardi", "jeudi", "vendredi"], halfDays: { vendredi: "matin" }, avoidsWith: ["u-thomas"] }),
  user({ id: "u-thomas", firstName: "Thomas", lastName: "Dupont", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-martin", skills: ["radioprotection", "aide_operatoire"], preferredActs: ["implantologie", "chirurgie_orale"] }),
  user({ id: "u-ines", firstName: "Inès", lastName: "Moreau", roleIds: ["role-assistant", "role-sterilisation"], poste: "assistant", defaultEnvironmentId: "env-perche", skills: ["radioprotection", "aide_operatoire", "sterilisation"], preferredActs: ["chirurgie_orale", "parodontie"] }),
  user({ id: "u-camille", firstName: "Camille", lastName: "Laurent", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-dray", skills: ["radioprotection"], preferredActs: ["pedodontie", "endodontie"] }),
  user({ id: "u-lea", firstName: "Léa", lastName: "Garnier", roleIds: ["role-assistant"], poste: "assistant", defaultEnvironmentId: "env-perche", skills: ["radioprotection"], preferredActs: ["soins", "prothese", "parodontie"], workDays: ["lundi", "mardi", "jeudi"], halfDays: { jeudi: "matin" } }),
  user({ id: "u-manon", firstName: "Manon", lastName: "Leroy", roleIds: ["role-aide"], poste: "assistant", skills: ["sterilisation"], workDays: ["lundi", "mardi", "mercredi", "jeudi"] }),
  user({ id: "u-karima", firstName: "Karima", lastName: "Benali", roleIds: ["role-comptable"], poste: "gestion", workDays: ["mardi", "jeudi"], halfDays: { mardi: "apres_midi" } }),
  user({ id: "u-nathalie", firstName: "Nathalie", lastName: "Roux", roleIds: ["role-secretaire"], poste: "secretariat", skills: ["accueil", "cotation"] }),
  user({ id: "u-julie", firstName: "Julie", lastName: "Dubois", roleIds: ["role-secretaire"], poste: "secretariat", status: "en_attente", createdAt: "2026-08-20T14:12:00", invitedAt: "2026-08-20T14:12:00", lastInviteSentAt: "2026-08-20T14:12:00", skills: ["accueil"] }),
  user({ id: "u-hugo", firstName: "Hugo", lastName: "Petit", roleIds: ["role-aide", "role-sterilisation"], poste: "assistant", status: "archive", archivedAt: "2026-06-30T18:00:00", archiveReason: "Fin de CDD", skills: ["sterilisation"], createdAt: "2025-09-01T09:00:00" }),
  user({ id: "u-michel", firstName: "Michel", lastName: "Fontaine", roleIds: ["role-praticien"], poste: "praticien", status: "archive", archivedAt: "2025-09-30T18:00:00", archiveReason: "Remplacement saisonnier terminé", defaultEnvironmentId: "env-fontaine", specialties: ["endodontie"], createdAt: "2025-06-02T09:00:00" }),
];

/**
 * Gestion RH (missions, rémunération, contrat, rappels, documents) : seulement sur quelques profils
 * pour montrer à la fois le rempli (gestionnaire, assistant salarié) et le vide (à compléter par le
 * gestionnaire). Dates écrites autour du 1er septembre 2026 (voir `demoClock`), recalées au chargement.
 */
const RH_INFO: Record<string, Partial<TeamUser>> = {
  "u-delphine": {
    missions: [
      "Plannings et organisation du cabinet",
      "Recrutement et suivi des dossiers du personnel",
      "Relation avec les praticiens associés",
      "Facturation et relances",
    ],
    salary: {
      statut: "cadre",
      brut: 3800,
      net: 2964,
      coutEntreprise: 5396,
      history: [
        { date: "2023-02-01", brut: 3400, net: 2652, coutEntreprise: 4828, motif: "Embauche" },
        { date: "2024-09-01", brut: 3600, net: 2808, coutEntreprise: 5112, motif: "Révision annuelle" },
        { date: "2025-09-01", brut: 3800, net: 2964, coutEntreprise: 5396, motif: "Révision annuelle" },
      ],
    },
    oneOnOne: { frequency: "mensuel", nextDate: "2026-09-08", history: [{ date: "2026-08-11" }, { date: "2026-07-07", note: "Point charge de travail rentrée" }] },
    medecineTravail: { nextDate: "2026-11-20", periodiciteMois: 24, history: [{ date: "2024-11-20" }] },
    contrat: { type: "cdi", tempsPartiel: false, dateEmbauche: "2023-02-01" },
    documents: [{ id: "doc-delphine-1", nom: "Contrat de travail", type: "contrat", dateAjout: "2023-02-01" }],
    entretienPro: { prochaineDate: "2027-02-01", history: [{ date: "2025-02-01" }, { date: "2023-02-01", note: "Entretien d'embauche" }] },
    congesPayes: { prisHorsAppli: 3 },
  },
  "u-sophie": {
    medecineTravail: { nextDate: "2026-09-10", periodiciteMois: 24, history: [{ date: "2024-09-10" }] },
    documents: [{ id: "doc-sophie-1", nom: "Diplôme d'État de docteur en chirurgie dentaire", type: "diplome", dateAjout: "2023-02-01" }],
    dpc: { heuresRequises: 30, heuresRealisees: 18, periodeFin: "2027-12-31" },
  },
  "u-thomas": {
    missions: ["Assistanat opératoire en implantologie et chirurgie orale", "Radioprotection", "Stérilisation du bloc"],
    salary: {
      statut: "non_cadre",
      brut: 2100,
      net: 1638,
      coutEntreprise: 2982,
      history: [
        { date: "2024-01-08", brut: 1900, net: 1482, coutEntreprise: 2698, motif: "Embauche" },
        { date: "2025-09-01", brut: 2100, net: 1638, coutEntreprise: 2982, motif: "Révision annuelle" },
      ],
    },
    oneOnOne: { frequency: "hebdo", nextDate: "2026-09-04", history: [{ date: "2026-08-28" }, { date: "2026-08-21" }] },
    medecineTravail: { nextDate: "2027-01-15", periodiciteMois: 24, history: [{ date: "2025-01-15" }] },
    contrat: { type: "cdi", tempsPartiel: false, dateEmbauche: "2024-01-08" },
    documents: [{ id: "doc-thomas-1", nom: "Certificat radioprotection", type: "habilitation", dateAjout: "2024-02-01" }],
    entretienPro: { prochaineDate: "2026-01-08", history: [{ date: "2024-01-08", note: "Entretien d'embauche" }] },
    congesPayes: { prisHorsAppli: 0 },
  },
};

/** « jsalt » : un entier déterministe dans [min, max] à partir d'une graine (même démo à chaque rechargement). */
function jrange(seed: string, min: number, max: number): number {
  const span = Math.max(1, max - min);
  return min + (Math.abs(jitter(seed, span)) % (span + 1));
}

/** Date ISO déterministe entre `minDays` et `maxDays` après l'ancre de la démo (voir `demoClock`). */
function jdate(seed: string, minDays: number, maxDays: number): string {
  return toISODate(addDays(new Date(2026, 8, 1), jrange(seed, minDays, maxDays)));
}

const DEFAULT_MISSIONS: Partial<Record<TeamUser["poste"], string[]>> = {
  assistant: ["Assistanat opératoire", "Stérilisation du matériel"],
  secretariat: ["Accueil et prise de rendez-vous", "Gestion du courrier et des appels"],
  gestion: ["Gestion administrative et comptable"],
};

/**
 * Jeu de données RH par défaut pour les profils actifs qui n'ont pas de fiche sur mesure dans `RH_INFO` :
 * missions selon le poste, rémunération et congés pour les salariés (pas pour les praticiens libéraux),
 * DPC pour les praticiens. Montants et dates varient légèrement par personne (déterministe, voir `jrange`/`jdate`).
 */
function defaultRH(u: TeamUser): Partial<TeamUser> {
  const liberal = u.roleIds.includes("role-praticien");
  const embauche = u.createdAt.slice(0, 10);
  // Praticien libéral : ni missions, ni 1:1, ni entretien professionnel, seulement la médecine du travail.
  const out: Partial<TeamUser> = {
    medecineTravail: { nextDate: jdate(`${u.id}-med`, 30, 300), periodiciteMois: 24 },
  };
  if (!liberal) {
    out.missions = DEFAULT_MISSIONS[u.poste];
    out.oneOnOne = { frequency: "mensuel", nextDate: jdate(`${u.id}-11`, 5, 40) };
    out.entretienPro = { prochaineDate: jdate(`${u.id}-entr`, 60, 400) };
    // Ratios alignés sur STATUT_RATIOS (src/components/team/profile/RHSections.tsx) : gestion = cadre, le reste non-cadre.
    const statut = u.poste === "gestion" ? "cadre" : "non_cadre";
    const [netRatio, coutRatio] = statut === "cadre" ? [0.75, 1.48] : [0.78, 1.42];
    const brutBase = u.poste === "gestion" ? 2900 : u.poste === "secretariat" ? 1950 : 2000;
    const brut = brutBase + jrange(`${u.id}-brut`, -150, 250);
    const net = Math.round(brut * netRatio);
    const coutEntreprise = Math.round(brut * coutRatio);
    out.salary = { statut, brut, net, coutEntreprise, history: [{ date: embauche, brut, net, coutEntreprise, motif: "Embauche" }] };
    out.contrat = { type: "cdi", tempsPartiel: u.workDays.length < 5, dateEmbauche: embauche };
    out.congesPayes = { prisHorsAppli: jrange(`${u.id}-pris`, 0, 3) };
  } else {
    out.dpc = { heuresRequises: 30, heuresRealisees: jrange(`${u.id}-dpc`, 5, 28), periodeFin: "2027-12-31" };
  }
  return out;
}

/** Semaines types des agendas Soins (celle de Dr Perche est l'agenda de la démo Soins). */
const slot = (id: string, day: Weekday, activityTypeId: string, start: string, end: string) => ({ id, day, activityTypeId, start, end });
export const SEMAINES_TYPES: Record<string, PraticienProfile["weekSlots"]> = {
  "env-martin": [
    slot("wm-1", "lundi", "bloc", "08:00", "12:00"),
    slot("wm-2", "lundi", "consultation", "14:00", "18:00"),
    slot("wm-3", "mardi", "bloc", "08:00", "12:30"),
    slot("wm-4", "mardi", "bloc", "14:00", "18:00"),
    slot("wm-5", "mercredi", "consultation", "08:00", "12:00"),
    slot("wm-6", "mercredi", "hors-bloc", "14:00", "18:00"),
    slot("wm-7", "jeudi", "bloc", "08:00", "12:00"),
    slot("wm-8", "jeudi", "bloc", "14:00", "17:00"),
    slot("wm-9", "vendredi", "consultation", "08:00", "12:00"),
    slot("wm-10", "vendredi", "urgences", "14:00", "17:00"),
  ],
  "env-perche": [
    slot("ws-1", "lundi", "consultation", "08:00", "12:00"),
    slot("ws-2", "lundi", "bloc", "14:00", "17:00"),
    slot("ws-3", "lundi", "tous-motifs", "17:00", "19:00"),
    slot("ws-4", "mardi", "urgences", "08:00", "13:00"),
    slot("ws-5", "mardi", "tous-motifs", "14:00", "18:00"),
    slot("ws-6", "jeudi", "tous-motifs", "08:00", "12:00"),
    slot("ws-7", "jeudi", "tous-motifs", "13:00", "18:00"),
    slot("ws-8", "vendredi", "hors-bloc", "08:00", "12:00"),
    slot("ws-9", "vendredi", "tous-motifs", "12:00", "18:00"),
  ],
  "env-dray": [
    slot("wd-1", "lundi", "consultation", "08:00", "12:00"),
    slot("wd-2", "lundi", "tous-motifs", "14:00", "18:00"),
    slot("wd-3", "mardi", "hors-bloc", "08:00", "12:00"),
    slot("wd-4", "mardi", "tous-motifs", "14:00", "18:00"),
    slot("wd-5", "jeudi", "urgences", "08:00", "12:00"),
    slot("wd-6", "jeudi", "tous-motifs", "14:00", "18:00"),
    slot("wd-7", "vendredi", "consultation", "08:00", "12:00"),
  ],
};
export const BESOINS_PAR_ACTIVITE: Record<string, Record<string, number>> = {
  "env-martin": { bloc: 2, consultation: 1, urgences: 1, "hors-bloc": 1, "tous-motifs": 1 },
  "env-perche": { bloc: 2, consultation: 1, urgences: 1, "hors-bloc": 1, "tous-motifs": 1 },
  "env-dray": { bloc: 1, consultation: 1, urgences: 1, "hors-bloc": 1, "tous-motifs": 1 },
};

export const PRATICIEN_PROFILES: PraticienProfile[] = [
  {
    id: "env-martin",
    praticienUserId: "u-sophie",
    label: "Dr Sophie Martin",
    rooms: ["Bloc 1", "Salle 2"],
    assistantsNeeded: 2,
    weekSlots: SEMAINES_TYPES["env-martin"],
    needsByActivity: BESOINS_PAR_ACTIVITE["env-martin"],
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
    weekSlots: SEMAINES_TYPES["env-perche"],
    needsByActivity: BESOINS_PAR_ACTIVITE["env-perche"],
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
    weekSlots: SEMAINES_TYPES["env-dray"],
    needsByActivity: BESOINS_PAR_ACTIVITE["env-dray"],
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
  // Historique : absences passées, pour que chaque profil ait de quoi montrer.
  { id: "abs-p1", userId: "u-lea", type: "conge", startDate: "2026-08-03", endDate: "2026-08-14", motif: "Vacances d'été", status: "validee", declaredAt: "2026-05-12T10:00:00", declaredById: "u-lea" },
  { id: "abs-p2", userId: "u-lea", type: "maladie", startDate: "2026-06-11", endDate: "2026-06-12", motif: "Arrêt maladie", status: "validee", declaredAt: "2026-06-11T07:30:00", declaredById: "u-lea" },
  { id: "abs-p3", userId: "u-ines", type: "conge", startDate: "2026-07-20", endDate: "2026-07-31", motif: "Vacances d'été", status: "validee", declaredAt: "2026-04-02T09:00:00", declaredById: "u-ines" },
  { id: "abs-p4", userId: "u-thomas", type: "conge", startDate: "2026-08-17", endDate: "2026-08-21", status: "validee", declaredAt: "2026-05-20T14:00:00", declaredById: "u-thomas" },
  { id: "abs-p5", userId: "u-camille", type: "maladie", startDate: "2026-06-22", endDate: "2026-06-22", motif: "Arrêt maladie", status: "validee", declaredAt: "2026-06-22T07:15:00", declaredById: "u-camille" },
  { id: "abs-p6", userId: "u-flore", type: "conge", startDate: "2026-08-10", endDate: "2026-08-21", motif: "Vacances", status: "validee", declaredAt: "2026-03-10T18:00:00", declaredById: "u-flore" },
  { id: "abs-p7", userId: "u-sophie", type: "formation", startDate: "2026-06-05", endDate: "2026-06-05", motif: "Congrès implantologie", status: "validee", declaredAt: "2026-04-18T12:00:00", declaredById: "u-sophie" },
  { id: "abs-p8", userId: "u-dray", type: "conge", startDate: "2026-07-27", endDate: "2026-08-07", motif: "Vacances", status: "validee", declaredAt: "2026-03-02T09:00:00", declaredById: "u-dray" },
  { id: "abs-p9", userId: "u-delphine", type: "conge", startDate: "2026-07-27", endDate: "2026-08-07", status: "validee", declaredAt: "2026-04-15T09:00:00", declaredById: "u-delphine" },
  { id: "abs-p10", userId: "u-manon", type: "maladie", startDate: "2026-07-06", endDate: "2026-07-07", motif: "Arrêt maladie", status: "validee", declaredAt: "2026-07-06T07:50:00", declaredById: "u-manon" },
  { id: "abs-p11", userId: "u-nathalie", type: "conge", startDate: "2026-07-13", endDate: "2026-07-24", status: "validee", declaredAt: "2026-04-28T11:00:00", declaredById: "u-nathalie" },
  { id: "abs-p12", userId: "u-karima", type: "conge", startDate: "2026-08-03", endDate: "2026-08-07", status: "validee", declaredAt: "2026-05-05T09:00:00", declaredById: "u-karima" },
  { id: "abs-p13", userId: "u-julie", type: "formation", startDate: "2026-08-26", endDate: "2026-08-26", motif: "Logiciel de prise de RDV", status: "validee", declaredAt: "2026-08-20T15:00:00", declaredById: "u-delphine" },
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
    href: "/team/planning?tab=remplacer&absence=abs-t1",
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
  const users = USERS.map((u) => ({
    ...shiftDeep(u, shift.week),
    weeklyHours: WEEKLY_HOURS[u.id],
    ...shiftDeep(RH_INFO[u.id] ?? (u.status === "actif" ? defaultRH(u) : {}), shift.week),
  }));
  return {
    users,
    absences,
    audit: AUDIT_LOG.map(move).map((e) => ({ ...e, summary: text(e.summary) })),
    notifications: NOTIFICATIONS.map(move).map((n) => ({ ...n, body: text(n.body) })),
    rdvs: buildRdvs(addDays(new Date(2026, 7, 31), shift.week), users),
    punches: buildPunches(today, users, absences),
  };
}

// --- Pointages de démo (V3) --------------------------------------------------

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
 * Pointages depuis le 1er du mois précédent : avant la semaine en cours, ils viennent des badges actuels (import), ensuite d'Oralys.
 * Quelques cas réels pour la démo : heures sup d'Inès, oubli de départ de Camille, pause trop courte de Nathalie.
 * Delphine (session par défaut) n'a pas encore pointé aujourd'hui : on peut essayer le bouton.
 */
function buildPunches(today: Date, users: TeamUser[], absences: TeamAbsence[]): Punch[] {
  const out: Punch[] = [];
  const todayIso = toISODate(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  // Depuis le 1er du mois précédent : de quoi voir un mois complet et le mois en cours.
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonday = addDays(monday, -7);
  const validated = absences.filter((a) => a.status === "validee");
  let seq = 0;
  for (let i = 0; i < 75; i++) {
    const date = addDays(start, i);
    const iso = toISODate(date);
    if (iso > todayIso) break;
    // Avant la semaine en cours : pointages importés des badges. Les cas de démo visent la semaine dernière.
    const imported = date < monday;
    const lastWeek = date >= prevMonday && date < monday;
    const thisWeek = date >= monday;
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
      if (u.id === "u-manon" && thisWeek && weekday === "lundi") depart += 70;
      if (u.id === "u-camille" && lastWeek && weekday === "mercredi") noDepart = true;
      if (u.id === "u-nathalie" && thisWeek && weekday === "mardi") shortBreak = 10;
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
          source: imported ? "badge" : "poste",
          workstation: imported ? undefined : STATION[u.id] ?? "Poste salle 1",
        });
      }
    }
  }
  return out;
}
