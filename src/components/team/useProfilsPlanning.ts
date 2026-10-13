"use client";

import { useMemo } from "react";
import { useTeam } from "@/context/TeamDataContext";
import { useVersion } from "@/components/team/Version";

/**
 * Les fiches praticien telles que le planning doit les voir. En MVP, pas d'équipes rattachées
 * (titulaires, back-ups) : personne n'est placé d'office, le gestionnaire remplit le planning
 * à la main, demi-journée par demi-journée. En V1, les équipes placent les assistants toutes seules.
 */
export function useProfilsPlanning() {
  const { profiles } = useTeam();
  const equipes = useVersion().has("equipes");
  return useMemo(() => (equipes ? profiles : profiles.map((p) => ({ ...p, team: [] }))), [profiles, equipes]);
}
