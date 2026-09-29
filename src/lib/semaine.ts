import { WeekSlot, Weekday } from "@/types";
import { HalfDay, PraticienProfile, TeamUser } from "@/types/team";
import { activityTypes } from "@/data/mockData";
import { WEEKDAYS } from "@/utils/date";

/**
 * Semaine type du praticien (celle de son agenda Soins) et besoin en assistants par type d'activité.
 * Le besoin d'une demi-journée est le plus grand besoin des activités qui s'y trouvent
 * (ex. consultation à 8 h puis bloc à 10 h : c'est le besoin du bloc qui compte).
 */

/** Limite entre le matin et l'après-midi. */
export const MIDI = "13:00";

export const HALVES: HalfDay[] = ["matin", "apres_midi"];

export function halvesOfSlot(slot: Pick<WeekSlot, "start" | "end">): HalfDay[] {
  const out: HalfDay[] = [];
  if (slot.start < MIDI) out.push("matin");
  if (slot.end > MIDI) out.push("apres_midi");
  return out;
}

export function activityName(id: string): string {
  return activityTypes.find((t) => t.id === id)?.name ?? id;
}

/** Besoin en assistants pour un type d'activité (défaut : le besoin général de la fiche, sinon 1). */
export function needForActivity(profile: PraticienProfile, activityTypeId: string): number {
  return profile.needsByActivity?.[activityTypeId] ?? profile.assistantsNeeded ?? 1;
}

/** Types d'activité présents dans la semaine type, dans l'ordre de l'agenda Soins. */
export function activitiesOf(profile: PraticienProfile): string[] {
  const used = new Set((profile.weekSlots ?? []).map((s) => s.activityTypeId));
  return activityTypes.map((t) => t.id).filter((id) => used.has(id));
}

export interface HalfPlan {
  half: HalfDay;
  /** Activités prévues sur cette demi-journée. */
  activities: string[];
  need: number;
}

/**
 * Demi-journées travaillées un jour de la semaine, avec leurs activités et leur besoin.
 * Sans semaine type (profil ancien ou incomplet), on retombe sur les jours de travail et le besoin général.
 */
export function dayPlan(profile: PraticienProfile, praticien: TeamUser, day: Weekday): HalfPlan[] {
  const slots = (profile.weekSlots ?? []).filter((s) => s.day === day);
  if (!profile.weekSlots?.length) {
    if (!praticien.workDays.includes(day)) return [];
    const half = praticien.halfDays?.[day];
    const need = profile.assistantsNeeded ?? 1;
    return (half ? [half] : HALVES).map((h) => ({ half: h, activities: [], need }));
  }
  return HALVES.map((half) => {
    const acts = slots.filter((s) => halvesOfSlot(s).includes(half)).map((s) => s.activityTypeId);
    const activities = [...new Set(acts)];
    return { half, activities, need: Math.max(0, ...activities.map((a) => needForActivity(profile, a))) };
  }).filter((p) => p.activities.length > 0);
}

/** Jours et demi-journées travaillés, déduits de la semaine type (pour tout ce qui lit workDays). */
export function scheduleFromSlots(slots: WeekSlot[]): Pick<TeamUser, "workDays" | "halfDays"> {
  const workDays: Weekday[] = [];
  const halfDays: Partial<Record<Weekday, HalfDay>> = {};
  for (const day of WEEKDAYS) {
    const halves = new Set(slots.filter((s) => s.day === day).flatMap(halvesOfSlot));
    if (!halves.size) continue;
    workDays.push(day);
    if (halves.size === 1) halfDays[day] = [...halves][0];
  }
  return { workDays, halfDays };
}

/** Plus grand besoin d'un jour de la semaine (sert à dimensionner les titulaires). */
export function maxNeedOn(profile: PraticienProfile, praticien: TeamUser, day: Weekday): number {
  return Math.max(0, ...dayPlan(profile, praticien, day).map((p) => p.need));
}

/** Le praticien a-t-il besoin d'un assistant à un moment de la semaine ? */
export function needsAnyAssistant(profile: PraticienProfile | undefined): boolean {
  if (!profile) return true;
  if (!profile.weekSlots?.length) return (profile.assistantsNeeded ?? 1) > 0;
  return profile.weekSlots.some((s) => needForActivity(profile, s.activityTypeId) > 0);
}

/** Résumé du besoin pour un en-tête : « 2 assistants », « 1 à 2 assistants selon l'activité » ou « sans assistant ». */
export function needSummary(profile: PraticienProfile): string {
  const needs = profile.weekSlots?.length ? activitiesOf(profile).map((a) => needForActivity(profile, a)) : [profile.assistantsNeeded ?? 1];
  const min = Math.min(...needs);
  const max = Math.max(...needs);
  if (max === 0) return "Travaille sans assistant";
  if (min === max) return `Besoin : ${max} assistant${max > 1 ? "s" : ""}`;
  return `Besoin : ${min} à ${max} assistants selon l'activité`;
}
