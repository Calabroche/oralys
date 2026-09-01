"use client";

import { useState } from "react";
import { ActivityType, Weekday, WeekSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { WEEKDAYS, WEEKDAY_LABELS, minutesToDurationLabel, timeToMinutes } from "@/utils/date";
import { WeekSlotModal } from "./WeekSlotModal";
import { getActivityType } from "@/data/mockData";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 40; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

interface Props {
  weekSlots: WeekSlot[];
  activityTypes: ActivityType[];
  onSave: (slot: WeekSlot) => void;
  onDelete: (id: string) => void;
}

export function SemaineTypeGrid({ weekSlots, activityTypes, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<WeekSlot | { day: Weekday } | null>(null);

  const dayTotalMinutes = (day: Weekday) =>
    weekSlots
      .filter((s) => s.day === day)
      .reduce((sum, s) => sum + (timeToMinutes(s.end) - timeToMinutes(s.start)), 0);

  return (
    <section id="semaine-type" className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Semaine type</h2>
        <span className="text-slate-400" title="Grille appliquée chaque semaine">ⓘ</span>
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
              onDoubleClick={() => setEditing({ day })}
            >
              {HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-100" />
              ))}

              {weekSlots
                .filter((s) => s.day === day)
                .map((slot) => {
                  const type = getActivityType(slot.activityTypeId);
                  const colors = ACTIVITY_COLOR_CLASSES[type.color];
                  const top = ((timeToMinutes(slot.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = ((timeToMinutes(slot.end) - timeToMinutes(slot.start)) / 60) * HOUR_HEIGHT;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setEditing(slot)}
                      style={{ top, height }}
                      className={`absolute inset-x-1 rounded-md border ${colors.border} ${colors.bg} px-1.5 py-1 text-left text-[11px] leading-tight ${colors.text} hover:brightness-95`}
                    >
                      <p className="font-medium">{type.name}</p>
                      <p className="opacity-80">
                        {slot.start} - {slot.end}
                      </p>
                      {height > 32 && (
                        <p className="opacity-60">⏱ {minutesToDurationLabel(timeToMinutes(slot.end) - timeToMinutes(slot.start))}</p>
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
          slot={editing}
          activityTypes={activityTypes}
          onClose={() => setEditing(null)}
          onSave={(slot) => {
            onSave(slot);
            setEditing(null);
          }}
          onDelete={(id) => {
            onDelete(id);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
