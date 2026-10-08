import { resumeDents, type DentChip, type ZoneRdv } from "@/lib/dents";

const CHIP_STYLE: Record<DentChip["kind"], string> = {
  dent: "border-sky-300 bg-sky-50 text-sky-800",
  plage: "border-sky-300 bg-sky-50 text-sky-800",
  sextant: "border-indigo-300 bg-indigo-50 text-indigo-800",
  quadrant: "border-indigo-300 bg-indigo-50 text-indigo-800",
  arcade: "border-indigo-300 bg-indigo-50 text-indigo-800",
  site: "border-amber-300 bg-amber-50 text-amber-800",
  bouche: "border-slate-300 bg-slate-50 text-slate-700",
};

function ToothGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" aria-hidden>
      <path
        d="M2.2 2.4C2.2 1.5 3 1 3.9 1.1 4.7 1.2 5.2 1.6 6 1.6S7.3 1.2 8.1 1.1C9 1 9.8 1.5 9.8 2.4c0 1.4-.6 2.3-.8 3.5-.2 1.4-.3 4.9-1.3 4.9-.9 0-.8-3-1.7-3s-.8 3-1.7 3c-1 0-1.1-3.5-1.3-4.9-.2-1.2-.8-2.1-.8-3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface Props {
  zone: ZoneRdv;
  /** Au-delà, on replie en « +N » (le détail reste au survol). */
  max?: number;
  size?: "sm" | "md";
  /** Sur la carte RDV, la bouche entière (détartrage, bilan…) ne porte pas de numéro. */
  masquerBouche?: boolean;
  /** Découpage en sextants : seulement pour la paro (facturée par sextant). */
  sextants?: boolean;
}

export function DentsChips({ zone, max = 3, size = "sm", masquerBouche = false, sextants = true }: Props) {
  const chips = resumeDents(zone, { sextants }).filter((c) => !(masquerBouche && c.kind === "bouche"));
  if (chips.length === 0) return null;
  const shown = chips.length > max ? chips.slice(0, max - 1) : chips;
  const hidden = chips.slice(shown.length);
  const base =
    size === "sm"
      ? "h-[18px] gap-0.5 rounded px-1 text-[11px]"
      : "h-6 gap-1 rounded-md px-1.5 text-xs";

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {shown.map((c, i) => (
        <span key={c.label} title={c.title} className={`inline-flex items-center border font-medium tabular-nums ${base} ${CHIP_STYLE[c.kind]}`}>
          {i === 0 && c.kind !== "site" && <ToothGlyph />}
          {c.label}
        </span>
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.map((c) => c.title).join(" · ")}
          className={`inline-flex items-center border border-slate-300 bg-white font-medium text-slate-600 ${base}`}
        >
          +{hidden.length}
        </span>
      )}
    </span>
  );
}
