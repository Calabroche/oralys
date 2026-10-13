"use client";

import { useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { AUJOURDHUI_DEMO, TYPES_RDV, type Rdv } from "@/data/dossierPatient";
import { formatDateCourte } from "@/components/patients/format";

type DevisLie = NonNullable<Rdv["devisLie"]>;

interface Props {
  rdv: Rdv;
  /** Nom de famille du patient, pour numéroter le devis comme la prod (Devis-NOM-AAMMJJ-1). */
  nomPatient: string;
  /** Devis du plan de traitement auquel ce RDV appartient déjà (étape d'un devis existant). */
  devisExistant?: { id: string; praticien: string };
  onCreate: (devis: DevisLie, note: string) => void;
  onNote: (note: string) => void;
}

/**
 * Section « Devis » de la fiche du RDV, comme dans la prod : le devis lié, et « Ajouter » pour en créer un
 * vierge rattaché à ce rendez-vous. Le devis porte la ligne « Rendez-vous #1 » (motif, durée, note) : la note
 * saisie là est la note du RDV, celle qu'affiche sa carte.
 */
export function DevisRdv({ rdv, nomPatient, devisExistant, onCreate, onNote }: Props) {
  const [creation, setCreation] = useState(false);
  const [note, setNote] = useState(rdv.note ?? "");
  const [editNote, setEditNote] = useState(false);
  const type = TYPES_RDV[rdv.type];
  const lie = rdv.devisLie;
  const aUnDevis = Boolean(lie || devisExistant);
  const numero = `Devis-${nomPatient.toUpperCase()}-${AUJOURDHUI_DEMO.slice(2).replaceAll("-", "")}-1`;

  const ligneRdv = (onSave: () => void, bouton: string) => (
    <div className="mt-2 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-semibold text-slate-800">Rendez-vous #1</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${type.pill}`}>{type.label}</span>
        <span className="rounded-md border border-slate-200 px-2 py-0.5 tabular-nums text-slate-600">{rdv.duree}</span>
        <span className="text-slate-500">minutes</span>
        <input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="Notes…"
          className="min-w-40 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[13px] outline-none focus:border-sky-400"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => {
            setCreation(false);
            setEditNote(false);
            setNote(rdv.note ?? "");
          }}
          className="rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100"
        >
          Annuler
        </button>
        <button onClick={onSave} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-500">
          {bouton}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-slate-200 px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
          <FileText className="h-4 w-4" /> Devis
        </span>
        {!aUnDevis && !creation && (
          <button onClick={() => setCreation(true)} className="flex items-center gap-1 text-[13px] text-slate-600 hover:text-slate-900">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        )}
      </div>

      {devisExistant && (
        <p className="mt-2 text-[13px] text-slate-700">
          <span className="font-medium">{devisExistant.id}</span> · {devisExistant.praticien} <span className="text-amber-600">● En attente de confirmation</span>
        </p>
      )}
      {lie && (
        <p className="mt-2 text-[13px] text-slate-700">
          {formatDateCourte(lie.date)} <span className="font-medium">{lie.id}</span>{" "}
          <span className={lie.statut === "accepte" ? "text-emerald-600" : "text-amber-600"}>● {lie.statut === "accepte" ? "Accepté" : "En attente de confirmation"}</span>
        </p>
      )}

      {/* Note du rendez-vous : affichée sur la carte du RDV. */}
      {aUnDevis && !editNote && (
        <button onClick={() => setEditNote(true)} className="mt-1 flex items-center gap-1.5 text-left text-[13px] text-slate-500 hover:text-slate-800">
          <Pencil className="h-3 w-3" /> {rdv.note ? <>Note du RDV : <span className="text-slate-700">{rdv.note}</span></> : "Ajouter une note au rendez-vous"}
        </button>
      )}
      {aUnDevis &&
        editNote &&
        ligneRdv(() => {
          onNote(note.trim());
          setEditNote(false);
        }, "Enregistrer")}

      {!aUnDevis && !creation && <p className="mt-1 text-[12px] text-slate-400">Aucun devis lié à ce rendez-vous.</p>}
      {creation && (
        <>
          <p className="mt-2 text-[12px] text-slate-500">
            Nouveau devis vierge <span className="font-medium text-slate-700">{numero}</span>, rattaché à ce rendez-vous.
          </p>
          {ligneRdv(() => {
            onCreate({ id: numero, date: AUJOURDHUI_DEMO, statut: "attente" }, note.trim());
            setCreation(false);
          }, "Créer le devis")}
        </>
      )}
    </div>
  );
}
