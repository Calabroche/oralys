"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SOINS_PRATICIENS } from "@/data/mockData";
import { slotOwner } from "@/context/AgendaDataContext";
import { SidebarReglages } from "@/components/reglages/SidebarReglages";
import { TypesActiviteSection } from "@/components/reglages/TypesActiviteSection";
import { SemaineTypeGrid } from "@/components/reglages/SemaineTypeGrid";
import { CreneauxSpeciauxSection } from "@/components/reglages/CreneauxSpeciauxSection";
import { AbsencesSection } from "@/components/reglages/AbsencesSection";
import { useAgendaData } from "@/context/AgendaDataContext";

export default function ReglagesAgendaPage() {
  return (
    <Suspense>
      <ReglagesAgenda />
    </Suspense>
  );
}

function ReglagesAgenda() {
  const params = useSearchParams();
  const {
    allWeekSlots,
    agendaPraticienId,
    setAgendaPraticienId,
    activityTypes,
    weekSlots,
    specialSlots,
    absencePeriods,
    addActivityType,
    updateActivityType,
    deleteActivityType,
    upsertWeekSlot,
    deleteWeekSlot,
    upsertSpecialSlot,
    deleteSpecialSlot,
    upsertAbsence,
    deleteAbsence,
  } = useAgendaData();
  const [today] = useState(() => new Date());
  // Lien depuis la fiche praticien de Team : ?praticien=<environnement>&nom=<Dr X>.
  const wanted = params.get("praticien");
  useEffect(() => {
    if (wanted) setAgendaPraticienId(wanted);
  }, [wanted, setAgendaPraticienId]);
  const praticiens = [
    ...SOINS_PRATICIENS,
    ...[...new Set(allWeekSlots.map(slotOwner))].filter((id) => !SOINS_PRATICIENS.some((p) => p.id === id)).map((id) => ({ id, name: id })),
    ...(wanted && !SOINS_PRATICIENS.some((p) => p.id === wanted) ? [{ id: wanted, name: params.get("nom") ?? wanted }] : []),
  ].filter((p, i, list) => list.findIndex((x) => x.id === p.id) === i);

  return (
    <div className="flex">
      <SidebarReglages />
      <div className="mx-auto max-w-4xl flex-1 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configurez votre semaine type, créneaux spéciaux et périodes d&apos;absence. La semaine type et les assistants par type d&apos;activité
              alimentent le planning d&apos;équipe de Team.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Agenda de
            <select
              value={agendaPraticienId}
              onChange={(e) => setAgendaPraticienId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900"
            >
              {praticiens.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 space-y-8">
          <TypesActiviteSection
            activityTypes={activityTypes}
            referenceDate={today}
            weekSlots={weekSlots}
            specialSlots={specialSlots}
            onAddType={addActivityType}
            onUpdateType={updateActivityType}
            onDeleteType={deleteActivityType}
            upsertWeekSlot={upsertWeekSlot}
            deleteWeekSlot={deleteWeekSlot}
            upsertSpecialSlot={upsertSpecialSlot}
            deleteSpecialSlot={deleteSpecialSlot}
          />
          <SemaineTypeGrid
            weekSlots={weekSlots}
            specialSlots={specialSlots}
            absencePeriods={absencePeriods}
            activityTypes={activityTypes}
            referenceDate={today}
            upsertWeekSlot={upsertWeekSlot}
            deleteWeekSlot={deleteWeekSlot}
            upsertSpecialSlot={upsertSpecialSlot}
            deleteSpecialSlot={deleteSpecialSlot}
          />
          <CreneauxSpeciauxSection
            specialSlots={specialSlots}
            activityTypes={activityTypes}
            onSave={upsertSpecialSlot}
            onDelete={deleteSpecialSlot}
            onCreateType={addActivityType}
          />
          <AbsencesSection absencePeriods={absencePeriods} onSave={upsertAbsence} onDelete={deleteAbsence} />
        </div>
      </div>
    </div>
  );
}
