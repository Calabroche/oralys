"use client";

import { ReactNode, createContext, useContext } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check, Map as MapIcon, Rocket } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePersistentState } from "@/lib/persist";
import { cn } from "@/lib/utils";

/**
 * Découpage de la démo par version livrée. Le sélecteur (menu utilisateur) masque ce qui n'existe pas
 * encore dans la version choisie : on raconte la montée en puissance du module sur une seule démo.
 */
export type Version = "mvp" | "v1" | "v2" | "v3" | "v4";

export interface VersionInfo {
  id: Version;
  label: string;
  title: string;
  /** Une phrase, affichée sous la version dans le sélecteur. */
  pitch: string;
  /** Le problème du cabinet que cette version règle. */
  problem: string;
  /** Ce qu'on peut faire dans la démo à partir de cette version (ajouts par rapport à la précédente). */
  canDo: string[];
  /** Page où commencer la démonstration de cette version. */
  tryHref: string;
  /** Numéros des maquettes Figma de cette version. */
  screens: number[];
}

export const VERSIONS: VersionInfo[] = [
  {
    id: "mvp",
    label: "MVP",
    title: "Qui est là, qui manque",
    pitch: "Gérer les comptes et les absences, voir qui est présent, être alerté au dernier moment.",
    problem: "Aujourd'hui, les absences vivent dans un tableau à part et l'alerte passe par téléphone.",
    canDo: [
      "Créer, inviter, archiver ou réactiver un utilisateur (un email déjà pris est bloqué)",
      "Déclarer une absence, la valider ou la refuser, l'annuler ou retirer un seul jour",
      "Voir qui est présent chaque jour dans le planning par personne",
      "Se mettre sur son profil en quelques secondes (changer d'utilisateur par code PIN), avec son nom affiché en haut de l'écran",
      "Être alerté d'une absence de dernier moment, et fermer l'agenda Soins d'un praticien absent",
    ],
    tryHref: "/team",
    screens: [1, 3, 4, 5, 6, 7, 9, 22, 23, 24, 25, 26, 27, 28, 29, 30, 37, 38, 39, 40, 41, 53, 54, 55],
  },
  {
    id: "v1",
    label: "V1",
    title: "Binômes et remplacements",
    pitch: "Savoir qui travaille avec quel praticien, repérer les manques et remplacer les absents.",
    problem: "On sait qui est absent, mais pas qui travaille avec quel praticien ni qui peut le remplacer.",
    canDo: [
      "Définir l'équipe de chaque praticien : titulaires, back-ups, besoin en assistants",
      "Voir les binômes du jour et les manques dans la vue Binômes",
      "Agir sur un manque : récupérer un assistant prêté, en prêter un pour la journée, ou accepter moins d'assistants ce jour-là",
      "Réaffecter les RDV d'un assistant absent avec des remplaçants classés par règles, ou reprogrammer le RDV",
    ],
    tryHref: "/team/planning?view=binomes",
    screens: [2, 8, 43, 44, 10, 12, 13, 14, 15, 16, 17, 18, 36, 56],
  },
  {
    id: "v2",
    label: "V2",
    title: "Intelligence et conformité",
    pitch: "Des remplaçants mieux choisis, des droits sur mesure et une trace de chaque action.",
    problem: "Les remplacements fonctionnent : il faut les rendre plus justes et savoir qui a fait quoi.",
    canDo: [
      "Classer les remplaçants par score d'affinité, avec le détail du pourquoi",
      "Voir le meilleur assistant suggéré au moment de prendre un RDV dans Soins",
      "Créer des rôles et régler les droits dans une grille",
      "Suivre toutes les actions dans le journal d'audit",
      "Régler les postes partagés (PIN obligatoire, verrouillage automatique) et tracer l'opérateur de stérilisation",
    ],
    tryHref: "/team/remplacements",
    screens: [11, 19, 20, 21, 31, 32, 33, 34, 35],
  },
  {
    id: "v3",
    label: "V3",
    title: "Le collaborateur",
    pitch: "Chacun renseigne ses disponibilités, ses compétences et ses préférences.",
    problem: "Le collaborateur devient acteur de son planning, au lieu de le subir.",
    canDo: [
      "Renseigner ses disponibilités, ses compétences et ses actes préférés",
      "Donner ses préférences de binôme, gardées confidentielles",
    ],
    tryHref: "/team/moi",
    screens: [42],
  },
  {
    id: "v4",
    label: "V4",
    title: "Temps de travail",
    pitch: "Chacun pointe son arrivée, ses pauses et son départ ; les heures et heures sup se calculent seules.",
    problem: "Aujourd'hui, la clinique pointe avec des bipeurs : les heures ne sont reliées ni au planning, ni aux absences, ni au contrat.",
    canDo: [
      "Pointer son arrivée, sa pause, sa reprise et son départ depuis son poste, confirmé par son code PIN",
      "Voir les heures de chacun par semaine, comparées à son contrat",
      "Repérer les heures supplémentaires et les anomalies : départ oublié, pause trop courte, journée trop longue",
      "Corriger un pointage oublié, avec une trace dans le journal d'audit",
    ],
    tryHref: "/team/temps",
    screens: [49, 50, 51, 52],
  },
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
  pointage: "v4",
} as const satisfies Record<string, Version>;

