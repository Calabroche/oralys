"use client";

import { useState } from "react";
import { ActivityType, SpecialSlot, WeekSlot } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { minutesToDurationLabel } from "@/utils/date";
import { ActivityTypeModal } from "./ActivityTypeModal";
import { useAgendaData } from "@/context/AgendaDataContext";

interface Props {
  activityTypes: ActivityType[];
  referenceDate: Date;
  weekSlots: WeekSlot[];
  specialSlots: SpecialSlot[];
  onAddType: (type: ActivityType) => void;
  onUpdateType: (type: ActivityType) => void;
  onDeleteType: (id: string) => void;
  upsertWeekSlot: (slot: WeekSlot) => void;
  deleteWeekSlot: (id: string) => void;
  upsertSpecialSlot: (slot: SpecialSlot) => void;
  deleteSpecialSlot: (id: string) => void;
}

export function TypesActiviteSection({
  activityTypes,
  referenceDate,
  weekSlots,
  specialSlots,
  onAddType,
  onUpdateType,
  onDeleteType,
  upsertWeekSlot,
  deleteWeekSlot,
  upsertSpecialSlot,
  deleteSpecialSlot,
}: Props) {
  const [modalState, setModalState] = useState<null | "new" | ActivityType>(null);
  const tousMotifs = activityTypes.find((t) => t.id === "tous-motifs");
  const others = activityTypes.filter((t) => t.id !== "tous-motifs");

  return (
    <section id="types-activite" className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Types d&apos;activité</h2>
        <span className="text-slate-400" title="Types d'activité utilisés pour la semaine type et les rendez-vous">ⓘ</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {others.map((type) => {
          const colors = ACTIVITY_COLOR_CLASSES[type.color];
          return (
            <div key={type.id} className={`flex flex-col rounded-lg border p-3 ${colors.border} ${colors.bg}`}>
              <button
                type="button"
                disabled={type.locked}
                onClick={() => setModalState(type)}
                className={`flex-1 text-left ${type.locked ? "cursor-default" : "hover:brightness-95"}`}
              >
                <div className="flex items-start justify-between">
                  <p className={`text-sm font-medium ${colors.text}`}>{type.name}</p>
                  {type.locked ? <span className="text-xs text-slate-400">🔒</span> : <span className="text-xs text-slate-400">✎</span>}
                </div>
                <p className={`mt-1 text-xs ${colors.text} opacity-80`}>{type.description}</p>
              </button>
              <AssistantsStepper type={type} onChange={onUpdateType} />
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        {tousMotifs && (
          <div className={`rounded-lg border ${ACTIVITY_COLOR_CLASSES[tousMotifs.color].border} ${ACTIVITY_COLOR_CLASSES[tousMotifs.color].bg} p-3`}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-700">{tousMotifs.name}</p>
              {tousMotifs.locked && <span className="text-xs text-slate-400">🔒</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{tousMotifs.description}</p>
            <p className="mt-1 text-xs text-slate-400">⏱ {minutesToDurationLabel(tousMotifs.durationMinutes)}</p>
            <AssistantsStepper type={tousMotifs} onChange={onUpdateType} />
          </div>
        )}
        <button
          onClick={() => setModalState("new")}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          + Nouveau type
        </button>
      </div>

      {modalState && (
        <ActivityTypeModal
          existing={modalState === "new" ? undefined : modalState}
          usedColors={activityTypes.filter((t) => modalState === "new" || t.id !== modalState.id).map((t) => t.color)}
          referenceDate={referenceDate}
          weekSlots={weekSlots}
          specialSlots={specialSlots}
          onClose={() => setModalState(null)}
          onSave={(type) => {
            if (modalState === "new") onAddType(type);
            else onUpdateType(type);
            setModalState(null);
          }}
          onDelete={(id) => {
            onDeleteType(id);
            setModalState(null);
          }}
          upsertWeekSlot={upsertWeekSlot}
          deleteWeekSlot={deleteWeekSlot}
          upsertSpecialSlot={upsertSpecialSlot}
          deleteSpecialSlot={deleteSpecialSlot}
        />
      )}
    </section>
  );
}

/** Assistants nécessaires pendant l'activité, pour ce praticien : réglable même sur les types verrouillés, lu par Team. */
function AssistantsStepper({ type }: { type: ActivityType; onChange?: (t: ActivityType) => void }) {
  // Réglé pour le praticien dont on affiche l'agenda (chaque praticien a ses besoins).
  const { agendaPraticienId, needFor, setAssistantNeed } = useAgendaData();
  const n = needFor(agendaPraticienId, type.id);
  const set = (v: number) => setAssistantNeed(agendaPraticienId, type.id, v);
  return (
    <div className="mt-2 flex items-center gap-1.5 border-t border-black/5 pt-2 text-xs text-slate-600" title="Assistants dentaires nécessaires pour ce praticien pendant cette activité (utilisé par Team)">
      <span aria-hidden>👥</span>
      <button type="button" onClick={() => set(n - 1)} disabled={n === 0} className="size-5 rounded border bg-white leading-none disabled:opacity-40" aria-label={`Un assistant de moins pour ${type.name}`}>
        −
      </button>
      <span className="min-w-16 text-center font-medium">{n === 0 ? "sans assistant" : `${n} assistant${n > 1 ? "s" : ""}`}</span>
      <button type="button" onClick={() => set(n + 1)} className="size-5 rounded border bg-white leading-none" aria-label={`Un assistant de plus pour ${type.name}`}>
        +
      </button>
    </div>
  );
}
