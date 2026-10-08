"use client";

import { useEffect, useRef, useState } from "react";
import { Check, EyeOff, Lock, Pin, PinOff, Plus, Save, Trash2, X } from "lucide-react";
import type { NotePrivee } from "@/data/dossierPatient";

const AUTEUR = "Dr. Perche";

function aujourdhui() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

const nouvelId = () => `n-${Math.random().toString(36).slice(2, 9)}`;

interface ListProps {
  notes: NotePrivee[];
  onChange: (notes: NotePrivee[]) => void;
  /** Toast « Enregistrement réussi » de prod. */
  onSaved: () => void;
  onClose: () => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Version actuelle (prod) : grosse modale centrée, fond assombri, tableau
 * Date / Note, ligne en édition avec disquette + poubelle.
 * ──────────────────────────────────────────────────────────────────────────── */
export function NotesModalActuelle({ notes, onChange, onSaved, onClose }: ListProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const save = () => {
    if (!draft?.trim()) return;
    onChange([{ id: nouvelId(), date: aujourdhui(), auteur: AUTEUR, texte: draft.trim(), epinglee: false }, ...notes]);
    setDraft(null);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55" onClick={onClose}>
      <div className="w-[560px] rounded-lg bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[15px] font-semibold">Notes</span>
            <button onClick={() => setDraft("")} className="flex items-center gap-1 text-[13px] text-slate-700 hover:text-slate-900">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <table className="mt-4 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-slate-500">
              <th className="w-24 py-1.5 font-normal">Date</th>
              <th className="py-1.5 font-normal">Note</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {draft !== null && (
              <tr className="border-t border-slate-100">
                <td className="py-2">{aujourdhui()}</td>
                <td className="py-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    className="w-full rounded border border-slate-300 px-2 py-1 outline-none focus:border-slate-500"
                  />
                </td>
                <td className="py-2 text-right">
                  <span className="inline-flex gap-2">
                    {draft.trim() && (
                      <button onClick={save} className="text-slate-500 hover:text-slate-800" aria-label="Enregistrer">
                        <Save className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setDraft(null)} className="text-red-500" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </td>
              </tr>
            )}
            {notes.map((n) => (
              <tr key={n.id} className="border-t border-slate-100 hover:bg-slate-50" onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
                <td className="py-2.5">{n.date}</td>
                <td className="py-2.5">{n.texte}</td>
                <td className="py-2.5 text-right">
                  {hover === n.id && (
                    <button onClick={() => onChange(notes.filter((x) => x.id !== n.id))} className="text-red-500" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {notes.length === 0 && draft === null && (
              <tr>
                <td colSpan={3} className="border-t border-slate-100 py-3 text-slate-400">
                  Aucune note
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Proposition : un petit panneau ancré sous l'icône, sans fond assombri.
 * Saisie directe (Entrée), épingler / désépingler, suppression avec annulation.
 * ──────────────────────────────────────────────────────────────────────────── */
interface PopoverProps extends ListProps {
  masque: boolean;
  onMasque: (v: boolean) => void;
}

export function NotesPopover({ notes, onChange, onSaved, onClose, masque, onMasque }: PopoverProps) {
  const [draft, setDraft] = useState("");
  const [pinDraft, setPinDraft] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [supprimee, setSupprimee] = useState<{ note: NotePrivee; index: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ajouter = () => {
    if (!draft.trim()) return;
    onChange([{ id: nouvelId(), date: aujourdhui(), auteur: AUTEUR, texte: draft.trim(), epinglee: pinDraft }, ...notes]);
    setDraft("");
    setPinDraft(false);
    onSaved();
  };

  const majNote = (id: string, patch: Partial<NotePrivee>) => {
    onChange(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    onSaved();
  };

  const supprimer = (n: NotePrivee) => {
    setSupprimee({ note: n, index: notes.indexOf(n) });
    onChange(notes.filter((x) => x.id !== n.id));
  };

  const annuler = () => {
    if (!supprimee) return;
    const next = [...notes];
    next.splice(supprimee.index, 0, supprimee.note);
    onChange(next);
    setSupprimee(null);
  };

  const epinglees = notes.filter((n) => n.epinglee);
  const autres = notes.filter((n) => !n.epinglee);

  const row = (n: NotePrivee, pinned: boolean) => (
    <li key={n.id} className={`group relative rounded-lg px-2.5 py-2 ${pinned ? "bg-white shadow-[0_1px_2px_rgba(146,64,14,0.08)] hover:bg-amber-50/40" : "hover:bg-slate-50"}`}>
      {editId === n.id ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => {
            if (editText.trim() && editText.trim() !== n.texte) majNote(n.id, { texte: editText.trim() });
            setEditId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setEditId(null);
            }
          }}
          rows={2}
          className="w-full resize-none rounded-md border border-sky-300 px-2 py-1 text-[13px] outline-none ring-2 ring-sky-100"
        />
      ) : (
        <button
          onClick={() => {
            setEditId(n.id);
            setEditText(n.texte);
          }}
          className="block w-full pr-14 text-left text-[13px] leading-snug text-slate-800"
          title="Cliquer pour modifier"
        >
          {n.texte}
        </button>
      )}
      <div className="mt-0.5 text-[11px] text-slate-400">
        {n.date} · {n.auteur}
      </div>
      {editId !== n.id && (
        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => majNote(n.id, { epinglee: !n.epinglee })}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-amber-600"
            title={n.epinglee ? "Désépingler" : "Épingler sur la fiche"}
          >
            {n.epinglee ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => supprimer(n)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-red-500"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );

  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            <Lock className="h-3.5 w-3.5 text-slate-400" /> Notes privées
          </span>
          <span className="text-[11px] text-slate-400">Jamais visibles par le patient</span>
        </div>

        <div className="px-2.5 pt-2.5">
          <div className="flex items-start gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
            <textarea
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ajouter();
                }
              }}
              rows={1}
              placeholder="Nouvelle note… (Entrée)"
              className="field-sizing-content max-h-28 min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[13px] outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => setPinDraft((v) => !v)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${pinDraft ? "bg-amber-100 text-amber-700" : "text-slate-300 hover:text-slate-500"}`}
              title={pinDraft ? "Sera épinglée sur la fiche" : "Épingler sur la fiche"}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto px-1 pb-1.5 pt-1">
          {supprimee && (
            <div className="mx-1.5 my-1 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white">
              Note supprimée
              <button onClick={annuler} className="font-semibold text-sky-300 hover:text-sky-200">
                Annuler
              </button>
            </div>
          )}
          {epinglees.length > 0 && (
            <section className="mx-1.5 mt-1.5 rounded-lg bg-amber-50 p-1 ring-1 ring-amber-200/80">
              <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Pin className="h-3 w-3 fill-amber-500 text-amber-600" /> Épinglées sur la fiche
                <span className="ml-auto rounded-full bg-amber-200/70 px-1.5 text-[10px] text-amber-800">{epinglees.length}</span>
              </p>
              <ul className="space-y-0.5">{epinglees.map((n) => row(n, true))}</ul>
            </section>
          )}
          {autres.length > 0 && (
            <>
              {epinglees.length > 0 && (
                <div className="mx-3 mb-1 mt-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Autres notes
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px]">{autres.length}</span>
                </div>
              )}
              <ul>{autres.map((n) => row(n, false))}</ul>
            </>
          )}
          {notes.length === 0 && !supprimee && <p className="px-3 py-4 text-center text-[12px] text-slate-400">Aucune note pour ce patient</p>}
        </div>

        <label className="flex cursor-pointer items-center justify-between border-t border-slate-100 px-3.5 py-2 text-[12px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5" /> Flouter les notes épinglées (survol pour lire)
          </span>
          <input type="checkbox" checked={masque} onChange={(e) => onMasque(e.target.checked)} className="accent-slate-700" />
        </label>
      </div>
    </>
  );
}

/** Les notes épinglées, en une ligne discrète sous les alertes de la fiche. */
export function NotesEpinglees({ notes, masque, onOpen }: { notes: NotePrivee[]; masque: boolean; onOpen: () => void }) {
  const pins = notes.filter((n) => n.epinglee);
  if (pins.length === 0) return null;
  const shown = pins.slice(0, 2);
  return (
    <button onClick={onOpen} className="group mt-2 flex w-full flex-col items-start gap-1 text-left" title="Notes privées épinglées">
      {shown.map((n) => (
        <span
          key={n.id}
          className="flex max-w-full items-center gap-1.5 rounded-md border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[12px] text-amber-900 transition-colors group-hover:border-amber-300"
        >
          <Pin className="h-3 w-3 shrink-0 text-amber-500" />
          <span className={`truncate transition-[filter] duration-200 ${masque ? "blur-[4px] group-hover:blur-none" : ""}`}>{n.texte}</span>
        </span>
      ))}
      {pins.length > shown.length && <span className="pl-1 text-[11px] text-amber-700">+{pins.length - shown.length} épinglée{pins.length - shown.length > 1 ? "s" : ""}</span>}
    </button>
  );
}

/** Toast vert « Enregistrement réussi », comme en prod. Rejoué via la clé. */
export function ToastEnregistre({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <div key={n} className="saved-toast pointer-events-none fixed right-6 top-4 z-[70] flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700 shadow-md">
      <Check className="h-4 w-4" /> Enregistrement réussi
    </div>
  );
}
