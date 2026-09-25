"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SPECIALTIES } from "@/data/teamMockData";
import { acteLabel } from "@/lib/team";
import { ActeCategory } from "@/types/team";
import { cn } from "@/lib/utils";

/** Multi-sélection de spécialités, reprise de la page Équipe de la prod (puces + liste). */
export function SpecialtyPicker({
  value,
  onChange,
  disabled,
}: {
  value: ActeCategory[];
  onChange: (next: ActeCategory[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const remaining = SPECIALTIES.filter((s) => !value.includes(s.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border bg-white px-2 py-1 text-sm",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-slate-300",
            open && "border-pink-300 ring-3 ring-pink-100"
          )}
        >
          {value.length === 0 && <span className="px-1 text-slate-400">Sélectionnez une ou plusieurs spécialités</span>}
          {value.map((s) => (
            <span key={s} className="flex items-center gap-1 rounded-md border bg-slate-50 py-0.5 pr-1 pl-2 text-xs">
              {acteLabel(s)}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Retirer ${acteLabel(s)}`}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((x) => x !== s));
                  }}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </PopoverTrigger>
      <PopoverContent id={listId} align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Rechercher une spécialité" />
          <CommandList>
            <CommandEmpty>Toutes les spécialités sont déjà sélectionnées.</CommandEmpty>
            <CommandGroup>
              {remaining.map((s) => (
                <CommandItem key={s.id} value={s.label} onSelect={() => onChange([...value, s.id])} className="data-[selected=true]:bg-pink-50">
                  {s.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
