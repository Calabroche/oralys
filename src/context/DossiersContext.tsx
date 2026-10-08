"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { PATIENTS, type ItemChecklist, type Patient, type Rdv } from "@/data/dossierPatient";

export const allRdvs = (p: Patient) => [...p.rdvs, ...(p.devis?.etapes ?? [])];

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
}

const Ctx = createContext<DossiersValue | null>(null);

export function DossiersProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(() => structuredClone(PATIENTS));
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDossiers() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDossiers doit être utilisé dans <DossiersProvider>");
  return v;
}

/** Tous les items marqués « à commander », à plat, pour le hub stock. */
export function itemsStock(patients: Patient[]) {
  return patients.flatMap((p) =>
    allRdvs(p).flatMap((r) =>
      (r.checklist ?? []).filter((i) => i.commande).map((i) => ({ item: i, commande: i.commande!, rdv: r, patient: p }))
    )
  );
}
