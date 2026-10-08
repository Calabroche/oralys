"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ListChecks, Minus, Package, PackageCheck, Plus, ShoppingCart, Truck, X } from "lucide-react";
import { CATALOGUE, FOURNISSEURS, type ItemChecklist, type StatutCommande } from "@/data/dossierPatient";

export const STATUTS: Record<StatutCommande, { label: string; chip: string; icon: typeof Package }> = {
  "a-commander": { label: "À commander", chip: "border-amber-300 bg-amber-50 text-amber-800", icon: ShoppingCart },
  commande: { label: "Commandé", chip: "border-sky-300 bg-sky-50 text-sky-800", icon: Truck },
  recu: { label: "Reçu", chip: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: PackageCheck },
};

const normalise = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const nouvelId = () => `ck-${Math.random().toString(36).slice(2, 9)}`;

interface Props {
  items: ItemChecklist[];
  onChange: (items: ItemChecklist[]) => void;
}

export function Checklist({ items, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState(false);

  const set = (id: string, patch: Partial<ItemChecklist>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const ajouter = (label: string, fournisseur?: string) => {
    if (!label.trim()) return;
    onChange([
      ...items,
      {
        id: nouvelId(),
        label: label.trim(),
        fait: false,
        commande: fournisseur ? { statut: "a-commander", quantite: 1, fournisseur } : undefined,
      },
    ]);
    setDraft("");
  };

  const toggleCommande = (i: ItemChecklist) => {
    if (i.commande) {
      if (i.commande.statut === "a-commander") set(i.id, { commande: undefined });
      return;
    }
    const connu = CATALOGUE.find((c) => normalise(c.label) === normalise(i.label));
    set(i.id, { commande: { statut: "a-commander", quantite: 1, fournisseur: connu?.fournisseur ?? FOURNISSEURS[0] } });
  };

  const suggestions = draft.trim().length >= 2 ? CATALOGUE.filter((c) => normalise(c.label).includes(normalise(draft.trim()))).slice(0, 5) : [];
  const faits = items.filter((i) => i.fait).length;
  const enStock = items.filter((i) => i.commande && i.commande.statut !== "recu").length;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
          <ListChecks className="h-4 w-4" /> Checklist
          {items.length > 0 && (
            <span className="text-[12px] font-normal text-slate-400">
              {faits}/{items.length}
            </span>
          )}
        </span>
        {enStock > 0 && (
          <Link href="/stock" className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800">
            {enStock} en attente dans le stock <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <ul className="mt-2 space-y-0.5">
        {items.map((i) => {
          const st = i.commande && STATUTS[i.commande.statut];
          return (
            <li key={i.id} className="group flex min-h-9 items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-50">
              <button
                onClick={() => set(i.id, { fait: !i.fait })}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${i.fait ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white hover:border-slate-500"}`}
                aria-label={i.fait ? "Marquer non fait" : "Marquer fait"}
              >
                {i.fait && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span className={`min-w-0 flex-1 truncate text-[13px] ${i.fait ? "text-slate-400 line-through" : "text-slate-800"}`}>{i.label}</span>

              {i.commande && st && (
                <span className="flex shrink-0 items-center gap-1.5">
                  {i.commande.statut === "a-commander" ? (
                    <>
                      <span className="flex items-center rounded-md border border-slate-200 bg-white">
                        <button
                          onClick={() => set(i.id, { commande: { ...i.commande!, quantite: Math.max(1, i.commande!.quantite - 1) } })}
                          className="px-1 py-0.5 text-slate-400 hover:text-slate-700"
                          aria-label="Moins"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-[12px] tabular-nums">{i.commande.quantite}</span>
                        <button
                          onClick={() => set(i.id, { commande: { ...i.commande!, quantite: i.commande!.quantite + 1 } })}
                          className="px-1 py-0.5 text-slate-400 hover:text-slate-700"
                          aria-label="Plus"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                      <select
                        value={i.commande.fournisseur}
                        onChange={(e) => set(i.id, { commande: { ...i.commande!, fournisseur: e.target.value } })}
                        className="h-6 rounded-md border border-slate-200 bg-white px-1 text-[12px] text-slate-600 outline-none"
                      >
                        {FOURNISSEURS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      ×{i.commande.quantite} · {i.commande.fournisseur}
                    </span>
                  )}
                  <button
                    onClick={() => toggleCommande(i)}
                    disabled={i.commande.statut !== "a-commander"}
                    title={i.commande.statut === "a-commander" ? "Retirer du stock" : undefined}
                    className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium ${st.chip} ${i.commande.statut === "a-commander" ? "hover:border-amber-400" : "cursor-default"}`}
                  >
                    <st.icon className="h-3 w-3" />
                    {st.label}
                    {i.commande.commandeLe && i.commande.statut === "commande" && <span className="font-normal opacity-70">le {i.commande.commandeLe}</span>}
                    {i.commande.statut === "a-commander" && <X className="h-3 w-3 opacity-0 group-hover:opacity-60" />}
                  </button>
                </span>
              )}

              {!i.commande && (
                <button
                  onClick={() => toggleCommande(i)}
                  className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-dashed border-slate-300 px-1.5 text-[11px] text-slate-500 opacity-0 transition-opacity hover:border-amber-400 hover:text-amber-700 group-hover:opacity-100"
                >
                  <ShoppingCart className="h-3 w-3" /> À commander
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="relative mt-1">
        <div className="flex items-center gap-2 px-1.5 py-1">
          <Plus className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ajouter(draft);
              if (e.key === "Escape") setDraft("");
            }}
            placeholder="Ajouter une action ou du matériel…"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
          />
        </div>
        {focus && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-2 py-1 text-[11px] text-slate-400">Matériel du catalogue · ajouté directement à commander</p>
            {suggestions.map((c) => (
              <button
                key={c.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ajouter(c.label, c.fournisseur)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-amber-50"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
                  {c.label}
                </span>
                <span className="text-[11px] text-slate-400">{c.fournisseur}</span>
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => ajouter(draft)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter « {draft.trim()} » comme simple action
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
