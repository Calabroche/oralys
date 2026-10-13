"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ListChecks, Minus, Package, PackageCheck, Plus, RotateCcw, ShoppingCart, Sparkles, Truck, X } from "lucide-react";
import { CATALOGUE, FOURNISSEURS, type ItemChecklist, type StatutCommande } from "@/data/dossierPatient";
import { materiel, useDossiers } from "@/context/DossiersContext";

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
  const { stock, ajusterStock, commandesCabinet, recommander } = useDossiers();

  const set = (id: string, patch: Partial<ItemChecklist>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const qte = (i: ItemChecklist) => i.quantite ?? i.commande?.quantite ?? 1;
  const reassortEnCours = (label: string) => commandesCabinet.some((c) => c.label === label && c.statut !== "recu");

  // Cocher le matériel = il a servi pendant le RDV : on le décompte du stock (et on le rend si on décoche).
  const toggleFait = (i: ItemChecklist) => {
    const m = materiel(i.label);
    const enAttente = i.commande && i.commande.statut !== "recu";
    if (m && !m.surMesure && !enAttente) ajusterStock(m.label, i.fait ? qte(i) : -qte(i));
    set(i.id, { fait: !i.fait });
  };

  /** Matériel du catalogue : on regarde le stock avant de déclencher une commande. */
  const ajouter = (label: string) => {
    if (!label.trim()) return;
    const m = materiel(label);
    const manque = m && (m.surMesure || (stock[m.label] ?? 0) < 1);
    onChange([
      ...items,
      {
        id: nouvelId(),
        label: m?.label ?? label.trim(),
        fait: false,
        quantite: m ? 1 : undefined,
        commande: m && manque ? { statut: "a-commander", quantite: 1, fournisseur: m.fournisseur } : undefined,
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
    set(i.id, { commande: { statut: "a-commander", quantite: qte(i), fournisseur: connu?.fournisseur ?? FOURNISSEURS[0] } });
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
                onClick={() => toggleFait(i)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${i.fait ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white hover:border-slate-500"}`}
                aria-label={i.fait ? "Marquer non fait" : "Marquer fait"}
              >
                {i.fait && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span className={`min-w-0 flex-1 truncate text-[13px] ${i.fait ? "text-slate-400 line-through" : "text-slate-800"}`}>
                {i.label}
                {i.selonActe && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[10px] text-violet-500" title={`Ajouté selon l'acte : ${i.selonActe}`}>
                    <Sparkles className="h-2.5 w-2.5" /> selon l&apos;acte
                  </span>
                )}
              </span>
              {!i.fait && <StockInfo item={i} qte={qte(i)} stock={stock} reassort={reassortEnCours(i.label)} onRecommander={recommander} />}

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
            <p className="px-2 py-1 text-[11px] text-slate-400">Matériel du cabinet · commandé seulement s&apos;il n&apos;y en a plus</p>
            {suggestions.map((c) => {
              const n = stock[c.label] ?? 0;
              const vide = c.surMesure || n === 0;
              return (
                <button
                  key={c.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => ajouter(c.label)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] ${vide ? "hover:bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <span className="flex items-center gap-2">
                    {vide ? <ShoppingCart className="h-3.5 w-3.5 text-amber-600" /> : <Package className="h-3.5 w-3.5 text-slate-400" />}
                    {c.label}
                  </span>
                  <span className={`text-[11px] ${vide ? "text-amber-700" : n <= c.seuil ? "text-amber-600" : "text-slate-400"}`}>
                    {c.surMesure ? "Sur mesure · à commander" : vide ? "Plus en stock · à commander" : `${n} en stock`}
                  </span>
                </button>
              );
            })}
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

/**
 * Ce qu'il reste au cabinet pour ce matériel. Assez : « ×1 · stock N ». Bientôt vide : « Reste 2 · penser
 * à recommander » (réassort du cabinet). Plus assez : le nombre restant, la commande est sur la ligne.
 */
function StockInfo({
  item,
  qte,
  stock,
  reassort,
  onRecommander,
}: {
  item: ItemChecklist;
  qte: number;
  stock: Record<string, number>;
  reassort: boolean;
  onRecommander: (label: string, n: number) => void;
}) {
  const m = materiel(item.label);
  if (!m || m.surMesure) return null;
  const n = stock[m.label] ?? 0;
  if (item.commande && item.commande.statut !== "recu") {
    return <span className={`shrink-0 text-[11px] tabular-nums ${n === 0 ? "text-red-600" : "text-slate-400"}`}>Reste {n}</span>;
  }
  if (n < qte) {
    return <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-red-700">Reste {n} · ×{qte} prévu</span>;
  }
  if (n - qte <= m.seuil) {
    return reassort ? (
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-sky-700">
        <RotateCcw className="h-3 w-3" /> Reste {n} · réassort demandé
      </span>
    ) : (
      <button
        onClick={() => onRecommander(m.label, Math.max(m.seuil * 2, qte))}
        className="flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 hover:bg-amber-100"
        title="Ajoute un réassort du cabinet dans le stock"
      >
        Reste {n} · penser à recommander
      </button>
    );
  }
  return <span className="shrink-0 text-[11px] tabular-nums text-slate-400">×{qte} · stock {n}</span>;
}
