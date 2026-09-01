"use client";

import { ActivityColor } from "@/types";
import { ACTIVITY_COLOR_CLASSES, COLOR_OPTIONS } from "@/utils/colors";

interface Props {
  value: ActivityColor;
  onChange: (color: ActivityColor) => void;
  usedColors?: ActivityColor[];
}

export function ColorSwatchPicker({ value, onChange, usedColors = [] }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const isUsed = usedColors.includes(opt.value) && !isSelected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={isUsed ? `${opt.label} (déjà utilisée)` : opt.label}
            className={`relative flex h-7 w-7 items-center justify-center rounded-full ${ACTIVITY_COLOR_CLASSES[opt.value].dot} ${
              isSelected ? "ring-2 ring-slate-900 ring-offset-2" : ""
            }`}
          >
            {isSelected && <span className="text-xs text-white">✓</span>}
            {isUsed && (
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-slate-400 text-[8px] text-white">
                !
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
