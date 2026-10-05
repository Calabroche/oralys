import { WeekSlot, Weekday } from "@/types";

/** Oralys Team : types du domaine équipe, rôles, droits, planning. */

export type UserStatus = "actif" | "en_attente" | "archive";

/** Poste principal, utilisé pour filtrer le planning (chirurgien, assistant, secrétariat…). */
export type Poste = "praticien" | "assistant" | "secretariat" | "gestion";

export type PermissionCategory = "clinique" | "patients" | "finances" | "parametres" | "team";

/** Les 12 permissions existantes dans Oralys, plus les droits proposés par Team (préfixe "team."). */
export type PermissionId =
  | "clinique.decision"
  | "clinique.assistance"
  | "sterilisation"
  | "adressage"
  | "rdv"
  | "facturation"
  | "teletransmission"
  | "compta"
  | "finances.individuels"
  | "finances.cabinet"
  | "param.cabinet"
  | "param.praticien"
  | "team.planning"
  | "team.audit";

export interface Permission {
  id: PermissionId;
  label: string;
  description: string;
  category: PermissionCategory;
  /** Acte réservé aux professionnels de santé : ne peut être donné qu'à un rôle "professionnel de santé". */
  reservedToHealthPro?: boolean;
  /** Droit proposé par Oralys Team, absent de Soins aujourd'hui. */
  isNew?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  /** Rôle fourni par défaut à l'onboarding (modifiable, mais pas supprimable). */
  predefined: boolean;
  /** Rôle de professionnel de santé : seul type de rôle pouvant porter les actes réservés. */
  healthProfessional: boolean;
  /** Rôle transverse (ex : responsable stérilisation), cumulable avec un rôle principal. */
  transverse?: boolean;
  permissions: PermissionId[];
}

export type SkillId = "radioprotection" | "aide_operatoire" | "sterilisation" | "accueil" | "cotation";

export type ActeCategory =
  | "implantologie"
  | "chirurgie_orale"
  | "parodontie"
  | "endodontie"
  | "examen_3d"
  | "pedodontie"
  | "prothese"
  | "soins";

/** Plage horaire de travail, ex. 08:30 → 12:30. */
export interface TimeRange {
  start: string;
  end: string;
}

/** Horaires habituels de la semaine : les plages de chaque jour travaillé. */
export type WeekHours = Partial<Record<Weekday, TimeRange[]>>;

/** Demi-journée de travail : un jour peut n'être travaillé que le matin ou l'après-midi. */
export type HalfDay = "matin" | "apres_midi";

export interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  /** Email pro = identifiant de connexion, unique dans le cabinet. */
  email: string;
  roleIds: string[];
  poste: Poste;
  status: UserStatus;
  createdAt: string;
  invitedAt?: string;
  lastInviteSentAt?: string;
  archivedAt?: string;
  archiveReason?: string;
  /** Environnement Soins ouvert par défaut (profil praticien). */
  defaultEnvironmentId: string | null;
  /** PIN court pour la bascule rapide sur un poste partagé (démo). */
  pin: string;
  workDays: Weekday[];
  /** Jours travaillés seulement en demi-journée (les autres jours de workDays sont des journées entières). */
  halfDays?: Partial<Record<Weekday, HalfDay>>;
  /** Horaires habituels (plages par jour). Quand ils existent, les jours et demi-journées en sont déduits. */
  schedule?: WeekHours;
  skills: SkillId[];
  preferredActs: ActeCategory[];
  /** Préférences relationnelles déclarées (ids d'utilisateurs). */
  prefersWith: string[];
  avoidsWith: string[];
  /** Spécialités (praticiens uniquement). */
  specialties: ActeCategory[];
  /** Heures hebdomadaires du contrat (salariés). Absent = ne pointe pas (ex. praticien libéral). */
  weeklyHours?: number;
  /** Praticien : numéro RPPS (11 chiffres), obligatoire à la création. */
  rpps?: string;
  /** Praticien : numéro Assurance Maladie (9 chiffres), obligatoire à la création. */
  numeroAM?: string;

  // --- Gestion RH : missions, rémunération, contrat, rappels, documents -----
  /** Missions liées au poste : liste de points, réglée par le gestionnaire. */
  missions?: string[];
  /** Rémunération : visible seulement par la personne et par gestionnaire/comptable. */
  salary?: SalaryInfo;
  /** Prochain entretien individuel (1:1) avec le gestionnaire. */
  oneOnOne?: OneOnOne;
  /** Suivi médecine du travail. */
  medecineTravail?: MedecineTravail;
  /** Contrat de travail. */
  contrat?: Contrat;
  /** Documents RH : métadonnées seulement (pas de fichier réel dans cette démo). */
  documents?: RHDocument[];
  /** Entretien professionnel, obligatoire tous les 2 ans. */
  entretienPro?: EntretienPro;
  /** Solde de congés payés. */
  congesPayes?: CongesPayes;
  /** DPC (développement professionnel continu), praticiens uniquement. */
  dpc?: Dpc;
}

