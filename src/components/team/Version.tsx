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
    title: "Qui est là, qui manque, qui remplace",
    pitch: "Gérer les comptes, les absences et les équipes des praticiens, voir les manques et remplacer les absents.",
    problem: "Aujourd'hui, les absences vivent dans un tableau à part, l'alerte passe par téléphone et les remplacements se font de tête.",
    canDo: [
      "Créer, inviter, archiver ou réactiver un utilisateur (un email déjà pris est bloqué)",
      "Retrouver tout ce qui concerne une personne dans son profil : horaires habituels, absences et, pour un praticien, sa semaine type venue de Soins et son équipe rattachée",
      "Dans Soins, régler pour chaque praticien le nombre d'assistants par type d'activité (ex. bloc 4 pour Dr Martin) : avec sa semaine type, Team en déduit le besoin de chaque demi-journée",
      "Déclarer une absence partout (planning, profil, tableau de bord), la valider ou la refuser : onglets « Demandes à valider » et « Toutes les absences »",
      "Voir qui est présent chaque jour et avec qui travaille chaque praticien, par personne ou par équipe ; un manque est signalé, sans action possible (le combler arrive en V1)",
      "Se mettre sur son profil en quelques secondes (changer d'utilisateur par code PIN), avec son nom affiché en haut de l'écran",
      "Être alerté d'une absence de dernier moment, et fermer l'agenda Soins d'un praticien absent",
      "Voir le planning sur un nombre de jours au choix (2, 3, 5, 10 ou 15), en plus de Jour / Semaine / Mois — même sélecteur dans l'agenda Soins",
      "Tableau de bord : présents aujourd'hui, utilisateurs actifs, absences de dernier moment, et le trombinoscope du cabinet",
      "La secrétaire voit tout le planning mais ne peut rien y valider : lecture seule, à part déclarer sa propre absence",
      "Trombinoscope ouvert à tous ; un clic ouvre le récap : poste, date d'entrée, avec qui la personne travaille, téléphone, missions de la fiche de poste, et pour le gestionnaire et les praticiens assiduité, congés, salaire et primes",
      "Dossier du personnel (Administration → Dossiers du personnel) : contrat, rémunération (brut, net, brut annuel) et primes, missions de la fiche de poste, rappels RH, documents ; chacun voit le sien en lecture seule",
      "Congés payés : 25 jours fixes pour tous les salariés, jours pris et solde calculés tout seuls depuis les congés validés",
    ],
    tryHref: "/team/planning?view=binomes",
    screens: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25, 26, 27, 28, 29, 30, 36, 37, 38, 39, 40, 41, 43, 44, 53, 54, 55, 56, 59, 60, 61, 66, 67, 68, 69, 70],
  },
  {
    id: "v1",
    label: "V1",
    title: "Intelligence et conformité",
    pitch: "Des remplaçants mieux choisis, des droits sur mesure et une trace de chaque action.",
    problem: "Les remplacements fonctionnent : il faut les rendre plus justes et savoir qui a fait quoi.",
    canDo: [
      "Combler un manque depuis le planning : affecter un assistant, déplacer depuis un autre praticien, récupérer un prêt, retirer une absence ou confirmer qu'un assistant de moins suffit ; onglet « Manques à couvrir »",
      "Réaffecter les RDV d'un assistant absent (onglet « À remplacer »), reprogrammer un RDV ou le maintenir sans assistant",
      "Tableau de bord complet : « À traiter », manques d'assistants et RDV patients à réaffecter",
      "Semaine type et « Cette semaine » des collaborateurs, semaine par semaine (fiche, récap du trombinoscope, Planning → Semaines types), avec les jours modifiés à part",
      "Horaires et semaine type remplis par le gestionnaire, ou par le praticien pour les assistants et aides dentaires (secrétaire et comptable : le gestionnaire seulement) ; la personne les voit en lecture seule",
      "Titulaire au cabinet mais sur autre chose que le fauteuil (plage « FSE test », stérilisation…) : en orange chez son praticien, le back-up choisi prend sa place sur ce créneau",
      "Missions suivies (chaque jour, semaine ou mois), à contrôler, taux sur 8 semaines du vert au rouge jusque sur le trombinoscope, missions types, rappels dans la cloche et dans le planning",
      "Recadrages et modèles de documents (1:1, entretien annuel, entretien professionnel, recadrage, fiches de poste) dans le dossier",
      "Classer les remplaçants par score d'affinité, avec le détail du pourquoi, et voir les affinités sur la fiche praticien",
      "Voir le meilleur assistant suggéré au moment de prendre un RDV dans Soins",
      "Créer des rôles et régler les droits dans une grille",
      "Suivre toutes les actions dans le journal d'audit",
      "Régler les postes partagés (PIN obligatoire, verrouillage automatique) et tracer l'opérateur de stérilisation",
    ],
    tryHref: "/team/planning?tab=remplacer",
    screens: [11, 19, 20, 21, 31, 32, 33, 34, 35],
  },
  {
    id: "v2",
    label: "V2",
    title: "Le collaborateur",
    pitch: "Chacun renseigne ses compétences et ses préférences d'équipe.",
    problem: "Le collaborateur devient acteur de son planning, au lieu de le subir.",
    canDo: [
      "Renseigner ses compétences et ses actes préférés",
      "Dire avec qui l'on préfère travailler, de façon confidentielle",
    ],
    tryHref: "/team/moi",
    screens: [42],
  },
  {
    id: "v3",
    label: "V3",
    title: "Temps de travail",
    pitch: "Chacun pointe son arrivée, ses pauses et son départ ; les heures et heures sup se calculent seules.",
    problem: "Aujourd'hui, la clinique pointe avec des bipeurs : les heures ne sont reliées ni au planning, ni aux absences, ni au contrat.",
    canDo: [
      "Pointer son arrivée, sa pause, sa reprise et son départ depuis son poste, confirmé par son code PIN",
      "Voir les heures de chacun par semaine, comparées à son contrat",
      "Repérer les heures supplémentaires et les anomalies : départ oublié, pause trop courte, journée trop longue",
      "Corriger un pointage oublié, avec une trace dans le journal d'audit",
      "Préparer la paie : récapitulatif du mois (heures, heures sup à 25 et 50 %, absences) et export CSV",
    ],
    tryHref: "/team/temps",
    screens: [49, 57, 50, 51, 52, 58],
  },
  {
    id: "v4",
    label: "V4",
    title: "Agenda multi-salles",
    pitch: "Un praticien qui tient 2 salles en même temps (ex. anesthésie en bloc pendant un contrôle express) est enfin montré tel quel.",
    problem: "Soins ne pensait qu'une salle par praticien : un vrai chevauchement de salles s'affichait comme une collision illisible, et Team comptait un seul assistant là où il en fallait deux en même temps.",
    canDo: [
      "Poser un créneau de semaine type dans une salle précise, quand le praticien en a plusieurs (pas de limite à 2)",
      "Voir les salles qui se chevauchent côte à côte dans la semaine type et l'agenda Soins, pas superposées",
      "Nouvelle vue Activité dans Soins : le journal du jour en une colonne, comme le vrai produit, avec les salles en parallèle visibles au même instant",
      "Choisir la salle à la prise de RDV dans Soins, avec un défaut selon l'acte",
      "Le besoin en assistants de Team compte les salles tenues en parallèle, pas seulement la plus grosse activité du moment",
      "Dans le planning, savoir qui va dans quelle salle : chaque salle a sa propre carte avec ses assistants affectés, au lieu d'un seul total pour toute la demi-journée",
      "La vue Jour du planning détaille aussi par salle, en grand — une carte spacieuse par salle plutôt qu'une case tassée dans la grille semaine",
      "La fiche du praticien (jours de travail et besoin en assistants) éclate par salle de la même façon",
    ],
    tryHref: "/team/soins",
    screens: [62, 63, 64, 65],
  },
];

