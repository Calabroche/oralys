"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [2, 3, 5, 10, 15];

/**
 * Sélecteur « N jours » à côté de Jour / Semaine : une fenêtre glissante d'un nombre de jours au
 * choix, pas calée sur une semaine civile — même présentation pour tous les calendriers de l'app.
 */
export function DayCountPicker({
  value,
  active,
  onChange,
  activeClassName = "bg-slate-900 text-white",
}: {
  /** Nombre de jours actuellement retenu (coché dans le menu quand `active`). */
  value: number;
  /** Ce mode est-il le mode affiché en ce moment (sinon le bouton reste neutre). */
  active: boolean;
  onChange: (days: number) => void;
  /** Classes du bouton quand ce mode est actif (pour matcher la couleur de chaque calendrier). */
  activeClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Choisir un nombre de jours"
        className={cn("flex h-7 items-center gap-0.5 rounded-full px-2 text-xs font-medium", active ? activeClassName : "text-slate-500 hover:text-slate-700")}
      >
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
            {PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-slate-800">
                  <span className="w-3.5 shrink-0 text-slate-900">{active && value === n ? "✓" : ""}</span>
                  {n} Jours
                </span>
                <span className="text-slate-400">{n}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
