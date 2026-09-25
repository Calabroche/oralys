"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/team/Access";

/** Entrée de l'Administration : la première page à laquelle la personne a droit. */
export default function ReglagesIndex() {
  const router = useRouter();
  const allowed = useAccess();
  const target = allowed("utilisateurs") ? "/team/reglages/utilisateurs" : allowed("audit") ? "/team/reglages/journal" : "/team";
  useEffect(() => {
    router.replace(target);
  }, [router, target]);
  return null;
}
