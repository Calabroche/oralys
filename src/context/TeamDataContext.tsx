"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AuditAction,
  AuditEntry,
  DayNeed,
  DayOverride,
  PermissionId,
  Punch,
  PunchKind,
  PraticienProfile,
  Role,
  SoinsRdv,
  TeamAbsence,
  TeamNotification,
  TeamUser,
} from "@/types/team";
import { PRATICIEN_PROFILES, ROLES, buildTeamSeed } from "@/data/teamMockData";
import { resetAllDemoData } from "@/lib/persist";
import { PUNCH_LABELS, timeOf } from "@/lib/time";
import { PRATICIEN_NAME } from "@/data/mockData";
import { useAgendaData } from "@/context/AgendaDataContext";
import {
  ABSENCE_TYPE_LABELS,
  EMAIL_PATTERN,
  displayName,
  fullName,
  absenceOn,
  isLastMinute,
  normalizeEmail,
  permissionsOf,
  roleNames,
  shortDate,
} from "@/lib/team";


// v5 : les données de démo sont recalées sur la date du jour (les anciennes, figées au 1er septembre, sont ignorées).
const STORAGE_KEY = "oralys-team-data-v5";

interface PersistedTeamData {
  users: TeamUser[];
  roles: Role[];
  profiles: PraticienProfile[];
  absences: TeamAbsence[];
  rdvs: SoinsRdv[];
  audit: AuditEntry[];
  notifications: TeamNotification[];
  sessionUserId: string;
  workstation: string | null;
  dayOverrides: DayOverride[];
  dayNeeds: DayNeed[];
  punches: Punch[];
}

function initialData(): PersistedTeamData {
  return {
    ...buildTeamSeed(new Date()),
    roles: ROLES,
    profiles: PRATICIEN_PROFILES,
    sessionUserId: "u-delphine",
    workstation: null,
    dayOverrides: [],
    dayNeeds: [],
  };
}

/** Lecture synchrone : le fournisseur n'est monté que côté client (voir AgendaDataProvider). */
function loadData(): PersistedTeamData {
  const seed = initialData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<PersistedTeamData>;
      // Démos enregistrées avant le pointage : on complète les contrats sans rien effacer.
      const users = stored.users?.map((u) => ({ ...u, weeklyHours: u.weeklyHours ?? seed.users.find((x) => x.id === u.id)?.weeklyHours }));
      return { ...seed, ...stored, ...(users ? { users } : {}) };
    }
  } catch {
    // Stockage indisponible ou corrompu : on repart des données de démo.
  }
  return seed;
}

export type NewUserInput = Pick<TeamUser, "firstName" | "lastName" | "email" | "roleIds" | "poste" | "defaultEnvironmentId">;
export type NewAbsenceInput = Pick<TeamAbsence, "userId" | "type" | "startDate" | "endDate" | "motif">;

type Result = { ok: true; id?: string } | { ok: false; error: string };

