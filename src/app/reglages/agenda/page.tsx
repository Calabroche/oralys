"use client";

import { SidebarReglages } from "@/components/reglages/SidebarReglages";
import { TypesActiviteSection } from "@/components/reglages/TypesActiviteSection";
import { SemaineTypeGrid } from "@/components/reglages/SemaineTypeGrid";
import { CreneauxSpeciauxSection } from "@/components/reglages/CreneauxSpeciauxSection";
import { AbsencesSection } from "@/components/reglages/AbsencesSection";
import { useAgendaData } from "@/context/AgendaDataContext";

export default function ReglagesAgendaPage() {
  const {
    activityTypes,
    weekSlots,
    specialSlots,
    absencePeriods,
    addActivityType,
    upsertWeekSlot,
    deleteWeekSlot,
    upsertSpecialSlot,
    deleteSpecialSlot,
    upsertAbsence,
    deleteAbsence,
  } = useAgendaData();

  return (
    <div className="flex">
      <SidebarReglages />
      <div className="mx-auto max-w-4xl flex-1 px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configurez votre semaine type, créneaux spéciaux et périodes d&apos;absence
        </p>

        <div className="mt-6 space-y-8">
          <TypesActiviteSection activityTypes={activityTypes} onAddType={addActivityType} />
          <SemaineTypeGrid
            weekSlots={weekSlots}
            activityTypes={activityTypes}
            onSave={upsertWeekSlot}
            onDelete={deleteWeekSlot}
          />
          <CreneauxSpeciauxSection
            specialSlots={specialSlots}
            activityTypes={activityTypes}
            onSave={upsertSpecialSlot}
            onDelete={deleteSpecialSlot}
          />
          <AbsencesSection absencePeriods={absencePeriods} onSave={upsertAbsence} onDelete={deleteAbsence} />
        </div>
      </div>
    </div>
  );
}
