"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check, Copy, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import { itemsStock, useDossiers } from "@/context/DossiersContext";
import { AUJOURDHUI_DEMO, TYPES_RDV, type StatutCommande } from "@/data/dossierPatient";
import { formatDateCourte } from "@/components/patients/format";
import { STATUTS } from "@/components/patients/Checklist";

type Ligne = ReturnType<typeof itemsStock>[number];

const DAY = 86_400_000;
const jours = (iso: string) => Math.round((Date.parse(iso) - Date.parse(AUJOURDHUI_DEMO)) / DAY);
const AUJOURDHUI_COURT = AUJOURDHUI_DEMO.slice(8, 10) + "/" + AUJOURDHUI_DEMO.slice(5, 7);

function Echeance({ l }: { l: Ligne }) {
  if (!l.rdv.date) return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">RDV à planifier</span>;
  const j = jours(l.rdv.date);
  if (l.commande.statut === "recu") return <span className="text-[12px] text-slate-400">{formatDateCourte(l.rdv.date)}</span>;
  const label = j < 0 ? "RDV passé" : j === 0 ? "Aujourd'hui" : j === 1 ? "Demain" : `Dans ${j} j`;
  const cls = j <= 1 ? "bg-red-100 text-red-700" : j <= 7 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
      <span className="text-[11px] text-slate-400">{formatDateCourte(l.rdv.date)}</span>
    </span>
  );
}

