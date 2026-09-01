"use client";

import { useState } from "react";
import { AbsenceMotif, AbsencePeriod } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";

const MOTIFS: AbsenceMotif[] = ["Congés", "Formation", "Maladie", "Fermeture cabinet", "Autre"];

export function AbsenceModal({
  absence,
  onClose,
  onSave,
}: {
  absence?: AbsencePeriod;
  onClose: () => void;
  onSave: (absence: AbsencePeriod) => void;
}) {
  const [startDate, setStartDate] = useState(absence?.startDate ?? "");
  const [startTime, setStartTime] = useState(absence?.startTime ?? "00:00");
  const [endDate, setEndDate] = useState(absence?.endDate ?? "");
  const [endTime, setEndTime] = useState(absence?.endTime ?? "23:59");
  const [motif, setMotif] = useState<AbsenceMotif | "">(absence?.motif ?? "");

  const canSave = startDate && endDate && motif;

  return (
    <Modal title="Ajouter une période d'absence" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">À partir de</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Jusqu&apos;à</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Motif</label>
          <select
            value={motif}
            onChange={(e) => setMotif(e.target.value as AbsenceMotif)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="" disabled>
              Sélectionner un motif
            </option>
            {MOTIFS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ModalActions
        onCancel={onClose}
        onSave={() => {
          if (!canSave) return;
          onSave({
            id: absence?.id ?? `abs-${Date.now()}`,
            motif: motif as AbsenceMotif,
            startDate,
            startTime,
            endDate,
            endTime,
          });
        }}
      />
    </Modal>
  );
}
