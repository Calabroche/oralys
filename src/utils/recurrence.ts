import { Recurrence, SpecialSlot } from "@/types";
import { addDays, addMonths, addWeeks, fromISODate, toISODate } from "@/utils/date";

export interface RecurrenceOccurrence {
  startDate: string;
  endDate: string;
}

const MAX_OCCURRENCES = 104; // garde-fou (~2 ans en hebdomadaire)

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

function nextOccurrenceStart(current: Date, recurrence: Recurrence): Date {
  switch (recurrence.frequency) {
    case "weekly":
      return addWeeks(current, 1);
    case "biweekly":
      return addWeeks(current, 2);
    case "monthly":
      return addMonths(current, 1);
    case "custom":
      return recurrence.customUnit === "months"
        ? addMonths(current, recurrence.customInterval ?? 1)
        : addWeeks(current, recurrence.customInterval ?? 1);
    default:
      return addWeeks(current, 1);
  }
}

/**
 * Génère les occurrences d'un créneau spécial (récurrent ou non) qui recoupent
 * la plage [rangeStart, rangeEnd]. Chaque occurrence conserve la durée
 * (en jours) du créneau d'origine.
 */
export function expandRecurrence(slot: SpecialSlot, rangeStart: Date, rangeEnd: Date): RecurrenceOccurrence[] {
  const baseStart = fromISODate(slot.startDate);
  const baseEnd = fromISODate(slot.endDate);
  const spanDays = Math.round((baseEnd.getTime() - baseStart.getTime()) / 86400000);

  if (slot.recurrence.frequency === "none") {
    return overlaps(baseStart, baseEnd, rangeStart, rangeEnd)
      ? [{ startDate: slot.startDate, endDate: slot.endDate }]
      : [];
  }

  const recurrenceEnd = slot.recurrence.endDate ? fromISODate(slot.recurrence.endDate) : null;
  const occurrences: RecurrenceOccurrence[] = [];
  let occurrenceStart = baseStart;

  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    if (recurrenceEnd && occurrenceStart > recurrenceEnd) break;
    if (occurrenceStart > rangeEnd) break;

    const occurrenceEnd = addDays(occurrenceStart, spanDays);
    if (overlaps(occurrenceStart, occurrenceEnd, rangeStart, rangeEnd)) {
      occurrences.push({ startDate: toISODate(occurrenceStart), endDate: toISODate(occurrenceEnd) });
    }

    occurrenceStart = nextOccurrenceStart(occurrenceStart, slot.recurrence);
  }

  return occurrences;
}

export function describeRecurrence(recurrence: Recurrence): string | null {
  switch (recurrence.frequency) {
    case "none":
      return null;
    case "weekly":
      return "Toutes les semaines";
    case "biweekly":
      return "Toutes les 2 semaines";
    case "monthly":
      return "Tous les mois";
    case "custom": {
      const n = recurrence.customInterval ?? 1;
      const unit = recurrence.customUnit === "months" ? (n > 1 ? "mois" : "mois") : n > 1 ? "semaines" : "semaine";
      return `Tous les ${n} ${unit}`;
    }
    default:
      return null;
  }
}
