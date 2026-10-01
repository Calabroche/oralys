"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { AbsencePeriod, ActivityType, Appointment, SpecialSlot, WeekSlot } from "@/types";
import { teamAbsencePeriods } from "@/lib/soinsSync";
import {
  ASSISTANT_NEEDS,
  DEFAULT_SOINS_PRATICIEN,
  OTHER_WEEK_SLOTS,
  ROOMS,
  activityTypes as initialActivityTypes,
  buildAgendaSeed,
  weekSlots as initialWeekSlots,
} from "@/data/mockData";

/** Propriétaire d'un créneau de semaine type (les anciens créneaux sans praticien sont ceux de Dr Perche). */
export const slotOwner = (s: { praticienId?: string }) => s.praticienId ?? DEFAULT_SOINS_PRATICIEN;
/** Les données sans praticien sont celles de Dr Perche : on n'écrit l'identifiant que pour les autres agendas. */
const ownerTag = (id: string) => (id === DEFAULT_SOINS_PRATICIEN ? undefined : id);
const TEAM_STORAGE_KEY = "oralys-team-data-v5";

// Incrémenter ce numéro de version à chaque changement de schéma qui
// casserait la compatibilité avec des données déjà persistées (ex. ajout
// d'un champ requis) : les anciennes données sont alors ignorées plutôt
// que de faire planter le rendu, et les données de démo repartent à jour.
// v3 : données de démo recalées sur la date du jour.
// v4 : créneaux de semaine type avec salle (`room`), dont deux créneaux de démo réellement en
// parallèle chez Dr Martin (Bloc 1 + Salle 2) pour montrer le multi-salles.
// v5 : rendez-vous de démo avec salle, dont deux vrais RDV en parallèle chez Dr Martin aujourd'hui.
const STORAGE_KEY = "oralys-agenda-data-v5";
const PRATICIEN_KEY = "oralys-agenda-praticien";

/** Assistants nécessaires : praticien → type d'activité → nombre. */
type AssistantNeeds = Record<string, Record<string, number>>;

interface PersistedData {
  /** v2 : bloc à 4 pour Dr Martin dans la démo (les réglages sauvegardés avant sont ignorés). */
  assistantNeedsV2?: AssistantNeeds;
  activityTypes: ActivityType[];
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  absencePeriods: AbsencePeriod[];
  appointments: Appointment[];
}

interface AgendaDataContextValue extends PersistedData {
  /** Semaines types de tous les praticiens (weekSlots ne contient que celle du praticien affiché). */
  allWeekSlots: WeekSlot[];
  /** Périodes d'absence de tous les agendas (absencePeriods ne contient que celles du praticien affiché). */
  allAbsencePeriods: AbsencePeriod[];
  /** Absences Team (congé, maladie, formation…) validées des praticiens, reportées dans leur agenda Soins. */
  syncTeamPeriods: (periods: AbsencePeriod[]) => void;
  /** Praticien dont on règle / consulte l'agenda dans Soins. */
  agendaPraticienId: string;
  setAgendaPraticienId: (id: string) => void;
  /** Salles de ce praticien (toujours au moins une). Pas de limite à 2. */
  roomsFor: (praticienId: string) => string[];
  /** Assistants nécessaires pour ce praticien pendant ce type d'activité (défaut : celui du type, sinon 1). */
  needFor: (praticienId: string, activityTypeId: string) => number;
  setAssistantNeed: (praticienId: string, activityTypeId: string, need: number) => void;
  addActivityType: (type: ActivityType) => void;
  updateActivityType: (type: ActivityType) => void;
  deleteActivityType: (id: string) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
  upsertAbsence: (absence: AbsencePeriod) => void;
  deleteAbsence: (id: string) => void;
  addAppointment: (appointment: Appointment) => void;
}

