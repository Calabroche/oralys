"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/context/TeamDataContext";
import { PERMISSIONS } from "@/data/teamMockData";
import { fullName, roleNames } from "@/lib/team";
import { PermissionId } from "@/types/team";

/**
 * Qui voit quoi dans Team, déduit des droits (pas des noms de rôles) : si le gestionnaire
 * donne un droit à quelqu'un dans la grille, la section apparaît pour lui.
 * Assistants et aides dentaires, sans ces droits, voient le planning en lecture seule.
 */
export const ACCESS = {
  /** Tableau de bord (résumé de la journée) : gestionnaires, et les praticiens pour leur propre résumé. */
  tableau: ["param.cabinet", "param.praticien"],
  /** Modifier le planning, valider les demandes, voir les tensions. */
  planning: ["team.planning"],
  /** Onglet « À remplacer » du planning, reprogrammation de RDV et onglet « À traiter ». */
  remplacements: ["team.planning", "rdv"],
  /** Équipes des praticiens (titulaires, back-ups, besoin). Un praticien accède aussi à sa propre fiche. */
  equipes: ["team.planning", "param.cabinet"],
  /** Gestion des comptes utilisateurs. */
  utilisateurs: ["param.cabinet"],
  /** Prise de RDV dans Soins. */
  rdv: ["rdv"],
  /** Journal d'audit. */
  audit: ["team.audit"],
  /** Onglet Administration : gestion des comptes, ou au moins le journal. */
  administration: ["param.cabinet", "team.audit"],
} as const satisfies Record<string, PermissionId[]>;

export type AccessKey = keyof typeof ACCESS;

export function useAccess() {
  const { can, profiles, sessionUserId } = useTeam();
  const ownsProfile = profiles.some((p) => p.praticienUserId === sessionUserId);
  return (key: AccessKey) => ACCESS[key].some((p) => can(p)) || (key === "equipes" && ownsProfile);
}

/** Page réservée : on explique pourquoi plutôt que d'afficher une page cassée. */
export function AccessGate({ access, children }: { access: AccessKey; children: ReactNode }) {
  const allowed = useAccess();
  const { sessionUser, roles } = useTeam();
  if (allowed(access)) return <>{children}</>;
  const labels = ACCESS[access].map((id) => `« ${PERMISSIONS.find((p) => p.id === id)?.label ?? id} »`).join(" ou ");
  return (
    <div className="mx-auto max-w-lg px-8 py-24 text-center">
      <Lock className="mx-auto size-8 text-slate-400" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Section réservée</h1>
      <p className="mt-1 text-sm text-slate-500">
        Elle demande le droit {labels}.
        {sessionUser && ` Vous êtes connecté(e) en tant que ${fullName(sessionUser)} (${roleNames(sessionUser, roles).join(", ")}).`}
      </p>
      <Button className="mt-6" variant="outline" asChild>
        <Link href="/team/accueil">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
