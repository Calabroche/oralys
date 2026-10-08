"use client";

import { ClipboardPlus, Euro, FileCheck, Files, FlaskConical, ShoppingCart, Truck } from "lucide-react";
import { TYPES_RDV, type Pastille, type Rdv } from "@/data/dossierPatient";
import { DentsChips } from "@/components/patients/DentsChips";
import { resumeDents } from "@/lib/dents";
import { formatDateCourte } from "@/components/patients/format";

const PASTILLES: Record<Pastille, { icon: typeof Euro; className: string; title: string }> = {
  "paiement-du": { icon: Euro, className: "bg-red-300 text-red-800", title: "Paiement dû" },
  "paiement-ok": { icon: Euro, className: "bg-emerald-200 text-emerald-800", title: "Réglé" },
  ordonnance: { icon: ClipboardPlus, className: "bg-red-300 text-red-800", title: "Ordonnance à faire" },
  document: { icon: Files, className: "bg-slate-300 text-slate-700", title: "Documents" },
  fse: { icon: FileCheck, className: "bg-slate-300 text-slate-700", title: "FSE" },
  labo: { icon: FlaskConical, className: "bg-yellow-200 text-yellow-800", title: "Travail labo" },
};

interface Props {
  rdv: Rdv;
  selected: boolean;
  /** false = la carte telle qu'elle existe aujourd'hui en prod, pour comparer. */
  avecDents: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
}

export function RdvCard({ rdv, selected, avecDents, onSelect, onHover }: Props) {
  const type = TYPES_RDV[rdv.type];
  // La bouche entière (détartrage, bilan…) ne porte pas de numéro sur la carte : « Détartrage » tout court.
  const sextants = rdv.type === "paro";
  const hasZone = resumeDents(rdv.zone, { sextants }).some((c) => c.kind !== "bouche");
  const showLine = avecDents && (hasZone || rdv.motif);
  // Matériel en attente pour ce RDV : à commander (orange) ou commandé pas encore reçu (bleu).
  const enAttente = (rdv.checklist ?? []).filter((i) => i.commande && i.commande.statut !== "recu");
  const aCommander = enAttente.some((i) => i.commande!.statut === "a-commander");

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`relative w-full rounded-lg border border-l-4 bg-white py-2.5 pl-4 pr-3 text-left transition-all ${type.border} ${selected ? "border-y-sky-400 border-r-sky-400 shadow-[0_0_0_1px_rgb(56_189_248)]" : "border-y-slate-200 border-r-slate-200 shadow-sm hover:shadow-md"}`}
    >
      <div className="flex items-start gap-2">
        {rdv.etape && <span className="pt-0.5 text-xs text-slate-500">{rdv.etape}</span>}
        <div className="min-w-0 flex-1">
          {rdv.date ? (
            <div className="text-[13px] font-semibold text-slate-900">
              {formatDateCourte(rdv.date)} · {rdv.heure}
            </div>
          ) : (
            <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white">Planifier</span>
          )}
          <div className="text-[13px] text-slate-700">
            {type.label} <span className="text-slate-400">· {rdv.duree}min</span>
          </div>
          {showLine && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {rdv.motif && (
                <span className="truncate text-[12px] text-slate-500" title={rdv.motif}>
                  {rdv.motif}
                </span>
              )}
              {rdv.motif && hasZone && <span className="text-[12px] text-slate-300">·</span>}
              {hasZone && <DentsChips zone={rdv.zone} masquerBouche sextants={sextants} />}
            </div>
          )}
          <div className="mt-0.5 flex items-end justify-between gap-2">
            <span className="text-[13px] text-slate-700">{rdv.praticien}</span>
            <span className="flex shrink-0 gap-1">
              {enAttente.length > 0 && (
                <span
                  title={`${enAttente.length} matériel${enAttente.length > 1 ? "s" : ""} ${aCommander ? "à commander" : "commandé"}${enAttente.length > 1 ? "s" : ""}`}
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${aCommander ? "bg-amber-200 text-amber-800" : "bg-sky-200 text-sky-800"}`}
                >
                  {aCommander ? <ShoppingCart className="h-3 w-3" strokeWidth={2.5} /> : <Truck className="h-3 w-3" strokeWidth={2.5} />}
                </span>
              )}
              {rdv.pastilles.map((p) => {
                const { icon: Icon, className, title } = PASTILLES[p];
                return (
                  <span key={p} title={title} className={`flex h-5 w-5 items-center justify-center rounded-full ${className}`}>
                    <Icon className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                );
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
