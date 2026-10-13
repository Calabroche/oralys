"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, Lock, Pin, PinOff, Plus, Save, Trash2, Users, X } from "lucide-react";
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
 * Proposition : rien sur la fiche, un aperçu au survol de l'icône, et un petit
 * panneau au clic. Le panneau sert d'abord à écrire (saisie en focus auto) : les
 * notes déjà enregistrées y sont floutées par sécurité, « Afficher » les révèle.
 * ──────────────────────────────────────────────────────────────────────────── */
export function NotesPopover({ notes, onChange, onSaved, onClose }: ListProps) {
  const [draft, setDraft] = useState("");
  const [pinDraft, setPinDraft] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [supprimee, setSupprimee] = useState<{ note: NotePrivee; index: number } | null>(null);
  // Masquées à chaque ouverture : un écran partagé ou vu par le patient ne montre rien par défaut.
  const [visibles, setVisibles] = useState(false);
  const [onglet, setOnglet] = useState<"privees" | "ops">("privees");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ajouter = () => {
    if (!draft.trim()) return;
    const note: NotePrivee = { id: nouvelId(), date: aujourdhui(), auteur: AUTEUR, texte: draft.trim(), epinglee: pinDraft, operationnelle: onglet === "ops" };
    onChange([note, ...notes]);
    // Une note privée rejoint les autres, masquées : on l'affiche ensuite si on le souhaite.
    if (onglet === "privees") setVisibles(false);
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

  const privees = notes.filter((n) => !n.operationnelle);
  const ops = notes.filter((n) => n.operationnelle);
  const liste = onglet === "ops" ? ops : privees;
  // Seules les notes privées sont masquées : les opérationnelles servent à toute l'équipe.
  const masque = onglet === "privees" && !visibles;
  const epinglees = liste.filter((n) => n.epinglee);
  const autres = liste.filter((n) => !n.epinglee);

  const changerOnglet = (o: "privees" | "ops") => {
    setOnglet(o);
    setEditId(null);
    inputRef.current?.focus();
  };

  const row = (n: NotePrivee, pinned: boolean) => (
    <li key={n.id} className="group relative rounded-lg px-2.5 py-2 hover:bg-slate-50">
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
            if (masque) return setVisibles(true);
            setEditId(n.id);
            setEditText(n.texte);
          }}
          className={`block w-full pr-14 text-left text-[13px] leading-snug text-slate-800 transition-[filter] duration-200 ${masque ? "select-none blur-[5px]" : ""}`}
          title={masque ? "Cliquer pour afficher les notes" : "Cliquer pour modifier"}
        >
          {n.texte}
        </button>
      )}
      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
        {pinned && <Pin className="h-2.5 w-2.5 text-amber-400" />}
        {n.date} · {n.auteur}
      </div>
      {editId !== n.id && !masque && (
        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => majNote(n.id, { epinglee: !n.epinglee })}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-amber-600"
            title={n.epinglee ? "Désépingler" : "Épingler en tête"}
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
        <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-[12px]">
            {(
              [
                ["privees", "Privées", privees.length],
                ["ops", "Opérationnelles", ops.length],
              ] as const
            ).map(([id, label, n]) => (
              <button
                key={id}
                onClick={() => changerOnglet(id)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${onglet === id ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {id === "privees" && <Lock className="h-3 w-3" />}
                {label}
                <span className="text-[10px] tabular-nums text-slate-400">{n}</span>
              </button>
            ))}
          </div>
          {onglet === "privees" && privees.length > 0 && (
            <button
              onClick={() => setVisibles((v) => !v)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title={visibles ? "Masquer les notes privées" : "Afficher les notes privées"}
            >
              {visibles ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {visibles ? "Masquer" : "Afficher"}
            </button>
          )}
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
              placeholder={onglet === "ops" ? "Note pour l'équipe… (Entrée)" : "Note privée… (Entrée)"}
              // Note privée : le texte se floute pendant la frappe (écran partagé, patient à côté). L'opérationnelle reste lisible.
              className={`field-sizing-content max-h-28 min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[13px] outline-none placeholder:text-slate-400 ${onglet === "privees" && draft ? "blur-[4px]" : ""}`}
            />
            <button
              onClick={() => setPinDraft((v) => !v)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${pinDraft ? "bg-amber-100 text-amber-700" : "text-slate-300 hover:text-slate-500"}`}
              title={pinDraft ? "Sera épinglée en tête" : "Épingler en tête"}
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
            <>
              <Separateur label="Épinglées" count={epinglees.length} />
              <ul>{epinglees.map((n) => row(n, true))}</ul>
            </>
          )}
          {autres.length > 0 && (
            <>
              {epinglees.length > 0 && <Separateur label="Autres notes" count={autres.length} />}
              <ul>{autres.map((n) => row(n, false))}</ul>
            </>
          )}
          {liste.length === 0 && !supprimee && (
            <p className="px-3 py-4 text-center text-[12px] text-slate-400">
              {onglet === "ops" ? "Aucune note opérationnelle (préférences, paiement, accueil…)" : "Aucune note privée"}
            </p>
          )}
        </div>

        <p className="flex items-center gap-1.5 border-t border-slate-100 px-3.5 py-2 text-[11px] text-slate-400">
          {onglet === "ops" ? (
            <>
              <Users className="h-3 w-3" /> Visibles par toute l&apos;équipe, jamais par le patient.
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Jamais visibles par le patient. Masquées à chaque ouverture.
            </>
          )}
        </p>
      </div>
    </>
  );
}

/** Petit intertitre discret entre les groupes de notes. */
function Separateur({ label, count }: { label: string; count: number }) {
  return (
    <div className="mx-2.5 mb-0.5 mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-400">
      {label}
      <span className="h-px flex-1 bg-slate-100" />
      <span className="text-[10px] tabular-nums">{count}</span>
    </div>
  );
}

/**
 * Aperçu au survol de l'icône : les notes opérationnelles en clair, les privées floutées
 * (on descend la souris sur une note pour la lire). Un clic ouvre le panneau.
 */
export function NotesApercu({ notes, onOpen }: { notes: NotePrivee[]; onOpen: () => void }) {
  if (notes.length === 0) return null;
  const tri = (l: NotePrivee[]) => [...l].sort((a, b) => Number(b.epinglee) - Number(a.epinglee));
  const ops = tri(notes.filter((n) => n.operationnelle)).slice(0, 3);
  const privees = tri(notes.filter((n) => !n.operationnelle)).slice(0, 3);
  const caches = notes.length - ops.length - privees.length;

  const ligne = (n: NotePrivee, flou: boolean) => (
    <li key={n.id}>
      <button onClick={onOpen} className="group flex w-full gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px] leading-snug text-slate-800 hover:bg-slate-50">
        {n.epinglee ? <Pin className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /> : <span className="w-3 shrink-0 text-center text-slate-300">•</span>}
        <span className={`line-clamp-2 ${flou ? "select-none blur-[4px] transition-[filter] duration-150 group-hover:select-text group-hover:blur-none" : ""}`}>{n.texte}</span>
      </button>
    </li>
  );

  return (
    // pt-2 plutôt que mt-2 : la marge reste survolable, l'aperçu ne se ferme pas en descendant.
    <div className="absolute right-0 top-full z-50 w-[300px] pt-2">
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-1 duration-100">
        {ops.length > 0 && (
          <>
            <p className="flex items-center gap-1.5 px-1.5 pb-0.5 text-[11px] font-medium text-slate-400">
              <Users className="h-3 w-3" /> Opérationnelles
            </p>
            <ul className="space-y-0.5">{ops.map((n) => ligne(n, false))}</ul>
          </>
        )}
        {privees.length > 0 && (
          <>
            <p className={`flex items-center gap-1.5 px-1.5 pb-0.5 text-[11px] font-medium text-slate-400 ${ops.length ? "mt-1.5" : ""}`}>
              <Lock className="h-3 w-3" /> Privées · survoler pour lire
            </p>
            <ul className="space-y-0.5">{privees.map((n) => ligne(n, true))}</ul>
          </>
        )}
        <p className="px-1.5 pt-1 text-[11px] text-slate-400">
          {caches > 0 ? `+${caches} autre${caches > 1 ? "s" : ""} · ` : ""}Cliquer pour ajouter une note
        </p>
      </div>
    </div>
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