export default function StockPage() {
  const router = useRouter();
  const { patients, ouvrir, updateItem } = useDossiers();
  const [onglet, setOnglet] = useState<StatutCommande>("a-commander");
  const [praticien, setPraticien] = useState("tous");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ n: number; msg: string }>({ n: 0, msg: "" });

  const toutes = itemsStock(patients);
  const praticiens = [...new Set(toutes.map((l) => l.rdv.praticien))].sort();
  const lignes = toutes
    .filter((l) => praticien === "tous" || l.rdv.praticien === praticien)
    .sort((a, b) => (a.rdv.date ?? "9999").localeCompare(b.rdv.date ?? "9999"));
  const parStatut = (s: StatutCommande) => lignes.filter((l) => l.commande.statut === s);
  const urgents = lignes.filter((l) => l.commande.statut !== "recu" && l.rdv.date && jours(l.rdv.date) >= 0 && jours(l.rdv.date) <= 7);

  const notifier = (msg: string) => setToast((t) => ({ n: t.n + 1, msg }));
  const passer = (ls: Ligne[], statut: StatutCommande) => {
    ls.forEach((l) =>
      updateItem(l.patient.id, l.rdv.id, l.item.id, (i) => ({
        ...i,
        fait: statut === "recu" ? true : i.fait,
        commande: { ...i.commande!, statut, commandeLe: statut === "commande" ? AUJOURDHUI_COURT : i.commande!.commandeLe },
      }))
    );
    setSelection(new Set());
    notifier(statut === "commande" ? `${ls.length} article${ls.length > 1 ? "s" : ""} passé${ls.length > 1 ? "s" : ""} en commandé` : `${ls.length} article${ls.length > 1 ? "s" : ""} reçu${ls.length > 1 ? "s" : ""}`);
  };

  const ouvrirRdv = (l: Ligne) => {
    ouvrir(l.patient.id, l.rdv.id);
    router.push("/patients");
  };

  const toggleSel = (id: string) =>
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const ligneRow = (l: Ligne, opts: { select?: boolean; action?: React.ReactNode }) => (
    <tr key={l.item.id} className="group border-t border-slate-100 hover:bg-slate-50/70">
      {opts.select && (
        <td className="w-8 py-2.5 pl-4">
          <input type="checkbox" checked={selection.has(l.item.id)} onChange={() => toggleSel(l.item.id)} className="accent-slate-800" />
        </td>
      )}
      <td className={`py-2.5 ${opts.select ? "" : "pl-4"}`}>
        <div className="truncate pr-3 text-[13px] font-medium text-slate-800">{l.item.label}</div>
      </td>
      <td className="py-2.5 text-[13px] tabular-nums text-slate-700">×{l.commande.quantite}</td>
      <td className="py-2.5">
        <button onClick={() => ouvrirRdv(l)} className="group/link text-left">
          <div className="flex items-center gap-1 text-[13px] text-slate-800 group-hover/link:underline">
            {l.patient.prenom} <b>{l.patient.nom}</b>
            <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-0 group-hover/link:opacity-100" />
          </div>
          <div className="text-[11px] text-slate-500">
            {TYPES_RDV[l.rdv.type].label} · {l.rdv.praticien}
          </div>
        </button>
      </td>
      <td className="py-2.5">
        <Echeance l={l} />
      </td>
      <td className="py-2.5 pr-4 text-right">{opts.action}</td>
    </tr>
  );

  const fournisseurs = [...new Set(parStatut("a-commander").map((l) => l.commande.fournisseur))].sort();

  const KPIS = [
    { label: "À commander", n: parStatut("a-commander").length, icon: ShoppingCart, cls: "text-amber-700 bg-amber-50", tab: "a-commander" as const },
    { label: "Commandés, en attente", n: parStatut("commande").length, icon: Truck, cls: "text-sky-700 bg-sky-50", tab: "commande" as const },
    { label: "Urgents (RDV sous 7 j)", n: urgents.length, icon: AlertTriangle, cls: "text-red-700 bg-red-50", tab: "a-commander" as const },
    { label: "Reçus", n: parStatut("recu").length, icon: PackageCheck, cls: "text-emerald-700 bg-emerald-50", tab: "recu" as const },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-[1100px] px-8 pb-24 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Stock</h1>
            <p className="mt-1 text-[13px] text-slate-500">Le matériel marqué « à commander » dans les checklists des rendez-vous, regroupé par fournisseur.</p>
          </div>
          <select
            value={praticien}
            onChange={(e) => setPraticien(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none"
          >
            <option value="tous">Tous les praticiens</option>
            {praticiens.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {KPIS.map((k) => (
            <button
              key={k.label}
              onClick={() => setOnglet(k.tab)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.cls}`}>
                <k.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xl font-semibold tabular-nums text-slate-900">{k.n}</span>
                <span className="block text-[12px] text-slate-500">{k.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex gap-1 border-b border-slate-200">
          {(Object.keys(STATUTS) as StatutCommande[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setOnglet(s);
                setSelection(new Set());
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 text-[14px] transition-colors ${
                onglet === s ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {STATUTS[s].label}
              <span className={`rounded-full px-1.5 text-[11px] ${onglet === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>{parStatut(s).length}</span>
            </button>
          ))}
        </div>

        {onglet === "a-commander" && (
          <div className="mt-5 space-y-4">
            {fournisseurs.length === 0 && <Vide texte="Rien à commander. Tout le matériel des RDV est commandé." />}
            {fournisseurs.map((f) => {
              const ls = parStatut("a-commander").filter((l) => l.commande.fournisseur === f);
              const choisis = ls.filter((l) => selection.has(l.item.id));
              const cible = choisis.length ? choisis : ls;
              const urgent = ls.some((l) => l.rdv.date && jours(l.rdv.date) <= 1 && jours(l.rdv.date) >= 0);
              return (
                <section key={f} className="overflow-hidden rounded-xl border border-slate-200">
                  <header className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
                      {f}
                      <span className="text-[12px] font-normal text-slate-500">
                        {ls.length} article{ls.length > 1 ? "s" : ""}
                      </span>
                      {urgent && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Urgent</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const txt = `Commande ${f}\n` + cible.map((l) => `- ${l.item.label} ×${l.commande.quantite}`).join("\n");
                          navigator.clipboard?.writeText(txt).catch(() => {});
                          notifier("Liste copiée, prête à coller dans le bon de commande");
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copier la liste
                      </button>
                      <button
                        onClick={() => passer(cible, "commande")}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-700"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {choisis.length ? `Marquer commandé (${choisis.length})` : "Commande passée"}
                      </button>
                    </span>
                  </header>
                  <table className="w-full table-fixed">
                    <Colonnes select />
                    <tbody>{ls.map((l) => ligneRow(l, { select: true }))}</tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}

        {onglet === "commande" && (
          <Tableau lignes={parStatut("commande")} vide="Aucune commande en cours.">
            {(l) =>
              ligneRow(l, {
                action: (
                  <span className="flex items-center justify-end gap-3">
                    <span className="text-[11px] text-slate-400">
                      {l.commande.fournisseur}
                      {l.commande.commandeLe && ` · le ${l.commande.commandeLe}`}
                    </span>
                    <button
                      onClick={() => passer([l], "recu")}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      <Check className="h-3.5 w-3.5" /> Reçu
                    </button>
                  </span>
                ),
              })
            }
          </Tableau>
        )}

        {onglet === "recu" && (
          <Tableau lignes={parStatut("recu")} vide="Rien de reçu pour l'instant.">
            {(l) => ligneRow(l, { action: <span className="text-[11px] text-slate-400">{l.commande.fournisseur}</span> })}
          </Tableau>
        )}
      </div>

      {toast.n > 0 && (
        <div key={toast.n} className="saved-toast pointer-events-none fixed right-6 top-4 z-[70] flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-700 shadow-md">
          <Check className="h-4 w-4" /> {toast.msg}
        </div>
      )}
    </div>
  );
}

/** Largeurs fixes : les colonnes restent alignées d'un fournisseur à l'autre. */
function Colonnes({ select }: { select?: boolean }) {
  return (
    <colgroup>
      {select && <col className="w-10" />}
      <col />
      <col className="w-16" />
      <col className="w-[240px]" />
      <col className="w-[180px]" />
      <col className="w-[230px]" />
    </colgroup>
  );
}

function Tableau({ lignes, vide, children }: { lignes: Ligne[]; vide: string; children: (l: Ligne) => React.ReactNode }) {
  if (lignes.length === 0) return <div className="mt-5"><Vide texte={vide} /></div>;
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full table-fixed">
        <Colonnes />
        <tbody>{lignes.map(children)}</tbody>
      </table>
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-[13px] text-slate-400">{texte}</p>;
}
