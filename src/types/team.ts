import { Weekday } from "@/types";

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
  skills: SkillId[];
  preferredActs: ActeCategory[];
  /** Préférences relationnelles déclarées (ids d'utilisateurs). */
  prefersWith: string[];
  avoidsWith: string[];
  /** Spécialités (praticiens uniquement). */
  specialties: ActeCategory[];
  /** Heures hebdomadaires du contrat (salariés). Absent = pas de contrat horaire (ex. praticien libéral) : il pointe quand même. */
  weeklyHours?: number;
}

// --- Pointage (V4) -----------------------------------------------------------

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
  /** Nombre d'assistants nécessaires par jour travaillé (ex. 2 pour un praticien qui opère au bloc). */
  assistantsNeeded?: number;
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
  | "sterilisation.cycle"
  | "paiement.note"
  | "session.switch"
  | "rdv.assign"
  | "rdv.reschedule"
  | "rdv.cancel"
  | "binome.pret"
  | "binome.besoin"
  | "pointage.punch"
  | "pointage.correction";

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
