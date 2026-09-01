"use client";

import { useState } from "react";
import { SidebarReglages } from "@/components/reglages/SidebarReglages";
import { TypesActiviteSection } from "@/components/reglages/TypesActiviteSection";
import { SemaineTypeGrid } from "@/components/reglages/SemaineTypeGrid";
import { CreneauxSpeciauxSection } from "@/components/reglages/CreneauxSpeciauxSection";
import { AbsencesSection } from "@/components/reglages/AbsencesSection";
import {
  activityTypes as initialActivityTypes,
  weekSlots as initialWeekSlots,
  specialSlots as initialSpecialSlots,
  absencePeriods as initialAbsencePeriods,
} from "@/data/mockData";
import { ActivityType, AbsencePeriod, SpecialSlot, WeekSlot } from "@/types";

export default function ReglagesAgendaPage() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(initialActivityTypes);
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>(initialWeekSlots);
  const [specialSlots, setSpecialSlots] = useState<SpecialSlot[]>(initialSpecialSlots);
  const [absencePeriods, setAbsencePeriods] = useState<AbsencePeriod[]>(initialAbsencePeriods);

  function upsertWeekSlot(slot: WeekSlot) {
    setWeekSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      return exists ? prev.map((s) => (s.id === slot.id ? slot : s)) : [...prev, slot];
    });
  }

  function upsertSpecialSlot(slot: SpecialSlot) {
    setSpecialSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      return exists ? prev.map((s) => (s.id === slot.id ? slot : s)) : [...prev, slot];
    });
  }

  function upsertAbsence(absence: AbsencePeriod) {
    setAbsencePeriods((prev) => {
      const exists = prev.some((a) => a.id === absence.id);
      return exists ? prev.map((a) => (a.id === absence.id ? absence : a)) : [...prev, absence];
    });
  }

  return (
    <div className="flex">
      <SidebarReglages />
      <div className="mx-auto max-w-4xl flex-1 px-8 py-6">
        <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configurez votre semaine type, créneaux spéciaux et périodes d&apos;absence
        </p>

        <div className="mt-6 space-y-8">
          <TypesActiviteSection
            activityTypes={activityTypes}
            onAddType={(type) => setActivityTypes((prev) => [...prev, type])}
          />
          <SemaineTypeGrid
            weekSlots={weekSlots}
            activityTypes={activityTypes}
            onSave={upsertWeekSlot}
            onDelete={(id) => setWeekSlots((prev) => prev.filter((s) => s.id !== id))}
          />
          <CreneauxSpeciauxSection
            specialSlots={specialSlots}
            activityTypes={activityTypes}
            onSave={upsertSpecialSlot}
          />
          <AbsencesSection absencePeriods={absencePeriods} onSave={upsertAbsence} />
        </div>
      </div>
    </div>
  );
}
