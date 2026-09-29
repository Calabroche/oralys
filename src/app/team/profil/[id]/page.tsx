"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/context/TeamDataContext";
import { ProfileView } from "@/components/team/profile/ProfileView";

/** Profil d'une personne : le gestionnaire (ou le planning) y règle tout, chacun y voit le sien. */
export default function ProfilPage() {
  const { id } = useParams<{ id: string }>();
  const { findUser, sessionUserId, can } = useTeam();
  const user = findUser(id);
  if (!user) return <p className="px-8 py-24 text-center text-sm text-slate-500">Personne introuvable.</p>;
  if (user.id !== sessionUserId && !can("param.cabinet") && !can("team.planning")) {
    return (
      <div className="mx-auto max-w-lg px-8 py-24 text-center">
        <Lock className="mx-auto size-8 text-slate-400" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Profil réservé</h1>
        <p className="mt-1 text-sm text-slate-500">Chacun voit son propre profil ; le gestionnaire voit ceux de toute l&apos;équipe.</p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/team/moi">Voir mon profil</Link>
        </Button>
      </div>
    );
  }
  return <ProfileView key={user.id} user={user} />;
}