export type Feature = keyof typeof FEATURES;

const ORDER: Version[] = ["mvp", "v1", "v2", "v3", "v4"];
export const versionOf = (id: Version) => VERSIONS.find((v) => v.id === id)!;

interface VersionContextValue {
  version: Version;
  setVersion: (v: Version) => void;
  has: (f: Feature) => boolean;
}

const VersionContext = createContext<VersionContextValue | null>(null);

export function VersionProvider({ children }: { children: ReactNode }) {
  // Par défaut, tout est visible (dernière version).
  const [version, setVersion] = usePersistentState<Version>("version", "v4");
  const has = (f: Feature) => ORDER.indexOf(version) >= ORDER.indexOf(FEATURES[f]);
  return <VersionContext.Provider value={{ version, setVersion, has }}>{children}</VersionContext.Provider>;
}

export function useVersion(): VersionContextValue {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
}

/** Liste des nouveautés d'une version, pour le message de bascule et la pastille. */
export function CanDoList({ info, className }: { info: VersionInfo; className?: string }) {
  return (
    <ul className={cn("space-y-1", className)}>
      {info.canDo.map((c) => (
        <li key={c} className="flex gap-1.5">
          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          <span>{c}</span>
        </li>
      ))}
    </ul>
  );
}

/** Change de version et explique en une phrase ce que l'on peut maintenant montrer. */
export function useSwitchVersion() {
  const { setVersion } = useVersion();
  return (id: Version) => {
    const info = versionOf(id);
    const previous = ORDER.indexOf(id) > 0 ? versionOf(ORDER[ORDER.indexOf(id) - 1]) : null;
    setVersion(id);
    toast(`Démo en ${info.label} · ${info.title}`, {
      description: (
        <div className="mt-1 space-y-1.5 text-xs text-slate-600">
          <p>{previous ? `En plus du ${previous.label}, vous pouvez :` : "Vous pouvez :"}</p>
          <CanDoList info={info} />
        </div>
      ),
      duration: 9000,
    });
  };
}

/** Pastille de version dans l'en-tête : un clic rappelle ce que la version permet de montrer. */
export function VersionBadge() {
  const { version } = useVersion();
  const info = versionOf(version);
  const switchVersion = useSwitchVersion();
  const index = ORDER.indexOf(version);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white hover:bg-slate-700"
          title="Version de la démo : cliquer pour voir ce qu'elle permet"
        >
          {info.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Démo en {info.label}</p>
        <p className="mt-0.5 font-semibold text-slate-900">{info.title}</p>
        <p className="mt-1 text-sm text-slate-600">{info.problem}</p>
        <p className="mt-3 text-xs font-medium text-slate-500">{index > 0 ? `En plus du ${versionOf(ORDER[index - 1]).label}, on peut :` : "On peut :"}</p>
        <CanDoList info={info} className="mt-1.5 text-sm text-slate-700" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" asChild>
            <Link href={info.tryHref}>
              Commencer la démo ici <ArrowRight />
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/team/feuille-de-route">
              <MapIcon /> Feuille de route
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex gap-1 border-t pt-3">
          {VERSIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => switchVersion(v.id)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                v.id === version ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Page ou bloc pas encore livré dans la version choisie (lien direct, favori…). */
export function VersionGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { has } = useVersion();
  const switchVersion = useSwitchVersion();
  if (has(feature)) return <>{children}</>;
  const target = versionOf(FEATURES[feature]);
  return (
    <div className="mx-auto max-w-lg px-8 py-24 text-center">
      <Rocket className="mx-auto size-8 text-pink-500" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Arrive en {target.label}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {target.title} : {target.pitch}
      </p>
      <Button className="mt-6" onClick={() => switchVersion(target.id)}>
        Passer la démo en {target.label}
      </Button>
    </div>
  );
}
