"use client";

import { ClipboardPlus, Euro, FileCheck, Files, FlaskConical, ShoppingCart, Truck } from "lucide-react";
import { TYPES_RDV, type Pastille, type Rdv } from "@/data/dossierPatient";
import { DentsChips } from "@/components/patients/DentsChips";
import { resumeDents } from "@/lib/dents";
import { fusionZones, groupesGestes, type GroupeGeste } from "@/components/patients/gestes";
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
  // Sous le type : seulement les dents concernées (tous actes confondus) ; avec plusieurs actes, une pastille
  // « N actes » dont le détail (acte · dents) s'ouvre au survol. La carte ne grandit pas.
  const groupes = groupesGestes(rdv);
  const zoneTotale = groupes.reduce((z, g) => fusionZones(z, g.zone), { dents: [] } as GroupeGeste["zone"]);
  const detailActes: { label: string; zone?: GroupeGeste["zone"] }[] = rdv.gestes?.length
    ? groupes
    : rdv.actes.length > 1
      ? rdv.actes.map((a) => ({ label: a.libelle, zone: { dents: a.dents } }))
      : [];
  const nbActes = rdv.gestes?.length ? rdv.gestes.length : rdv.actes.length;
  const showLine = avecDents && (aUneZone({ label: "", zone: zoneTotale }, sextants) || nbActes > 1);
  // Matériel en attente pour ce RDV : à commander (orange) ou commandé pas encore reçu (bleu).
  const enAttente = (rdv.checklist ?? []).filter((i) => i.commande && i.commande.statut !== "recu");
  const aCommander = enAttente.some((i) => i.commande!.statut === "a-commander");
  // Proposition : initiales du praticien en haut à droite, et la note du RDV (saisie à sa création ou dans le devis) à la place de son nom.
  const initiales = initialesPraticien(rdv.praticien);
  const note = rdv.note;

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
          <div className="flex items-start justify-between gap-2">
            {rdv.date ? (
              <div className="text-[13px] font-semibold text-slate-900">
                {formatDateCourte(rdv.date)} · {rdv.heure}
              </div>
            ) : (
              <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white">Planifier</span>
            )}
            {avecDents && (
              <span title={rdv.praticien} className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-slate-600">
                {initiales}
              </span>
            )}
          </div>
          <div className="text-[13px] text-slate-700">
            {type.label} <span className="text-slate-400">· {rdv.duree}min</span>
          </div>
          {showLine && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {aUneZone({ label: "", zone: zoneTotale }, sextants) && <DentsChips zone={zoneTotale} masquerBouche sextants={sextants} max={4} />}
              {nbActes > 1 && (
                <span className="group/actes relative shrink-0">
                  <span className="flex h-[18px] items-center rounded border border-slate-300 bg-white px-1 text-[11px] font-medium text-slate-600 group-hover/actes:border-slate-400">
                    {nbActes} actes
                  </span>
                  <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[320px] flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg group-hover/actes:flex">
                    {detailActes.map((g, i) => (
                      <span key={i} className="flex min-w-0 items-center gap-1.5">
                        <LigneGeste g={{ label: g.label, zone: g.zone ?? { dents: [] } }} sextants={sextants} />
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </div>
          )}
          <div className="mt-0.5 flex items-end justify-between gap-2">
            {!avecDents ? (
              <span className="text-[13px] text-slate-700">{rdv.praticien}</span>
            ) : note ? (
              // Note du RDV en version courte ; au survol, la note entière dans une bulle (comme « +1 acte »).
              <span className="group/note relative min-w-0">
                <span className="block truncate text-[12px] italic text-slate-500">{courte(note)}</span>
                {note.length > NOTE_COURTE && (
                  <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-max max-w-[300px] whitespace-normal rounded-lg border border-slate-200 bg-white p-2 text-[12px] leading-snug text-slate-700 shadow-lg group-hover/note:block">
                    {note}
                  </span>
                )}
              </span>
            ) : (
              // Pas de note : rien, la ligne garde juste les pastilles à droite.
              <span />
            )}
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

const aUneZone = (g: GroupeGeste, sextants: boolean) => resumeDents(g.zone, { sextants }).some((c) => c.kind !== "bouche");

/** « Acte · dents », sur une ligne : le texte se tronque, les pastilles de dents restent entières. */
function LigneGeste({ g, sextants }: { g: GroupeGeste; sextants: boolean }) {
  const zone = aUneZone(g, sextants);
  return (
    <>
      {g.label && (
        <span className="truncate text-[12px] text-slate-500" title={g.label}>
          {g.label}
        </span>
      )}
      {g.label && zone && <span className="text-[12px] text-slate-300">·</span>}
      {zone && <DentsChips zone={g.zone} masquerBouche sextants={sextants} />}
    </>
  );
}

/** Longueur de la note affichée sur la carte, au-delà on coupe avec « … » (la note entière est au survol). */
const NOTE_COURTE = 42;
const courte = (t: string) => (t.length > NOTE_COURTE ? `${t.slice(0, NOTE_COURTE).trimEnd()}…` : t);

/** « Dr. Flore Perche » → « FP ». */
function initialesPraticien(nom: string) {
  return nom
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => m[0].toUpperCase())
    .join("")
    .slice(0, 3);
}
