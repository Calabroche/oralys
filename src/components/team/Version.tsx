"use client";

import { ReactNode, createContext, useContext } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersistentState } from "@/lib/persist";
import { cn } from "@/lib/utils";

/**
 * Découpage de la démo par version livrée. Le sélecteur (menu utilisateur) masque ce qui n'existe pas
 * encore dans la version choisie : on raconte la montée en puissance du module sur une seule démo.
 */
export type Version = "mvp" | "v1" | "v2" | "v3";

export const VERSIONS: { id: Version; label: string; title: string; pitch: string }[] = [
  { id: "mvp", label: "MVP", title: "Qui est là, qui manque", pitch: "Utilisateurs, absences, planning par personne, alertes de dernier moment vers Soins." },
  { id: "v1", label: "V1", title: "Binômes et remplacements", pitch: "Équipes des praticiens, vue Binômes, manques, prêts du jour, remplaçants classés par règles." },
  { id: "v2", label: "V2", title: "Intelligence et conformité", pitch: "Score d'affinité, suggestion dans Soins, rôles configurables, journal d'audit, postes partagés." },
  { id: "v3", label: "V3", title: "Le collaborateur", pitch: "Mon profil : disponibilités, compétences, préférences de binôme." },
];

/** Version à partir de laquelle chaque fonctionnalité existe. */
export const FEATURES = {
  binomes: "v1",
  equipes: "v1",
  remplacements: "v1",
  affinite: "v2",
  suggestionSoins: "v2",
  droitsSoins: "v2",
  sterilisation: "v2",
  roles: "v2",
  journal: "v2",
  postes: "v2",
  profil: "v3",
} as const satisfies Record<string, Version>;

export type Feature = keyof typeof FEATURES;

const ORDER: Version[] = ["mvp", "v1", "v2", "v3"];
export const versionOf = (id: Version) => VERSIONS.find((v) => v.id === id)!;

interface VersionContextValue {
  version: Version;
  setVersion: (v: Version) => void;
  has: (f: Feature) => boolean;
}

const VersionContext = createContext<VersionContextValue | null>(null);

export function VersionProvider({ children }: { children: ReactNode }) {
  // Par défaut, tout est visible (dernière version).
  const [version, setVersion] = usePersistentState<Version>("version", "v3");
  const has = (f: Feature) => ORDER.indexOf(version) >= ORDER.indexOf(FEATURES[f]);
  return <VersionContext.Provider value={{ version, setVersion, has }}>{children}</VersionContext.Provider>;
}

export function useVersion(): VersionContextValue {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
}

/** Pastille de version, affichée dans l'en-tête pendant une présentation. */
export function VersionBadge({ className }: { className?: string }) {
  const { version } = useVersion();
  return (
    <span className={cn("rounded-full bg-slate-900 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white", className)}>
      {versionOf(version).label}
    </span>
  );
}

/** Page ou bloc pas encore livré dans la version choisie (lien direct, favori…). */
export function VersionGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { has, setVersion } = useVersion();
  if (has(feature)) return <>{children}</>;
  const target = versionOf(FEATURES[feature]);
  return (
    <div className="mx-auto max-w-lg px-8 py-24 text-center">
      <Rocket className="mx-auto size-8 text-pink-500" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Arrive en {target.label}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {target.title} : {target.pitch}
      </p>
      <Button className="mt-6" onClick={() => setVersion(target.id)}>
        Passer la démo en {target.label}
      </Button>
    </div>
  );
}