/** Version à partir de laquelle chaque fonctionnalité existe. */
export const FEATURES = {
  binomes: "mvp",
  equipes: "mvp",
  /** Combler un manque, onglets « Manques à couvrir » et « À remplacer » (grisés en MVP). */
  remplacements: "v1",
  /** Tableau de bord : « À traiter », manques d'assistants, RDV à réaffecter. */
  pilotage: "v1",
  /** Semaine type et « Cette semaine » des collaborateurs, onglet Semaines types, semaines modifiées. */
  semaineType: "v1",
  /** Missions suivies : fréquence, contrôle, taux, missions types, rappels. */
  missionsSuivies: "v1",
  recadrages: "v1",
  modeles: "v1",
  affinite: "v1",
  suggestionSoins: "v1",
  droitsSoins: "v1",
  sterilisation: "v1",
  roles: "v1",
  journal: "v1",
  postes: "v1",
  profil: "v2",
  pointage: "v3",
  multiSalles: "v4",
} as const satisfies Record<string, Version>;

export type Feature = keyof typeof FEATURES;

const ORDER: Version[] = ["mvp", "v1", "v2", "v3", "v4"];

/**
 * Le 28/09, l'ancienne V1 a été fusionnée dans le MVP et les versions suivantes renumérotées
 * (V2 → V1, V3 → V2, V4 → V3). Une démo déjà ouverte garde sa place dans la frise.
 */
const RENUMBERED: Record<string, Version> = { mvp: "mvp", v1: "mvp", v2: "v1", v3: "v2", v4: "v3" };
function initialVersion(): Version {
  try {
    const old = window.localStorage.getItem("oralys-ui-version");
    if (old) return RENUMBERED[JSON.parse(old)] ?? "v4";
  } catch {
    // Pas d'ancienne valeur lisible.
  }
  return "v4";
}
export const versionOf = (id: Version) => VERSIONS.find((v) => v.id === id)!;

interface VersionContextValue {
  version: Version;
  setVersion: (v: Version) => void;
  has: (f: Feature) => boolean;
}

const VersionContext = createContext<VersionContextValue | null>(null);

export function VersionProvider({ children }: { children: ReactNode }) {
  // Par défaut, tout est visible (dernière version).
  const [version, setVersion] = usePersistentState<Version>("version-v2", initialVersion);
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
