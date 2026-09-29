"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTeam } from "@/context/TeamDataContext";

/**
 * Ancienne page « Praticiens & équipes » : tout ce qui concerne un praticien est maintenant dans son profil.
 * Les anciens liens (favoris, notifications) mènent au bon profil.
 */
export default function EquipesRedirect() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { profiles, sessionUserId, can } = useTeam();
  const wanted = profiles.find((p) => p.id === params.get("praticien"));
  const own = profiles.find((p) => p.praticienUserId === sessionUserId);
  const target = wanted
    ? `/team/profil/${wanted.praticienUserId}`
    : own
      ? "/team/moi"
      : can("param.cabinet")
        ? "/team/reglages/utilisateurs"
        : "/team/planning";
  useEffect(() => {
    router.replace(target);
  }, [router, target]);
  return null;
}
