"use client";

import { useState } from "react";
import { ActivityType, SpecialSlot, Weekday, WeekSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { WEEKDAYS, WEEKDAY_LABELS, fromISODate, minutesToDurationLabel, timeToMinutes, toWeekday } from "@/utils/date";
import { WeekSlotModal, EditableSlot } from "./WeekSlotModal";
import { getActivityType } from "@/data/mockData";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 40; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface DisplayBlock {
  key: string;
  editable: EditableSlot;
  activityTypeId: string;
  start: string;
  end: string;
  recurring: boolean;
}

interface Props {
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  activityTypes: ActivityType[];
  referenceDate: Date;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
}

export function SemaineTypeGrid({
  weekSlots,
  specialSlots,
  activityTypes,
  referenceDate,
  upsertWeekSlot,
  deleteWeekSlot,
  upsertSpecialSlot,
  deleteSpecialSlot,
}: Props) {
  const [editing, setEditing] = useState<EditableSlot | null>(null);

  // Créneaux spéciaux récurrents et non "toute la journée" : ils représentent une
  // activité programmée (ex. "Urgences toutes les 2 semaines"), pas une simple absence,
  // donc ils apparaissent aussi dans l'aperçu de la Semaine type.
  const recurringSpecials = specialSlots.filter((s) => !s.allDay && s.recurrence.frequency !== "none");

  function blocksForDay(day: Weekday): DisplayBlock[] {
    const fromWeek: DisplayBlock[] = weekSlots
      .filter((s) => s.day === day)
      .map((s) => ({
        key: `week-${s.id}`,
        activityTypeId: s.activityTypeId,
        start: s.start,
        end: s.end,
        recurring: false,
        editable: {
          origin: "week",
          id: s.id,
          day: s.day,
          activityTypeId: s.activityTypeId,
          start: s.start,
          end: s.end,
          frequency: "weekly",
          recurrenceEndDate: null,
        },
      }));

    const fromSpecial: DisplayBlock[] = recurringSpecials
      .filter((s) => toWeekday(fromISODate(s.startDate)) === day)
      .map((s) => ({
        key: `special-${s.id}`,
        activityTypeId: s.activityTypeId,
        start: s.start ?? "00:00",
        end: s.end ?? "00:00",
        recurring: true,
        editable: {
          origin: "special",
          id: s.id,
          day,
          activityTypeId: s.activityTypeId,
          start: s.start ?? "09:00",
          end: s.end ?? "10:00",
          frequency: s.recurrence.frequency,
          customInterval: s.recurrence.customInterval,
          customUnit: s.recurrence.customUnit,
          recurrenceEndDate: s.recurrence.endDate,
        },
      }));

    return [...fromWeek, ...fromSpecial];
  }

  const dayTotalMinutes = (day: Weekday) =>
    blocksForDay(day).reduce((sum, b) => sum + (timeToMinutes(b.end) - timeToMinutes(b.start)), 0);

  return (
    <section id="semaine-type" className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Semaine type</h2>
        <span className="text-slate-400" title="Grille appliquée chaque semaine. Les créneaux à récurrence non hebdomadaire (toutes les 2 semaines, mensuel, personnalisé) y apparaissent aussi, avec un badge 🔁.">
          ⓘ
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-slate-200 text-xs text-slate-500">
          <div />
          {WEEKDAYS.map((day) => (
            <div key={day} className="border-l border-slate-200 px-2 py-2">
              <p className="font-medium text-slate-700">{WEEKDAY_LABELS[day]}</p>
              <p>{dayTotalMinutes(day) > 0 ? minutesToDurationLabel(dayTotalMinutes(day)) : "Indisponible"}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_repeat(6,1fr)]">
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100 pr-2 text-right text-[11px] text-slate-400">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="relative border-l border-slate-200"
              style={{ height: HOUR_HEIGHT * HOURS.length }}
              onDoubleClick={() =>
                setEditing({
                  day,
                  activityTypeId: activityTypes[0]?.id ?? "",
                  start: "09:00",
                  end: "10:00",
                  frequency: "weekly",
                  recurrenceEndDate: null,
                })
              }
            >
              {HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
              ))}

              {blocksForDay(day).map((block) => {
                const type = getActivityType(block.activityTypeId);
                const colors = ACTIVITY_COLOR_CLASSES[type.color];
                const top = ((timeToMinutes(block.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = ((timeToMinutes(block.end) - timeToMinutes(block.start)) / 60) * HOUR_HEIGHT;
                return (
                  <button
                    key={block.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(block.editable);
                    }}
                    style={{ top, height }}
                    className={`absolute inset-x-1 rounded-md border ${colors.border} ${colors.bg} px-1.5 py-1 text-left text-[11px] leading-tight ${colors.text} hover:brightness-95`}
                  >
                    <p className="flex items-center gap-1 font-medium">
                      {type.name}
                      {block.recurring && <span title="Récurrence non hebdomadaire">🔁</span>}
                    </p>
                    <p className="opacity-80">
                      {block.start} - {block.end}
                    </p>
                    {height > 32 && (
                      <p className="opacity-60">⏱ {minutesToDurationLabel(timeToMinutes(block.end) - timeToMinutes(block.start))}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">Double-cliquez sur une colonne pour ajouter un créneau.</p>

      {editing && (
        <WeekSlotModal
          initial={editing}
          activityTypes={activityTypes}
          referenceDate={referenceDate}
          onClose={() => setEditing(null)}
          upsertWeekSlot={upsertWeekSlot}
          deleteWeekSlot={deleteWeekSlot}
          upsertSpecialSlot={upsertSpecialSlot}
          deleteSpecialSlot={deleteSpecialSlot}
        />
      )}
    </section>
  );
}
