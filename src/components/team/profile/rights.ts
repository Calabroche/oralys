"use client";

import { useTeam } from "@/context/TeamDataContext";
import { isHealthProfessional } from "@/lib/team";
import { TeamUser } from "@/types/team";

/**
 * Qui peut quoi sur la fiche d'une personne :
 * - `canManage` : régler sa semaine type et ses missions (le gestionnaire, ou le praticien pour son équipe) ;
 * - `canSeeSensitive` : salaire, assiduité, état des missions (la personne elle-même, le gestionnaire, les praticiens, le comptable).
 */
export function usePersonRights(user: TeamUser) {
  const { can, sessionUser, sessionUserId, profiles, roles } = useTeam();
  const self = user.id === sessionUserId;
  const gestion = can("param.cabinet");
  const viewerPraticien = !!sessionUser && isHealthProfessional(sessionUser, roles);
  const ownsTeam = profiles.some((p) => p.praticienUserId === sessionUserId && p.team.some((l) => l.userId === user.id));
  return {
    self,
    gestion,
    viewerPraticien,
    canManage: gestion || ownsTeam,
    canSeeSensitive: self || gestion || viewerPraticien || can("compta"),
    /** Photo et téléphone : la personne elle-même ou le gestionnaire. */
    canEditContact: self || gestion,
  };
}
