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
  red: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-800",
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800 border-rose-300",
  },
  blue: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-800",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-300",
  },
  purple: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-800",
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800 border-violet-300",
  },
  gray: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-700",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-700 border-slate-300",
  },
};
