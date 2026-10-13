"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  AUJOURDHUI_DEMO,
  CATALOGUE,
  KITS,
  PATIENTS,
  type ItemChecklist,
  type Materiel,
  type Patient,
  type Rdv,
  type StatutCommande,
} from "@/data/dossierPatient";

export const allRdvs = (p: Patient) => [...p.rdvs, ...(p.devis?.etapes ?? [])];

const normalise = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const materiel = (label: string): Materiel | undefined => CATALOGUE.find((c) => normalise(c.label) === normalise(label));

/** Commande de réassort passée depuis l'inventaire, sans RDV derrière. */
export interface CommandeCabinet {
  id: string;
  label: string;
  quantite: number;
  fournisseur: string;
  statut: StatutCommande;
  commandeLe?: string;
}

/**
 * Ajoute à la checklist le matériel prévu pour les actes du RDV (voir KITS), sans doublon.
 * Stock insuffisant ou pièce sur mesure : l'item part directement « à commander ».
 * RDV passé : le matériel est considéré comme utilisé.
 */
function avecKits(rdv: Rdv, stock: Record<string, number>): Rdv {
  const besoins = new Map<string, { quantite: number; acte: string }>();
  for (const a of rdv.actes) {
    for (const k of KITS[a.code] ?? []) {
      const b = besoins.get(k.label);
      besoins.set(k.label, { quantite: (b?.quantite ?? 0) + k.quantite, acte: b?.acte ?? a.libelle });
    }
  }
  const items = rdv.checklist ?? [];
  const passe = !!rdv.date && rdv.date < AUJOURDHUI_DEMO;
  const ajouts: ItemChecklist[] = [];
  for (const [label, b] of besoins) {
    if (items.some((i) => normalise(i.label) === normalise(label))) continue;
    const m = materiel(label)!;
    const manque = m.surMesure || (stock[m.label] ?? 0) < b.quantite;
    ajouts.push({
      id: `kit-${rdv.id}-${ajouts.length}`,
      label: m.label,
      fait: passe,
      quantite: b.quantite,
      selonActe: b.acte,
      commande: !passe && manque ? { statut: "a-commander", quantite: b.quantite, fournisseur: m.fournisseur } : undefined,
    });
  }
  return ajouts.length ? { ...rdv, checklist: [...items, ...ajouts] } : rdv;
}

function initial() {
  const stock = Object.fromEntries(CATALOGUE.map((c) => [c.label, c.stock]));
  const patients = structuredClone(PATIENTS).map((p) => ({
    ...p,
    // Plus récent en haut, comme dans la liste des RDV du dossier.
    rdvs: p.rdvs.map((r) => avecKits(r, stock)).sort((x, y) => (y.date ?? "").localeCompare(x.date ?? "")),
    devis: p.devis && { ...p.devis, etapes: p.devis.etapes.map((r) => avecKits(r, stock)) },
  }));
  return { patients, stock };
}

interface DossiersValue {
  patients: Patient[];
  setPatients: Dispatch<SetStateAction<Patient[]>>;
  /** Patient et RDV ouverts dans le dossier : gardés quand on passe par le hub stock. */
  patientId: string;
  rdvId: string;
  ouvrir: (patientId: string, rdvId?: string) => void;
  setRdvId: (id: string) => void;
  updateRdv: (patientId: string, rdvId: string, fn: (r: Rdv) => Rdv) => void;
  updateItem: (patientId: string, rdvId: string, itemId: string, fn: (i: ItemChecklist) => ItemChecklist) => void;
  /** Quantités en stock au cabinet, par libellé du catalogue. */
  stock: Record<string, number>;
  /** + à la réception d'une commande, – quand on coche le matériel utilisé dans un RDV. */
  ajusterStock: (label: string, delta: number) => void;
  commandesCabinet: CommandeCabinet[];
  recommander: (label: string, quantite: number) => void;
  majCommandeCabinet: (id: string, statut: StatutCommande, commandeLe?: string) => void;
}

