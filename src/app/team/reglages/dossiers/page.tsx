"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessGate } from "@/components/team/Access";
import { PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { useTeam } from "@/context/TeamDataContext";
import { CP_PAR_AN, cpSummary, hasCongesPayes } from "@/lib/conges";
import { fullName } from "@/lib/team";
import { TeamUser } from "@/types/team";
import { formatShortDate, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Dossiers du personnel, côté gestionnaire : toutes les fiches RH en un coup d'œil (contrat, congés,
 * prochain rendez-vous), et un accès direct au dossier de chacun pour le remplir. Chaque personne voit
 * le sien en lecture seule depuis son profil.
 */
export default function DossiersPage() {
  return (
    <AccessGate access="utilisateurs">
      <Dossiers />
    </AccessGate>
  );
}

/** Prochain rendez-vous RH de la personne (1:1, médecine du travail ou entretien professionnel). */
function nextRendezVous(u: TeamUser): { label: string; date: string } | null {
  // Un praticien libéral n'a ni 1:1 ni entretien professionnel : seule la médecine du travail compte.
  const salarie = hasCongesPayes(u);
  const all = [
    salarie && u.oneOnOne && { label: "1:1", date: u.oneOnOne.nextDate },
    u.medecineTravail && { label: "Médecine du travail", date: u.medecineTravail.nextDate },
    salarie && u.entretienPro && { label: "Entretien professionnel", date: u.entretienPro.prochaineDate },
  ].filter((x): x is { label: string; date: string } => !!x);
  return all.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

function Dossiers() {
  const { users, absences, now } = useTeam();
  const today = toISODate(now());
  const actifs = users.filter((u) => u.status === "actif").sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossiers du personnel"
        description="Contrat, rémunération, missions, rappels, congés payés et documents de chacun. Vous les remplissez ici ; chaque personne les retrouve en lecture seule sur son profil."
      />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs uppercase">
              <TableHead>Personne</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Congés payés</TableHead>
              <TableHead>Prochain rendez-vous</TableHead>
              <TableHead>À compléter</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actifs.map((u) => {
              const salarie = hasCongesPayes(u);
              const cp = salarie ? cpSummary(u, absences, today) : null;
              const rdv = nextRendezVous(u);
              const missing = [
                salarie && !u.missions?.length && "missions",
                salarie && !u.contrat && "contrat",
                salarie && !u.salary && "rémunération",
              ].filter(Boolean) as string[];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} />
                      <div>
                        <p className="font-medium text-slate-900">{fullName(u)}</p>
                        <RoleBadges user={u} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {!salarie ? (
                      <span className="text-slate-400">Libéral</span>
                    ) : u.contrat ? (
                      <>
                        <span className="font-medium">{u.contrat.type.toUpperCase()}</span>
                        <span className="text-slate-500"> · depuis le {formatShortDate(u.contrat.dateEmbauche)}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {cp ? (
                      <span className={cn(cp.solde < 0 && "text-rose-700")}>
                        <span className="font-medium">{cp.solde} j</span>
                        <span className="text-slate-500"> restants sur {CP_PAR_AN}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rdv ? (
                      <span className={cn(rdv.date < today && "text-rose-700")}>
                        {rdv.label} <span className="text-slate-500">· {formatShortDate(rdv.date)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {missing.length ? (
                      <Badge variant="outline" className="border-amber-300 text-amber-800">
                        {missing.join(", ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-emerald-700">Complet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/team/profil/${u.id}`}>
                        <FolderOpen /> Ouvrir le dossier
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