interface TeamDataContextValue extends PersistedTeamData {
  hydrated: boolean;
  sessionUser: TeamUser | undefined;
  can: (perm: PermissionId) => boolean;
  /** "Maintenant" dans la démo : date de référence partagée avec Soins, heure réelle. */
  now: () => Date;
  findUser: (id: string | null | undefined) => TeamUser | undefined;
  emailTaken: (email: string, exceptId?: string) => TeamUser | undefined;
  createUser: (input: NewUserInput) => Result;
  updateUser: (user: TeamUser) => Result;
  resendInvite: (id: string) => void;
  simulateActivation: (id: string) => void;
  archiveUser: (id: string, reason: string) => void;
  reactivateUser: (id: string) => void;
  deleteUser: (id: string) => void;
  setRolePermissions: (roleId: string, permissions: PermissionId[]) => void;
  createRole: (role: Omit<Role, "id" | "predefined">) => void;
  deleteRole: (roleId: string) => Result;
  upsertProfile: (profile: PraticienProfile) => Result;
  declareAbsence: (input: NewAbsenceInput) => TeamAbsence;
  validateAbsence: (id: string) => void;
  refuseAbsence: (id: string) => void;
  /** Retour arrière complet : supprime l'absence, ses alertes et la fermeture d'agenda Soins. Renvoie l'absence pour pouvoir la rétablir. */
  cancelAbsence: (id: string) => TeamAbsence | undefined;
  /** Retour anticipé : réintègre la personne sur un seul jour (l'absence est raccourcie ou coupée en deux). */
  removeAbsenceDay: (id: string, iso: string) => TeamAbsence[];
  /** Rétablit une absence ; `replaceIds` retire d'abord les morceaux issus d'une découpe. */
  restoreAbsence: (absence: TeamAbsence, replaceIds?: string[]) => void;
  assignRdv: (rdvId: string, assistantId: string) => void;
  addRdv: (rdv: Omit<SoinsRdv, "id">) => void;
  rescheduleRdv: (rdvId: string, slot: { date: string; start: string; end: string }, assistantId: string | null) => void;
  cancelRdv: (rdvId: string) => void;
  /** Prête un assistant à un praticien pour une journée (sans toucher aux rattachements). */
  lendAssistant: (date: string, assistantId: string, praticienId: string) => DayOverride;
  removeLoan: (id: string) => void;
  /** Ajuste le besoin en assistants d'un praticien pour une seule journée (sans toucher à sa fiche). */
  setDayNeed: (date: string, praticienId: string, need: number) => DayNeed;
  removeDayNeed: (id: string) => void;
  /** Pointage de la personne connectée (depuis son poste). */
  punch: (kind: PunchKind) => void;
  /** Correction par un gestionnaire : ajoute un pointage oublié. */
  addPunch: (userId: string, at: string, kind: PunchKind, note: string) => Punch;
  /** Supprime un pointage ; renvoie le pointage pour pouvoir le rétablir. */
  removePunch: (id: string) => Punch | undefined;
  restorePunch: (punch: Punch) => void;
  switchSession: (userId: string, workstation: string | null) => void;
  log: (action: AuditAction, summary: string, extra?: Partial<AuditEntry>) => void;
  markAllRead: () => void;
  resetDemo: () => void;
}

const TeamDataContext = createContext<TeamDataContextValue | null>(null);

let idCounter = 0;
function newId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function nowFor(): Date {
  return new Date();
}

