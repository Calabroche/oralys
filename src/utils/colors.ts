import { ActivityColor } from "@/types";

interface ColorClasses {
  bg: string;
  border: string;
  text: string;
  dot: string;
  chip: string;
}

export const ACTIVITY_COLOR_CLASSES: Record<ActivityColor, ColorClasses> = {
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    text: "text-teal-800",
    dot: "bg-teal-500",
    chip: "bg-teal-100 text-teal-800 border-teal-300",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    text: "text-cyan-800",
    dot: "bg-cyan-500",
    chip: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
  blue: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-800",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-300",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-800",
    dot: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  purple: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-800",
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800 border-violet-300",
  },
  fuchsia: {
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-300",
    text: "text-fuchsia-800",
    dot: "bg-fuchsia-500",
    chip: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-300",
    text: "text-pink-800",
    dot: "bg-pink-500",
    chip: "bg-pink-100 text-pink-800 border-pink-300",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    dot: "bg-red-500",
    chip: "bg-red-100 text-red-800 border-red-300",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-800",
    dot: "bg-orange-500",
    chip: "bg-orange-100 text-orange-800 border-orange-300",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 border-amber-300",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    dot: "bg-yellow-500",
    chip: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  lime: {
    bg: "bg-lime-50",
    border: "border-lime-300",
    text: "text-lime-800",
    dot: "bg-lime-500",
    chip: "bg-lime-100 text-lime-800 border-lime-300",
  },
  stone: {
    bg: "bg-stone-50",
    border: "border-stone-300",
    text: "text-stone-800",
    dot: "bg-stone-500",
    chip: "bg-stone-100 text-stone-800 border-stone-300",
  },
  gray: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-700",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export const COLOR_OPTIONS: { value: ActivityColor; label: string }[] = [
  { value: "green", label: "Vert" },
  { value: "teal", label: "Sarcelle" },
  { value: "cyan", label: "Cyan" },
  { value: "blue", label: "Bleu" },
  { value: "indigo", label: "Indigo" },
  { value: "purple", label: "Violet" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "pink", label: "Rose" },
  { value: "red", label: "Rouge" },
  { value: "orange", label: "Orange" },
  { value: "amber", label: "Ambre" },
  { value: "yellow", label: "Jaune" },
  { value: "lime", label: "Citron vert" },
  { value: "stone", label: "Taupe" },
  { value: "gray", label: "Gris" },
];

export function firstUnusedColor(usedColors: ActivityColor[]): ActivityColor {
  const unused = COLOR_OPTIONS.find((opt) => !usedColors.includes(opt.value));
  return unused?.value ?? COLOR_OPTIONS[0].value;
}
