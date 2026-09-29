"use client";

import { useTeam } from "@/context/TeamDataContext";
import { ProfileView } from "@/components/team/profile/ProfileView";

/** Mon profil : existe dès le MVP (identité, jours de travail, absences, et pour un praticien sa semaine type et son équipe). */
export default function MoiPage() {
  const { sessionUser } = useTeam();
  if (!sessionUser) return null;
  return <ProfileView key={sessionUser.id} user={sessionUser} />;
}
