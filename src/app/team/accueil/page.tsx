"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/context/TeamDataContext";
import { homePathFor } from "@/lib/team";

/** Entrée dans Team : chacun arrive sur sa vue par défaut (tableau de bord ou planning). */
export default function TeamAccueil() {
  const router = useRouter();
  const { sessionUser, roles } = useTeam();
  const target = homePathFor(sessionUser, roles);
  useEffect(() => {
    router.replace(target);
  }, [router, target]);
  return null;
}
