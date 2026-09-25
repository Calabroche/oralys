import { cn } from "@/lib/utils";

/** Logotype Oralys (approximation du pictogramme) : deux gouttes empilées + mot-symbole. */
export function OralysLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-[1.6rem] leading-none font-semibold tracking-tight text-slate-900", className)}>
      <svg viewBox="0 0 16 24" className="h-6 w-4" aria-hidden>
        <circle cx="8" cy="6.5" r="5.5" fill="currentColor" />
        <circle cx="8" cy="17.5" r="5.5" fill="currentColor" />
        <rect x="5.5" y="9" width="5" height="6" fill="white" rx="2.5" />
      </svg>
      oralys
    </span>
  );
}
