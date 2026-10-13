"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { AUJOURDHUI_DEMO, TYPES_RDV, type Rdv } from "@/data/dossierPatient";

const DUREES = [15, 30, 45, 60, 90, 120];

interface Props {
  praticiens: string[];
  onCreate: (rdv: Rdv) => void;
  onClose: () => void;
}

/** Création rapide d'un RDV depuis le dossier patient : l'essentiel, le reste se complète dans la fiche du RDV. */
export function NouveauRdvPopover({ praticiens, onCreate, onClose }: Props) {
  const [type, setType] = useState<keyof typeof TYPES_RDV>("consult");
  const [date, setDate] = useState(AUJOURDHUI_DEMO);
  const [heure, setHeure] = useState("09:00");
  const [duree, setDuree] = useState(30);
  const [praticien, setPraticien] = useState(praticiens[0] ?? "");
  const [motif, setMotif] = useState("");
  const [note, setNote] = useState("");
  const [aPlanifier, setAPlanifier] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const creer = () =>
    onCreate({
      id: `new-${Math.random().toString(36).slice(2, 9)}`,
      date: aPlanifier ? null : date,
      heure: aPlanifier ? undefined : heure,
      duree,
      type,
      praticien,
      zone: { dents: [] },
      motif: motif.trim(),
      note: note.trim() || undefined,
      pastilles: [],
      actes: [],
    });

  const champ = "h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100";
  const label = "mb-1 block text-[11px] font-medium text-slate-500";

  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            <CalendarPlus className="h-4 w-4 text-slate-500" /> Nouveau rendez-vous
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div>
            <span className={label}>Type</span>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TYPES_RDV) as (keyof typeof TYPES_RDV)[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full px-2.5 py-0.5 text-[12px] transition-colors ${type === t ? TYPES_RDV[t].pill + " ring-1 ring-slate-400" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {TYPES_RDV[t].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Motif</span>
            <input
              autoFocus
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && creer()}
              placeholder="Ex. Couronne, douleur au froid…"
              className={champ}
            />
          </div>

          <div>
            <span className={label}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Affichée sur la carte du RDV" className={champ} />
          </div>

          <div className={`grid grid-cols-[1fr_88px] gap-2 ${aPlanifier ? "opacity-40" : ""}`}>
            <label>
              <span className={label}>Date</span>
              <input type="date" value={date} disabled={aPlanifier} onChange={(e) => setDate(e.target.value)} className={champ} />
            </label>
            <label>
              <span className={label}>Heure</span>
              <input type="time" value={heure} disabled={aPlanifier} onChange={(e) => setHeure(e.target.value)} className={champ} />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
            <input type="checkbox" checked={aPlanifier} onChange={(e) => setAPlanifier(e.target.checked)} className="accent-slate-700" />
            À planifier plus tard
          </label>

          <div className="grid grid-cols-[1fr_88px] gap-2">
            <label>
              <span className={label}>Praticien</span>
              <select value={praticien} onChange={(e) => setPraticien(e.target.value)} className={champ}>
                {praticiens.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Durée</span>
              <select value={duree} onChange={(e) => setDuree(Number(e.target.value))} className={champ}>
                {DUREES.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3.5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100">
            Annuler
          </button>
          <button onClick={creer} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-slate-700">
            Créer le RDV
          </button>
        </div>
      </div>
    </>
  );
}