function isoNow(): string {
  const d = nowFor();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function TeamDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PersistedTeamData>(loadData);
  const hydrated = true;
  const agenda = useAgendaData();
  // Dernier état connu : les « Annuler » des toasts s'exécutent après coup, avec des closures périmées.
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  }, [data]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // On continue sans persister.
    }
  }, [data]);

  const sessionUser = data.users.find((u) => u.id === data.sessionUserId);
  const perms = useMemo(() => permissionsOf(sessionUser, data.roles), [sessionUser, data.roles]);

  const findUser = useCallback((id: string | null | undefined) => data.users.find((u) => u.id === id), [data.users]);

  const auditEntry = useCallback(
    (d: PersistedTeamData, action: AuditAction, summary: string, extra?: Partial<AuditEntry>): AuditEntry => {
      const actor = d.users.find((u) => u.id === d.sessionUserId);
      return {
        id: newId("a"),
        at: isoNow(),
        actorId: d.sessionUserId,
        actorRoles: actor ? roleNames(actor, d.roles) : [],
        action,
        summary,
        workstation: d.workstation ?? undefined,
        ...extra,
      };
    },
    []
  );

  const mutate = useCallback(
    (fn: (d: PersistedTeamData) => PersistedTeamData, audit?: { action: AuditAction; summary: string; extra?: Partial<AuditEntry> }) => {
      setData((prev) => {
        const next = fn(prev);
        if (!audit) return next;
        return { ...next, audit: [auditEntry(prev, audit.action, audit.summary, audit.extra), ...next.audit] };
      });
    },
    [auditEntry]
  );

  const emailTaken = useCallback(
    (email: string, exceptId?: string) => {
      const n = normalizeEmail(email);
      return data.users.find((u) => u.id !== exceptId && normalizeEmail(u.email) === n);
    },
    [data.users]
  );

  /** Répercute une absence validée d'un praticien dans l'agenda Soins (fermeture des créneaux). */
  const syncToSoins = useCallback(
    (absence: TeamAbsence, users: TeamUser[]) => {
      const u = users.find((x) => x.id === absence.userId);
      if (!u || fullName(u) !== PRATICIEN_NAME) return;
      agenda.upsertAbsence({
        id: `team-${absence.id}`,
        motif: `${ABSENCE_TYPE_LABELS[absence.type]} (Oralys Team)`,
        color: absence.type === "maladie" ? "red" : absence.type === "formation" ? "indigo" : "orange",
        startDate: absence.startDate,
        startTime: "00:00",
        endDate: absence.endDate,
        endTime: "23:59",
        recurrence: { frequency: "none" },
      });
    },
    [agenda]
  );

  const value: TeamDataContextValue = {
    ...data,
    hydrated,
    sessionUser,
    can: (perm) => perms.has(perm),
    now: nowFor,
    findUser,
    emailTaken,

    createUser: (input) => {
      const email = normalizeEmail(input.email);
      if (!input.firstName.trim() || !input.lastName.trim()) return { ok: false, error: "Nom et prénom obligatoires." };
      if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Adresse email invalide." };
      const dup = emailTaken(email);
      if (dup) return { ok: false, error: `Cet identifiant est déjà utilisé par ${fullName(dup)}.` };
      if (input.roleIds.length === 0) return { ok: false, error: "Au moins un rôle est requis." };
      const id = newId("u");
      const at = isoNow();
      const user: TeamUser = {
        id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        roleIds: input.roleIds,
        poste: input.poste,
        status: "en_attente",
        createdAt: at,
        invitedAt: at,
        lastInviteSentAt: at,
        defaultEnvironmentId: input.defaultEnvironmentId,
        pin: "1234",
        workDays: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
        skills: [],
        preferredActs: [],
        prefersWith: [],
        avoidsWith: [],
        specialties: [],
      };
      // Un praticien obtient d'office son environnement Soins : jamais de profil orphelin.
      const isPraticien = input.roleIds.some((r) => data.roles.find((x) => x.id === r)?.healthProfessional);
      const profile: PraticienProfile | null = isPraticien
        ? { id: newId("env"), praticienUserId: id, label: `Dr ${fullName(user)}`, rooms: [], team: [], feedback: {} }
        : null;
      if (profile) user.defaultEnvironmentId = profile.id;
      mutate((d) => ({ ...d, users: [...d.users, user], profiles: profile ? [...d.profiles, profile] : d.profiles }), {
        action: "user.create",
        summary: `Création de ${fullName(user)} (${roleNames(user, data.roles).join(" + ")}), invitation envoyée à ${email}`,
        extra: { targetUserId: id },
      });
      return { ok: true, id };
    },

    updateUser: (user) => {
      const dup = emailTaken(user.email, user.id);
      if (dup) return { ok: false, error: `Cet identifiant est déjà utilisé par ${fullName(dup)}.` };
      if (user.roleIds.length === 0) return { ok: false, error: "Au moins un rôle est requis." };
      const before = data.users.find((u) => u.id === user.id);
      const rolesChanged = before && before.roleIds.slice().sort().join() !== user.roleIds.slice().sort().join();
      const summary = rolesChanged
        ? `${fullName(user)} : rôles ${roleNames(before!, data.roles).join(" + ") || "aucun"} → ${roleNames(user, data.roles).join(" + ")}`
        : `Modification du profil de ${fullName(user)}`;
      mutate((d) => ({ ...d, users: d.users.map((u) => (u.id === user.id ? { ...user, email: normalizeEmail(user.email) } : u)) }), {
        action: rolesChanged ? "role.assign" : "user.update",
        summary,
        extra: { targetUserId: user.id },
      });
      return { ok: true };
    },

    resendInvite: (id) => {
      const u = findUser(id);
      mutate((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, lastInviteSentAt: isoNow() } : x)) }), {
        action: "user.invite",
        summary: `Invitation renvoyée à ${u ? u.email : "?"}`,
        extra: { targetUserId: id },
      });
    },

    simulateActivation: (id) => {
      mutate((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: "actif" } : x)) }));
    },

    archiveUser: (id, reason) => {
      const u = findUser(id);
      const today = isoNow().slice(0, 10);
      mutate(
        (d) => ({
          ...d,
          users: d.users.map((x) => (x.id === id ? { ...x, status: "archive", archivedAt: isoNow(), archiveReason: reason } : x)),
          // N'apparaît plus dans les affectations futures…
          profiles: d.profiles.map((p) => ({ ...p, team: p.team.filter((l) => l.userId !== id) })),
          rdvs: d.rdvs.map((r) => (r.assistantUserId === id && r.date >= today ? { ...r, assistantUserId: null } : r)),
          // …mais l'historique (audit, RDV passés) est conservé tel quel.
        }),
        { action: "user.archive", summary: `Archivage de ${u ? fullName(u) : "?"} : ${reason}`, extra: { targetUserId: id } }
      );
    },

    reactivateUser: (id) => {
      const u = findUser(id);
      mutate(
        (d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: "actif", archivedAt: undefined, archiveReason: undefined } : x)) }),
        { action: "user.reactivate", summary: `Réactivation de ${u ? fullName(u) : "?"}`, extra: { targetUserId: id } }
      );
    },

    deleteUser: (id) => {
      const u = findUser(id);
      mutate(
        (d) => ({
          ...d,
          users: d.users.filter((x) => x.id !== id),
          profiles: d.profiles.map((p) => ({ ...p, team: p.team.filter((l) => l.userId !== id) })),
          rdvs: d.rdvs.map((r) => (r.assistantUserId === id ? { ...r, assistantUserId: null } : r)),
          absences: d.absences.filter((a) => a.userId !== id),
        }),
        { action: "user.delete", summary: `Suppression définitive de ${u ? fullName(u) : "?"} (données personnelles effacées)` }
      );
    },

    setRolePermissions: (roleId, permissions) => {
      const role = data.roles.find((r) => r.id === roleId);
      mutate((d) => ({ ...d, roles: d.roles.map((r) => (r.id === roleId ? { ...r, permissions } : r)) }), {
        action: "role.permissions",
        summary: `Droits du rôle ${role?.name ?? "?"} modifiés (${permissions.length} droits)`,
      });
    },

    createRole: (role) => {
      mutate((d) => ({ ...d, roles: [...d.roles, { ...role, id: newId("role"), predefined: false }] }), {
        action: "role.permissions",
        summary: `Création du rôle ${role.name}`,
      });
    },

    deleteRole: (roleId) => {
      const role = data.roles.find((r) => r.id === roleId);
      if (!role || role.predefined) return { ok: false, error: "Les rôles par défaut ne peuvent pas être supprimés." };
      const holders = data.users.filter((u) => u.roleIds.includes(roleId) && u.status !== "archive");
      if (holders.length) return { ok: false, error: `Rôle encore attribué à ${holders.map(fullName).join(", ")}.` };
      mutate((d) => ({ ...d, roles: d.roles.filter((r) => r.id !== roleId) }), {
        action: "role.permissions",
        summary: `Suppression du rôle ${role.name}`,
      });
      return { ok: true };
    },

    upsertProfile: (profile) => {
      const owner = data.users.find((u) => u.id === profile.praticienUserId);
      if (!owner || owner.status === "archive") {
        return { ok: false, error: "Un profil praticien doit avoir au moins un utilisateur actif rattaché." };
      }
      mutate((d) => ({
        ...d,
        profiles: d.profiles.some((p) => p.id === profile.id)
          ? d.profiles.map((p) => (p.id === profile.id ? profile : p))
          : [...d.profiles, profile],
      }));
      return { ok: true };
    },

    declareAbsence: (input) => {
      const declarer = sessionUser;
      const target = findUser(input.userId);
      // La maladie est de fait, un gestionnaire valide directement : le reste passe en demande.
      const autoValidate = input.type === "maladie" || perms.has("team.planning");
      const absence: TeamAbsence = {
        id: newId("abs"),
        ...input,
        status: autoValidate ? "validee" : "demandee",
        declaredAt: isoNow(),
        declaredById: declarer?.id ?? input.userId,
      };
      const lastMinute = isLastMinute(absence);
      const label = target ? displayName(target) : "?";
      const notifs: TeamNotification[] = [];
      if (lastMinute) {
        notifs.push({
          id: newId("n"),
          at: isoNow(),
          kind: "absence_last_minute",
          title: `Absence de dernier moment : ${label}`,
          body: `${ABSENCE_TYPE_LABELS[input.type]} du ${shortDate(input.startDate)} au ${shortDate(input.endDate)}. Alerte envoyée au planning Soins.`,
          href: `/team/remplacements?absence=${absence.id}`,
          read: false,
        });
      } else if (!autoValidate) {
        notifs.push({
          id: newId("n"),
          at: isoNow(),
          kind: "conge_request",
          title: `Demande de ${ABSENCE_TYPE_LABELS[input.type].toLowerCase()} : ${label}`,
          body: `Du ${shortDate(input.startDate)} au ${shortDate(input.endDate)}.`,
          href: "/team/planning?tab=demandes",
          read: false,
        });
      }
      const affected = data.rdvs.filter(
        (r) =>
          r.date >= input.startDate &&
          r.date <= input.endDate &&
          (r.assistantUserId === input.userId || r.praticienUserId === input.userId)
      );
      if (affected.length && autoValidate) {
        notifs.push({
          id: newId("n"),
          at: isoNow(),
          kind: "rdv_risk",
          title: `${affected.length} RDV à risque dans Soins`,
          body: `Suite à l'absence de ${label}. Le gestionnaire du planning a été notifié avant ouverture de l'agenda.`,
          href: `/team/remplacements?absence=${absence.id}`,
          read: false,
        });
      }
      mutate((d) => ({ ...d, absences: [...d.absences, absence], notifications: [...notifs, ...d.notifications] }), {
        action: "absence.declare",
        summary: `${ABSENCE_TYPE_LABELS[input.type]} déclaré(e) pour ${target ? fullName(target) : "?"} du ${shortDate(input.startDate)} au ${shortDate(input.endDate)}${lastMinute ? " (dernier moment)" : ""}`,
        extra: { targetUserId: input.userId },
      });
      if (absence.status === "validee") syncToSoins(absence, data.users);
      return absence;
    },

    validateAbsence: (id) => {
      const abs = data.absences.find((a) => a.id === id);
      if (!abs) return;
      const u = findUser(abs.userId);
      mutate((d) => ({ ...d, absences: d.absences.map((a) => (a.id === id ? { ...a, status: "validee" } : a)) }), {
        action: "absence.validate",
        summary: `${ABSENCE_TYPE_LABELS[abs.type]} de ${u ? fullName(u) : "?"} validé(e) (${shortDate(abs.startDate)} → ${shortDate(abs.endDate)})`,
        extra: { targetUserId: abs.userId },
      });
      syncToSoins({ ...abs, status: "validee" }, data.users);
    },

    refuseAbsence: (id) => {
      const abs = data.absences.find((a) => a.id === id);
      if (!abs) return;
      const u = findUser(abs.userId);
      mutate((d) => ({ ...d, absences: d.absences.map((a) => (a.id === id ? { ...a, status: "refusee" } : a)) }), {
        action: "absence.refuse",
        summary: `Demande de ${ABSENCE_TYPE_LABELS[abs.type].toLowerCase()} de ${u ? fullName(u) : "?"} refusée`,
        extra: { targetUserId: abs.userId },
      });
    },

    cancelAbsence: (id) => {
      const abs = latest.current.absences.find((a) => a.id === id);
      if (!abs) return undefined;
      const u = latest.current.users.find((x) => x.id === abs.userId);
      mutate(
        (d) => ({
          ...d,
          absences: d.absences.filter((a) => a.id !== id),
          // Les alertes nées de cette absence n'ont plus lieu d'être.
          notifications: d.notifications.filter((n) => !n.href?.includes(id)),
        }),
        {
          action: "absence.cancel",
          summary: `Absence de ${u ? fullName(u) : "?"} annulée (${shortDate(abs.startDate)} → ${shortDate(abs.endDate)}) : de retour au planning`,
          extra: { targetUserId: abs.userId },
        }
      );
      agenda.deleteAbsence(`team-${id}`);
      return abs;
    },

    removeAbsenceDay: (id, iso) => {
      const abs = latest.current.absences.find((a) => a.id === id);
      if (!abs) return [];
      const u = latest.current.users.find((x) => x.id === abs.userId);
      const shift = (d: string, n: number) => {
        const x = new Date(`${d}T12:00:00`);
        x.setDate(x.getDate() + n);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      };
      let pieces: TeamAbsence[];
      if (abs.startDate === abs.endDate) pieces = [];
      else if (iso === abs.startDate) pieces = [{ ...abs, startDate: shift(iso, 1) }];
      else if (iso === abs.endDate) pieces = [{ ...abs, endDate: shift(iso, -1) }];
      else pieces = [{ ...abs, endDate: shift(iso, -1) }, { ...abs, id: newId("abs"), startDate: shift(iso, 1) }];
      mutate((d) => ({ ...d, absences: [...d.absences.filter((a) => a.id !== id), ...pieces] }), {
        action: "absence.cancel",
        summary: `${u ? fullName(u) : "?"} réintégré(e) le ${shortDate(iso)} (retour anticipé)`,
        extra: { targetUserId: abs.userId },
      });
      agenda.deleteAbsence(`team-${id}`);
      pieces.filter((p) => p.status === "validee").forEach((p) => syncToSoins(p, data.users));
      return pieces;
    },

    restoreAbsence: (absence, replaceIds = []) => {
      const u = latest.current.users.find((x) => x.id === absence.userId);
      replaceIds.forEach((pid) => agenda.deleteAbsence(`team-${pid}`));
      mutate((d) => ({ ...d, absences: [...d.absences.filter((a) => a.id !== absence.id && !replaceIds.includes(a.id)), absence] }), {
        action: "absence.restore",
        summary: `Absence de ${u ? fullName(u) : "?"} rétablie (${shortDate(absence.startDate)} → ${shortDate(absence.endDate)})`,
        extra: { targetUserId: absence.userId },
      });
      if (absence.status === "validee") syncToSoins(absence, data.users);
    },

    assignRdv: (rdvId, assistantId) => {
      const rdv = data.rdvs.find((r) => r.id === rdvId);
      const a = findUser(assistantId);
      mutate((d) => ({ ...d, rdvs: d.rdvs.map((r) => (r.id === rdvId ? { ...r, assistantUserId: assistantId } : r)) }), {
        action: "rdv.assign",
        summary: `${a ? fullName(a) : "?"} affecté(e) au RDV du ${rdv ? `${shortDate(rdv.date)} ${rdv.start}` : "?"} (${rdv?.patient ?? ""})`,
        extra: { targetUserId: assistantId },
      });
    },

    rescheduleRdv: (rdvId, slot, assistantId) => {
      const rdv = data.rdvs.find((r) => r.id === rdvId);
      const a = findUser(assistantId);
      mutate((d) => ({ ...d, rdvs: d.rdvs.map((r) => (r.id === rdvId ? { ...r, ...slot, assistantUserId: assistantId } : r)) }), {
        action: "rdv.reschedule",
        summary: `RDV de ${rdv?.patient ?? "?"} déplacé du ${rdv ? `${shortDate(rdv.date)} ${rdv.start}` : "?"} au ${shortDate(slot.date)} ${slot.start}${a ? ` avec ${fullName(a)}` : ""}`,
        extra: a ? { targetUserId: a.id } : undefined,
      });
    },

    lendAssistant: (date, assistantId, praticienId) => {
      const cur = latest.current;
      // Les RDV du praticien ce jour-là sans assistant disponible passent à l'assistant prêté (s'il est libre sur le créneau).
      const reassigned = cur.rdvs
        .filter(
          (r) =>
            r.date === date &&
            r.praticienUserId === praticienId &&
            (!r.assistantUserId || absenceOn(r.assistantUserId, date, cur.absences)) &&
            !cur.rdvs.some((x) => x.id !== r.id && x.date === date && x.start === r.start && x.assistantUserId === assistantId)
        )
        .map((r) => ({ rdvId: r.id, prev: r.assistantUserId }));
      const o: DayOverride = { id: newId("pret"), date, assistantId, praticienId, reassigned };
      const a = latest.current.users.find((u) => u.id === assistantId);
      const p = latest.current.users.find((u) => u.id === praticienId);
      mutate(
        (d) => ({
          ...d,
          dayOverrides: [...d.dayOverrides.filter((x) => !(x.date === date && x.assistantId === assistantId)), o],
          rdvs: d.rdvs.map((r) => (reassigned.some((x) => x.rdvId === r.id) ? { ...r, assistantUserId: assistantId } : r)),
        }),
        {
        action: "binome.pret",
        summary: `${a ? fullName(a) : "?"} prêté(e) à ${p ? displayName(p) : "?"} pour le ${shortDate(date)}${reassigned.length ? ` (${reassigned.length} RDV réaffectés)` : ""}`,
        extra: { targetUserId: assistantId },
      });
      return o;
    },

    removeLoan: (id) => {
      const o = latest.current.dayOverrides.find((x) => x.id === id);
      const a = latest.current.users.find((u) => u.id === o?.assistantId);
      mutate(
        (d) => ({
          ...d,
          dayOverrides: d.dayOverrides.filter((x) => x.id !== id),
          // On remet les RDV comme avant le prêt.
          rdvs: d.rdvs.map((r) => {
            const back = o?.reassigned?.find((x) => x.rdvId === r.id);
            return back && r.assistantUserId === o?.assistantId ? { ...r, assistantUserId: back.prev } : r;
          }),
        }),
        {
        action: "binome.pret",
        summary: `Prêt de ${a ? fullName(a) : "?"} annulé${o ? ` (${shortDate(o.date)})` : ""}`,
        extra: a ? { targetUserId: a.id } : undefined,
      });
    },

    setDayNeed: (date, praticienId, need) => {
      const n: DayNeed = { id: newId("besoin"), date, praticienId, need };
      const p = latest.current.users.find((u) => u.id === praticienId);
      mutate((d) => ({ ...d, dayNeeds: [...d.dayNeeds.filter((x) => !(x.date === date && x.praticienId === praticienId)), n] }), {
        action: "binome.besoin",
        summary: `${p ? displayName(p) : "?"} travaillera avec ${need} assistant${need > 1 ? "s" : ""} le ${shortDate(date)} (besoin ajusté pour la journée)`,
        extra: { targetUserId: praticienId },
      });
      return n;
    },

    punch: (kind) => {
      const cur = latest.current;
      const u = cur.users.find((x) => x.id === cur.sessionUserId);
      const p: Punch = { id: newId("pt"), userId: cur.sessionUserId, at: isoNow(), kind, source: "poste", workstation: cur.workstation ?? undefined };
      mutate((d) => ({ ...d, punches: [...d.punches, p] }), {
        action: "pointage.punch",
        summary: `${PUNCH_LABELS[kind]} de ${u ? fullName(u) : "?"} à ${timeOf(p.at)}${cur.workstation ? ` (${cur.workstation})` : ""}`,
        extra: { targetUserId: cur.sessionUserId },
      });
    },

    addPunch: (userId, at, kind, note) => {
      const cur = latest.current;
      const u = cur.users.find((x) => x.id === userId);
      const p: Punch = { id: newId("pt"), userId, at, kind, source: "correction", correctedById: cur.sessionUserId, note };
      mutate((d) => ({ ...d, punches: [...d.punches, p] }), {
        action: "pointage.correction",
        summary: `${PUNCH_LABELS[kind]} ajouté(e) pour ${u ? fullName(u) : "?"} le ${shortDate(at.slice(0, 10))} à ${timeOf(at)} : ${note || "sans motif"}`,
        extra: { targetUserId: userId },
      });
      return p;
    },

    removePunch: (id) => {
      const cur = latest.current;
      const p = cur.punches.find((x) => x.id === id);
      if (!p) return undefined;
      const u = cur.users.find((x) => x.id === p.userId);
      mutate((d) => ({ ...d, punches: d.punches.filter((x) => x.id !== id) }), {
        action: "pointage.correction",
        summary: `${PUNCH_LABELS[p.kind]} de ${u ? fullName(u) : "?"} du ${shortDate(p.at.slice(0, 10))} à ${timeOf(p.at)} supprimé(e)`,
        extra: { targetUserId: p.userId },
      });
      return p;
    },

    restorePunch: (p) => {
      mutate((d) => ({ ...d, punches: [...d.punches.filter((x) => x.id !== p.id), p] }));
    },

    removeDayNeed: (id) => {
      const n = latest.current.dayNeeds.find((x) => x.id === id);
      const p = latest.current.users.find((u) => u.id === n?.praticienId);
      mutate((d) => ({ ...d, dayNeeds: d.dayNeeds.filter((x) => x.id !== id) }), {
        action: "binome.besoin",
        summary: `Besoin habituel rétabli pour ${p ? displayName(p) : "?"}${n ? ` le ${shortDate(n.date)}` : ""}`,
        extra: p ? { targetUserId: p.id } : undefined,
      });
    },

    cancelRdv: (rdvId) => {
      const rdv = data.rdvs.find((r) => r.id === rdvId);
      mutate((d) => ({ ...d, rdvs: d.rdvs.filter((r) => r.id !== rdvId) }), {
        action: "rdv.cancel",
        summary: `RDV du ${rdv ? `${shortDate(rdv.date)} ${rdv.start}` : "?"} annulé (${rdv?.patient ?? ""}), patient à prévenir`,
      });
    },

    addRdv: (rdv) => {
      const a = findUser(rdv.assistantUserId);
      mutate((d) => ({ ...d, rdvs: [...d.rdvs, { ...rdv, id: newId("rdv") }] }), {
        action: "rdv.assign",
        summary: `RDV posé dans Soins le ${shortDate(rdv.date)} à ${rdv.start} (${rdv.patient})${a ? ` avec ${fullName(a)} au fauteuil` : ""}`,
        extra: a ? { targetUserId: a.id } : undefined,
      });
    },

    switchSession: (userId, workstation) => {
      const u = findUser(userId);
      setData((prev) => {
        const next = { ...prev, sessionUserId: userId, workstation };
        const entry: AuditEntry = {
          id: newId("a"),
          at: isoNow(),
          actorId: userId,
          actorRoles: u ? roleNames(u, prev.roles) : [],
          action: "session.switch",
          summary: `Bascule de session sur ${workstation ?? "ce poste"} (PIN)`,
          workstation: workstation ?? undefined,
        };
        return { ...next, audit: [entry, ...prev.audit] };
      });
    },

    log: (action, summary, extra) => mutate((d) => d, { action, summary, extra }),
    markAllRead: () => mutate((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) })),
    resetDemo: resetAllDemoData,
  };

  return <TeamDataContext.Provider value={value}>{children}</TeamDataContext.Provider>;
}

export function useTeam(): TeamDataContextValue {
  const ctx = useContext(TeamDataContext);
  if (!ctx) throw new Error("useTeam must be used within TeamDataProvider");
  return ctx;
}