const Ctx = createContext<DossiersValue | null>(null);

export function DossiersProvider({ children }: { children: ReactNode }) {
  const [init] = useState(initial);
  const [patients, setPatients] = useState<Patient[]>(init.patients);
  const [stock, setStock] = useState<Record<string, number>>(init.stock);
  const [commandesCabinet, setCommandesCabinet] = useState<CommandeCabinet[]>([]);
  const [patientId, setPatientId] = useState("dray");
  const [rdvId, setRdvId] = useState("dray-1");

  const updateRdv = (pid: string, rid: string, fn: (r: Rdv) => Rdv) =>
    setPatients((ps) =>
      ps.map((p) =>
        p.id !== pid
          ? p
          : {
              ...p,
              rdvs: p.rdvs.map((r) => (r.id === rid ? fn(r) : r)),
              devis: p.devis && { ...p.devis, etapes: p.devis.etapes.map((r) => (r.id === rid ? fn(r) : r)) },
            }
      )
    );

  const value: DossiersValue = {
    patients,
    setPatients,
    patientId,
    rdvId,
    setRdvId,
    ouvrir: (pid, rid) => {
      setPatientId(pid);
      setRdvId(rid ?? allRdvs(patients.find((p) => p.id === pid)!)[0].id);
    },
    updateRdv,
    updateItem: (pid, rid, iid, fn) =>
      updateRdv(pid, rid, (r) => ({ ...r, checklist: (r.checklist ?? []).map((i) => (i.id === iid ? fn(i) : i)) })),
    stock,
    ajusterStock: (label, delta) => {
      const m = materiel(label);
      if (!m || m.surMesure) return;
      setStock((s) => ({ ...s, [m.label]: Math.max(0, (s[m.label] ?? 0) + delta) }));
    },
    commandesCabinet,
    recommander: (label, quantite) => {
      const m = materiel(label);
      if (!m) return;
      setCommandesCabinet((cs) => [
        ...cs,
        { id: `cab-${Math.random().toString(36).slice(2, 9)}`, label: m.label, quantite, fournisseur: m.fournisseur, statut: "a-commander" },
      ]);
    },
    majCommandeCabinet: (id, statut, commandeLe) =>
      setCommandesCabinet((cs) => cs.map((c) => (c.id === id ? { ...c, statut, commandeLe: commandeLe ?? c.commandeLe } : c))),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDossiers() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDossiers doit être utilisé dans <DossiersProvider>");
  return v;
}

/** Une ligne du hub stock : matériel d'un RDV (patient + RDV) ou réassort du cabinet. */
export interface LigneStock {
  id: string;
  label: string;
  quantite: number;
  fournisseur: string;
  statut: StatutCommande;
  commandeLe?: string;
  patient?: Patient;
  rdv?: Rdv;
}

/** Tout ce qui est commandé ou à commander, à plat : checklists des RDV puis réassort du cabinet. */
export function lignesStock(patients: Patient[], cabinet: CommandeCabinet[] = []): LigneStock[] {
  const rdvs = patients.flatMap((p) =>
    allRdvs(p).flatMap((r) =>
      (r.checklist ?? [])
        .filter((i) => i.commande)
        .map((i) => ({ id: i.id, label: i.label, ...i.commande!, patient: p, rdv: r }))
    )
  );
  return [...rdvs, ...cabinet];
}

/** Matériel prévu dans les RDV à venir, pas encore utilisé : ce que le stock doit couvrir. */
export function besoinsAVenir(patients: Patient[]) {
  const besoins: Record<string, number> = {};
  for (const p of patients)
    for (const r of allRdvs(p)) {
      if (r.date && r.date < AUJOURDHUI_DEMO) continue;
      for (const i of r.checklist ?? []) {
        const m = materiel(i.label);
        if (!m || i.fait) continue;
        besoins[m.label] = (besoins[m.label] ?? 0) + (i.quantite ?? i.commande?.quantite ?? 1);
      }
    }
  return besoins;
}