/** Une ligne d'historique de rémunération (date de prise d'effet). */
export interface SalaryPoint {
  date: string;
  brut: number;
  net: number;
  /** Coût total pour le cabinet : brut + charges patronales. Réservé gestionnaire/comptable. */
  coutEntreprise: number;
  motif?: string;
}

/** Statut qui détermine les ratios par défaut brut → net / coût entreprise. */
export type SalaryStatut = "non_cadre" | "cadre" | "fonction_publique" | "liberal" | "portage";

export interface SalaryInfo {
  statut: SalaryStatut;
  brut: number;
  net: number;
  coutEntreprise: number;
  history: SalaryPoint[];
}

export type OneOnOneFrequency = "hebdo" | "mensuel" | "annuel";

/** Un 1:1, une visite ou un entretien déjà passé : saisi par le gestionnaire, jamais modifié ensuite. */
export interface RappelHistoryEntry {
  date: string;
  note?: string;
}

export interface OneOnOne {
  frequency: OneOnOneFrequency;
  nextDate: string;
  /** Historique des 1:1 déjà tenus. */
  history?: RappelHistoryEntry[];
}

export interface MedecineTravail {
  nextDate: string;
  periodiciteMois: number;
  /** Historique des visites déjà passées. */
  history?: RappelHistoryEntry[];
}

export type ContratType = "cdi" | "cdd";

export interface Contrat {
  type: ContratType;
  tempsPartiel: boolean;
  dateEmbauche: string;
  finPeriodeEssai?: string;
  /** Uniquement pour un CDD. */
  dateFinCdd?: string;
}

export type RHDocumentType = "contrat" | "avenant" | "diplome" | "habilitation" | "autre";

export interface RHDocument {
  id: string;
  nom: string;
  type: RHDocumentType;
  dateAjout: string;
  /** Pièce jointe (même logique que les justificatifs d'absence) : absente si pas de fichier joint. */
  mime?: string;
  size?: number;
  dataUrl?: string;
  /** Qui l'a ajouté : la personne elle-même ou le gestionnaire. Seul l'auteur (ou le gestionnaire) peut le retirer. */
  addedById?: string;
}

export interface EntretienPro {
  prochaineDate: string;
  /** Historique des entretiens déjà tenus. */
  history?: RappelHistoryEntry[];
}

/**
 * Congés payés : 25 jours par an pour tout le monde (voir `CP_PAR_AN`), pris et solde calculés depuis
 * les absences « congé » déclarées dans Team. Seul l'éventuel rattrapage se saisit à la main.
 */
export interface CongesPayes {
  /** Jours pris sur la période hors de l'application (ex. avant sa mise en place), saisis par le gestionnaire. */
  prisHorsAppli: number;
}

export interface Dpc {
  heuresRequises: number;
  heuresRealisees: number;
  /** Fin de la période triennale en cours. */
  periodeFin: string;
}

// --- Pointage (V3) -----------------------------------------------------------

export type PunchKind = "arrivee" | "pause" | "reprise" | "depart";

/** Un pointage : un événement horodaté de la journée d'un salarié. */
export interface Punch {
  id: string;
  userId: string;
  /** Date et heure locales, ex. "2026-09-25T08:02:00". */
  at: string;
  kind: PunchKind;
  /** poste : pointé dans Oralys ; badge : importé des bipeurs actuels ; correction : ajouté par un gestionnaire. */
  source: "poste" | "badge" | "correction";
  workstation?: string;
  /** Pointage confirmé par le code PIN de la personne (pas de pointage à la place d'un autre). */
  pinVerified?: boolean;
  /** Pour une correction : qui l'a faite et pourquoi. */
  correctedById?: string;
  note?: string;
}

export type Priority = "titulaire" | "backup";

