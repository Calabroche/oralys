"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeam } from "@/context/TeamDataContext";
import { RoleBadges, UserAvatar } from "@/components/team/shared";
import { SemaineTypeSalarie } from "@/components/team/profile/Fiche";
import { usePersistentState } from "@/lib/persist";
import { ROLE_GROUP_LABELS, ROLE_ORDER, fullName, isHealthProfessional, primaryRoleId } from "@/lib/team";

/**
 * Semaines types de l'équipe, au même endroit : on choisit une personne et son calendrier s'affiche
 * (semaine type, cette semaine, les autres semaines), avec « Modifier » pour qui en a le droit.
 * Évite de passer par Administration → Dossiers du personnel → Ouvrir le dossier.
 * Gestionnaire : tous les salariés. Praticien : les assistants et aides dentaires. Les autres : leur propre semaine, en lecture seule.
 */
export function SemainesTypes({ initialUserId }: { initialUserId?: string | null }) {
  const { users, roles, can, sessionUser, sessionUserId } = useTeam();
  const gestion = can("param.cabinet");
  const praticien = !!sessionUser && isHealthProfessional(sessionUser, roles);
  // Praticiens libéraux exclus : leur semaine type est celle de leur agenda Soins.
  const people = users
    .filter((u) => u.status === "actif" && !u.roleIds.includes("role-praticien"))
    // Gestionnaire : tout le monde. Praticien : les assistants et aides dentaires (il remplit leurs horaires). Les autres : eux-mêmes.
    .filter((u) => gestion || u.id === sessionUserId || (praticien && u.roleIds.some((r) => r === "role-assistant" || r === "role-aide")))
    .sort((a, b) => ROLE_ORDER.indexOf(primaryRoleId(a)) - ROLE_ORDER.indexOf(primaryRoleId(b)) || a.lastName.localeCompare(b.lastName));
  const [stored, setStored] = usePersistentState<string | null>("planning-semaine-user", null, initialUserId ?? null);
  const selected = people.find((u) => u.id === stored) ?? people.find((u) => u.id === sessionUserId) ?? people[0];
  const groups = [...new Set(people.map(primaryRoleId))].map((rid) => ({ rid, people: people.filter((u) => primaryRoleId(u) === rid) }));
  const idx = selected ? people.indexOf(selected) : -1;

  if (!selected) return <p className="text-sm text-slate-500">Personne à afficher.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {people.length > 1 && (
          <>
            <Button variant="outline" size="icon-sm" onClick={() => setStored(people[(idx - 1 + people.length) % people.length].id)} aria-label="Personne précédente">
              <ChevronLeft />
            </Button>
            <Select value={selected.id} onValueChange={setStored}>
              <SelectTrigger className="h-9 min-w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectGroup key={g.rid}>
                    <SelectLabel>{ROLE_GROUP_LABELS[g.rid] ?? roles.find((r) => r.id === g.rid)?.name ?? "Autres"}</SelectLabel>
                    {g.people.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <UserAvatar user={u} className="size-5 text-[0.55rem]" />
                          {fullName(u)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon-sm" onClick={() => setStored(people[(idx + 1) % people.length].id)} aria-label="Personne suivante">
              <ChevronRight />
            </Button>
          </>
        )}
        <span className="ml-1 flex items-center gap-2">
          <RoleBadges user={selected} />
        </span>
        {(gestion || selected.id === sessionUserId) && (
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href={selected.id === sessionUserId ? "/team/moi" : `/team/profil/${selected.id}`}>
              <FolderOpen /> {selected.id === sessionUserId ? "Mon profil" : "Ouvrir le dossier"}
            </Link>
          </Button>
        )}
      </div>
      <SemaineTypeSalarie user={selected} />
    </div>
  );
}