const AgendaDataContext = createContext<AgendaDataContextValue | null>(null);

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export function AgendaDataProvider({ children }: { children: ReactNode }) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(initialActivityTypes);
  const [allWeekSlots, setWeekSlots] = useState<WeekSlot[]>([...initialWeekSlots, ...OTHER_WEEK_SLOTS]);
  const [agendaPraticienId, setAgendaPraticienId] = useState(DEFAULT_SOINS_PRATICIEN);
  const [assistantNeeds, setAssistantNeeds] = useState<AssistantNeeds>(ASSISTANT_NEEDS);
  const weekSlots = allWeekSlots.filter((s) => slotOwner(s) === agendaPraticienId);
  const [allSpecialSlots, setSpecialSlots] = useState<SpecialSlot[]>([]);
  const specialSlots = allSpecialSlots.filter((s) => slotOwner(s) === agendaPraticienId);
  const [allAbsencePeriods, setAbsencePeriods] = useState<AbsencePeriod[]>([]);
  const absencePeriods = allAbsencePeriods.filter((a) => slotOwner(a) === agendaPraticienId);
  const [allAppointments, setAppointments] = useState<Appointment[]>([]);
  const appointments = allAppointments.filter((a) => slotOwner(a) === agendaPraticienId);
  const [hydrated, setHydrated] = useState(false);

  // Recharge ce qui a été sauvegardé localement, une fois monté côté client.
  // localStorage n'existe pas côté serveur : on ne peut lire la valeur sauvegardée
  // qu'après le montage, d'où le setState en effet (sinon le rendu serveur et le
  // premier rendu client ne correspondraient plus, ce qu'une init paresseuse de
  // useState provoquerait).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Données de démo datées autour d'aujourd'hui, calculées côté client (la date du build serait fausse).
    const seed = buildAgendaSeed(new Date());
    let parsed: Partial<PersistedData> = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw) as Partial<PersistedData>;
    } catch {
      // localStorage indisponible ou données corrompues : on garde les données de démo.
    }
    // Besoin en assistants par type d'activité (retour du 29/09) : complété depuis la démo s'il manque.
    if (parsed.activityTypes)
      setActivityTypes(
        parsed.activityTypes.map((t) => ({ ...t, assistantsNeeded: t.assistantsNeeded ?? initialActivityTypes.find((x) => x.id === t.id)?.assistantsNeeded ?? 1 }))
      );
    // Besoin par praticien et type d'activité (retour du 29/09) : besoins de la démo si rien n'est sauvegardé.
    setAssistantNeeds(parsed.assistantNeedsV2 ?? ASSISTANT_NEEDS);
    // Une semaine type par praticien : on ajoute celles de Dr Martin et Dr Dray si l'agenda sauvegardé ne les a pas.
    if (parsed.weekSlots) {
      const saved = parsed.weekSlots;
      setWeekSlots(saved.some((s) => s.praticienId && s.praticienId !== DEFAULT_SOINS_PRATICIEN) ? saved : [...saved, ...OTHER_WEEK_SLOTS]);
    }
    try {
      const p = window.localStorage.getItem(PRATICIEN_KEY);
      if (p) setAgendaPraticienId(JSON.parse(p));
    } catch {
      // Praticien par défaut.
    }
    setSpecialSlots(parsed.specialSlots ?? seed.specialSlots);
    // Absences déjà validées dans Team : reportées dès l'ouverture de Soins, même sans passer par Team.
    let teamPeriods: AbsencePeriod[] = [];
    try {
      const team = JSON.parse(window.localStorage.getItem(TEAM_STORAGE_KEY) ?? "null");
      if (team?.absences && team?.profiles) teamPeriods = teamAbsencePeriods(team.absences, team.profiles);
    } catch {
      // Pas de données Team : rien à reporter.
    }
    const periods = parsed.absencePeriods ?? seed.absencePeriods;
    setAbsencePeriods(teamPeriods.length ? [...periods.filter((a) => !a.id.startsWith("team-")), ...teamPeriods] : periods);
    setAppointments(parsed.appointments ?? seed.appointments);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persiste après chaque changement, une fois le chargement initial terminé
  // (sinon on écraserait les données sauvegardées avec les données de démo).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: PersistedData = { activityTypes, weekSlots: allWeekSlots, assistantNeedsV2: assistantNeeds, specialSlots: allSpecialSlots, absencePeriods: allAbsencePeriods, appointments: allAppointments };
      window.localStorage.setItem(PRATICIEN_KEY, JSON.stringify(agendaPraticienId));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // quota dépassé ou stockage désactivé : on continue sans persister.
    }
  }, [hydrated, activityTypes, allWeekSlots, assistantNeeds, agendaPraticienId, allSpecialSlots, allAbsencePeriods, allAppointments]);

  const value: AgendaDataContextValue = {
    activityTypes,
    weekSlots,
    allWeekSlots,
    agendaPraticienId,
    setAgendaPraticienId,
    roomsFor: (praticienId) => ROOMS[praticienId] ?? ["Salle 1"],
    needFor: (praticienId, typeId) =>
      assistantNeeds[praticienId]?.[typeId] ?? activityTypes.find((t) => t.id === typeId)?.assistantsNeeded ?? 1,
    setAssistantNeed: (praticienId, typeId, need) =>
      setAssistantNeeds((prev) => ({ ...prev, [praticienId]: { ...prev[praticienId], [typeId]: Math.max(0, Math.min(6, need)) } })),
    specialSlots,
    absencePeriods,
    allAbsencePeriods,
    syncTeamPeriods: (periods) =>
      setAbsencePeriods((prev) => {
        const current = prev.filter((a) => a.id.startsWith("team-"));
        if (JSON.stringify(current) === JSON.stringify(periods)) return prev;
        return [...prev.filter((a) => !a.id.startsWith("team-")), ...periods];
      }),
    appointments,
    addActivityType: (type) => setActivityTypes((prev) => [...prev, type]),
    updateActivityType: (type) => setActivityTypes((prev) => upsertById(prev, type)),
    deleteActivityType: (id) => {
      setActivityTypes((prev) => prev.filter((t) => t.id !== id));
      // Nettoie les créneaux qui référençaient ce type, pour éviter des créneaux fantômes.
      setWeekSlots((prev) => prev.filter((s) => s.activityTypeId !== id));
      setSpecialSlots((prev) => prev.filter((s) => s.activityTypeId !== id));
    },
    // Un créneau créé dans Soins appartient au praticien affiché.
    upsertWeekSlot: (slot) =>
      setWeekSlots((prev) =>
        upsertById(prev, { ...slot, praticienId: slot.praticienId ?? (agendaPraticienId === DEFAULT_SOINS_PRATICIEN ? undefined : agendaPraticienId) })
      ),
    deleteWeekSlot: (id) => setWeekSlots((prev) => prev.filter((s) => s.id !== id)),
    upsertSpecialSlot: (slot) =>
      setSpecialSlots((prev) => upsertById(prev, { ...slot, praticienId: slot.praticienId ?? prev.find((x) => x.id === slot.id)?.praticienId ?? ownerTag(agendaPraticienId) })),
    deleteSpecialSlot: (id) => setSpecialSlots((prev) => prev.filter((s) => s.id !== id)),
    // Une absence posée dans Soins appartient au praticien affiché (celles de Team portent déjà le leur).
    upsertAbsence: (absence) =>
      setAbsencePeriods((prev) => {
        const owner = absence.praticienId ?? prev.find((a) => a.id === absence.id)?.praticienId ?? agendaPraticienId;
        return upsertById(prev, { ...absence, praticienId: owner === DEFAULT_SOINS_PRATICIEN ? undefined : owner });
      }),
    deleteAbsence: (id) => setAbsencePeriods((prev) => prev.filter((a) => a.id !== id)),
    // Un RDV pris dans Soins l'est dans l'agenda du praticien affiché.
    addAppointment: (appointment) => setAppointments((prev) => [...prev, { ...appointment, praticienId: appointment.praticienId ?? ownerTag(agendaPraticienId) }]),
  };

  // Rien n'est rendu avant la lecture des données sauvegardées : les pages s'affichent directement
  // à la date du jour avec les modifications de l'utilisateur, sans décalage entre serveur et navigateur.
  return <AgendaDataContext.Provider value={value}>{hydrated ? children : null}</AgendaDataContext.Provider>;
}

export function useAgendaData(): AgendaDataContextValue {
  const ctx = useContext(AgendaDataContext);
  if (!ctx) throw new Error("useAgendaData must be used within AgendaDataProvider");
  return ctx;
}
