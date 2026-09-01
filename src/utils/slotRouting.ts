import { ActivityColor, RecurrenceFrequency, RecurrenceUnit, SpecialSlot, Weekday, WeekSlot } from "@/types";
import { nextWeekdayOccurrence, toISODate } from "@/utils/date";

export interface RecurrenceChoice {
  day: Weekday;
  activityTypeId: string;
  activityTypeName: string;
  activityColor: ActivityColor;
  start: string;
  end: string;
  frequency: RecurrenceFrequency;
  customInterval?: number;
  customUnit?: RecurrenceUnit;
  endsNever: boolean;
  recurrenceEndDate?: string;
}

/**
 * "Fusion intelligente" : un seul choix de récurrence, routé vers le bon objet.
 * "Toutes les semaines" sans date de fin → WeekSlot (Semaine type, comportement historique).
 * Toute autre fréquence (2 semaines, mensuel, personnalisé, ou hebdo avec fin) → Créneau
 * spécial récurrent, ancré sur la prochaine occurrence du jour choisi.
 */
export function buildSlotFromChoice(
  choice: RecurrenceChoice,
  referenceDate: Date,
  existingId?: string
): { kind: "week"; slot: WeekSlot } | { kind: "special"; slot: SpecialSlot } {
  const isPermanentWeekly = choice.frequency === "weekly" && choice.endsNever;

  if (isPermanentWeekly) {
    return {
      kind: "week",
      slot: {
        id: existingId ?? `ws-${Date.now()}`,
        day: choice.day,
        activityTypeId: choice.activityTypeId,
        start: choice.start,
        end: choice.end,
      },
    };
  }

  const anchor = toISODate(nextWeekdayOccurrence(referenceDate, choice.day));
  return {
    kind: "special",
    slot: {
      id: existingId ?? `ss-${Date.now()}`,
      activityTypeId: choice.activityTypeId,
      label: choice.activityTypeName,
      color: choice.activityColor,
      startDate: anchor,
      endDate: anchor,
      allDay: false,
      start: choice.start,
      end: choice.end,
      recurrence: {
        frequency: choice.frequency,
        customInterval: choice.frequency === "custom" ? choice.customInterval : undefined,
        customUnit: choice.frequency === "custom" ? choice.customUnit : undefined,
        endDate: choice.endsNever ? null : choice.recurrenceEndDate || null,
      },
    },
  };
}
