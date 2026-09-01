"use client";

import { useState } from "react";
import { ActivityType } from "@/types";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { minutesToDurationLabel } from "@/utils/date";
import { NouveauTypeModal } from "./NouveauTypeModal";

interface Props {
  activityTypes: ActivityType[];
  onAddType: (type: ActivityType) => void;
}

export function TypesActiviteSection({ activityTypes, onAddType }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
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
            <div
              key={type.id}
              className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}
            >
              <div className="flex items-start justify-between">
                <p className={`text-sm font-medium ${colors.text}`}>{type.name}</p>
                {type.locked && <span className="text-xs text-slate-400">🔒</span>}
              </div>
              <p className={`mt-1 text-xs ${colors.text} opacity-80`}>{type.description}</p>
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
          </div>
        )}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          + Nouveau type
        </button>
      </div>

      {modalOpen && (
        <NouveauTypeModal
          usedColors={activityTypes.map((t) => t.color)}
          onClose={() => setModalOpen(false)}
          onSave={(type) => {
            onAddType(type);
            setModalOpen(false);
          }}
        />
      )}
    </section>
  );
}