export interface TeamLink {
  userId: string;
  priority: Priority;
  /** Rang dans la priorité (1 = premier appelé). */
  rank: number;
  /** Jours où ce rattachement s'applique (vide = tous les jours travaillés). */
  days: Weekday[];
}

/** Profil praticien = environnement Soins (agenda, patients). */
export interface PraticienProfile {
  id: string;
  /** Utilisateur praticien titulaire du profil. */
  praticienUserId: string;
  label: string;
  rooms: string[];
  /** Besoin par défaut (profils sans semaine type, ou activité sans réglage). */
  assistantsNeeded?: number;
  /** Semaine type de l'agenda Soins du praticien : ses jours, demi-journées et types d'activité. */
  weekSlots?: WeekSlot[];
  /** Nombre d'assistants nécessaires par type d'activité (ex. bloc : 2, consultation : 1). */
  needsByActivity?: Record<string, number>;
  team: TeamLink[];
  /** Retours qualitatifs saisis par le cabinet, par assistant (1 à 5). */
  feedback: Record<string, number>;
}

/** Prêt ponctuel : un assistant travaille avec un autre praticien pour une journée, sans changer les rattachements. */
/** Besoin en assistants ajusté pour un praticien sur une seule journée (ex. « un seul assistant suffira vendredi »). */
export interface DayNeed {
  id: string;
  date: string;
  praticienId: string;
  need: number;
}

export interface DayOverride {
  id: string;
  date: string;
  assistantId: string;
  praticienId: string;
  /** RDV du jour réaffectés à l'assistant prêté (pour pouvoir revenir en arrière). */
  reassigned?: { rdvId: string; prev: string | null }[];
}

export type AbsenceType = "conge" | "maladie" | "formation" | "autre";
export type AbsenceStatus = "demandee" | "validee" | "refusee";

export interface TeamAbsence {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string; // ISO date
  endDate: string; // ISO date inclus
  motif?: string;
  status: AbsenceStatus;
  declaredAt: string; // ISO datetime
  declaredById: string;
  /** Justificatifs joints (certificat d'arrêt maladie, justificatif médical…), visibles par la personne et le gestionnaire. */
  documents?: AbsenceDocument[];
  /** « soins » : période d'absence posée dans l'agenda Soins du praticien, lue par Team (non modifiable ici). */
  source?: "soins";
  /** Période Soins d'origine et sa répétition (ex. « Toutes les semaines »), pour les fermetures récurrentes. */
  soinsPeriodId?: string;
  recurrence?: string;
}

/** Pièce jointe d'une absence. Dans la démo, le fichier est gardé dans le navigateur s'il est assez léger. */
export interface AbsenceDocument {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedById: string;
  /** Contenu du fichier (data URL). Absent si le fichier dépasse la limite de la démo : seul le nom est gardé. */
  dataUrl?: string;
}

/** RDV tel que remonté par Soins (vue simplifiée pour le prototype). */
export interface SoinsRdv {
  id: string;
  date: string;
  start: string;
  end: string;
  praticienUserId: string;
  assistantUserId: string | null;
  patient: string;
  acte: ActeCategory;
  room: string;
  /** Décision prise : le praticien assure ce RDV sans assistant (il ne compte plus comme « à réaffecter »). */
  keptWithoutAssistant?: boolean;
}

export type AuditAction =
  | "user.create"
  | "user.invite"
  | "user.update"
  | "user.archive"
  | "user.reactivate"
  | "user.delete"
  | "role.assign"
  | "role.permissions"
  | "absence.declare"
  | "absence.validate"
  | "absence.refuse"
  | "absence.cancel"
  | "absence.restore"
  | "absence.justificatif"
  | "sterilisation.cycle"
  | "paiement.note"
  | "session.switch"
  | "rdv.assign"
  | "rdv.reschedule"
  | "rdv.cancel"
  | "binome.pret"
  | "binome.besoin"
  | "pointage.punch"
  | "pointage.correction"
  | "pointage.export";

export interface AuditEntry {
  id: string;
  at: string; // ISO datetime
  actorId: string;
  /** Rôles de l'acteur au moment de l'action (figés, pour la traçabilité). */
  actorRoles: string[];
  action: AuditAction;
  summary: string;
  targetUserId?: string;
  /** Poste de travail partagé depuis lequel l'action a été faite. */
  workstation?: string;
}

export type NotificationKind = "absence_last_minute" | "rdv_risk" | "tension" | "conge_request" | "info";

export interface TeamNotification {
  id: string;
  at: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  read: boolean;
}
