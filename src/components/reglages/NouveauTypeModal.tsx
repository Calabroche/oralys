"use client";

import { useState } from "react";
import { ActivityColor, ActivityType } from "@/types";
import { Modal, ModalActions } from "@/components/ui/Modal";

const COLOR_OPTIONS: { value: ActivityColor; label: string }[] = [
  { value: "green", label: "Vert" },
  { value: "red", label: "Rouge" },
  { value: "blue", label: "Bleu" },
  { value: "purple", label: "Violet" },
  { value: "gray", label: "Gris" },
];

export function NouveauTypeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (type: ActivityType) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState<ActivityColor>("green");

  const canSave = name.trim().length > 0;

  return (
    <Modal title="Nouveau type d'activité" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Orthodontie"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : Pose de bagues, suivi"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Durée (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Couleur</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value as ActivityColor)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {COLOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <ModalActions
        onCancel={onClose}
        onSave={() => {
          if (!canSave) return;
          onSave({
            id: `type-${Date.now()}`,
            name: name.trim(),
            description: description.trim() || name.trim(),
            color,
            durationMinutes: duration,
          });
        }}
      />
    </Modal>
  );
}
