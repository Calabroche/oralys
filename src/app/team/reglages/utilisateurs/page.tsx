"use client";

import { AccessGate } from "@/components/team/Access";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/lib/persist";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Eye,
  History,
  Mail,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/context/TeamDataContext";
import { Gate, PageHeader, PillFilter, RoleBadges, StatusBadge } from "@/components/team/shared";
import { UserFormDialog } from "@/components/team/users/UserFormDialog";
import { ArchiveDialog, DeleteDialog } from "@/components/team/users/LifecycleDialogs";
import { usePersonSheet } from "@/components/team/PersonSheet";
import { InvitationEmail } from "@/components/team/users/InvitationEmail";
import { fullName } from "@/lib/team";
import { TeamUser, UserStatus } from "@/types/team";
import { cn } from "@/lib/utils";

type Filter = "tous" | UserStatus;

export default function UtilisateursPage() {
  return (
    <AccessGate access="utilisateurs">
      <Suspense>
        <Utilisateurs />
      </Suspense>
    </AccessGate>
  );
}

function Utilisateurs() {
  const params = useSearchParams();
  const { open: openPerson } = usePersonSheet();
  const { users, profiles, findUser, can, resendInvite, reactivateUser, simulateActivation } = useTeam();
  const [filter, setFilter] = usePersistentState<Filter>("utilisateurs-filtre", "tous");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [archiving, setArchiving] = useState<TeamUser | null>(null);
  const [deleting, setDeleting] = useState<TeamUser | null>(null);
  const [inviteFor, setInviteFor] = useState<TeamUser | null>(null);

  const counts = useMemo(
    () => ({
      tous: users.length,
      actif: users.filter((u) => u.status === "actif").length,
      en_attente: users.filter((u) => u.status === "en_attente").length,
      archive: users.filter((u) => u.status === "archive").length,
    }),
    [users]
  );

  const q = query.trim().toLowerCase();
  const rows = users
    .filter((u) => filter === "tous" || u.status === filter)
    .filter((u) => !q || fullName(u).toLowerCase().includes(q) || u.email.includes(q))
    .sort((a, b) => (a.status === "archive" ? 1 : 0) - (b.status === "archive" ? 1 : 0) || a.lastName.localeCompare(b.lastName));

  const canEdit = can("param.cabinet");

  // Lien direct depuis la fiche personne : /team/reglages/utilisateurs?edit=<id>
  const editId = params.get("edit");
  useEffect(() => {
    const target = users.find((u) => u.id === editId);
    if (!target || !canEdit) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setEditing(target);
    setFormOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Ouverture unique à l'arrivée sur la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs du cabinet"
        description="Gérez les accès de vos collaborateurs à Oralys, leurs rôles et leur cycle de vie."
        actions={
          <Gate perm="param.cabinet">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Ajouter un utilisateur
            </Button>
          </Gate>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillFilter
          value={filter}
          onChange={setFilter}
          options={[
            { value: "tous", label: "Tous", count: counts.tous },
            { value: "actif", label: "Actifs", count: counts.actif },
            { value: "en_attente", label: "En attente", count: counts.en_attente },
            { value: "archive", label: "Archivés", count: counts.archive },
          ]}
        />
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher nom ou email" className="pl-8" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="text-xs tracking-wide uppercase">
            <TableHead className="text-slate-500">Utilisateur</TableHead>
            <TableHead className="text-slate-500">Rôle(s)</TableHead>
            <TableHead className="text-slate-500">Environnement par défaut</TableHead>
            <TableHead className="text-slate-500">Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => {
            const env = profiles.find((p) => p.id === u.defaultEnvironmentId);
            const envOwner = env ? findUser(env.praticienUserId) : undefined;
            return (
              <TableRow key={u.id} className={cn("cursor-pointer", u.status === "archive" && "text-slate-400")} onClick={() => openPerson(u.id)}>
                <TableCell className="py-3">
                  <div className={cn("font-medium", u.status === "archive" ? "text-slate-500" : "text-slate-900")}>{fullName(u)}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </TableCell>
                <TableCell>
                  <RoleBadges user={u} />
                </TableCell>
                <TableCell className="text-slate-700">{envOwner ? fullName(envOwner) : "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-0.5">
                    <StatusBadge status={u.status} />
                    {u.status === "en_attente" && u.lastInviteSentAt && (
                      <span className="text-[0.7rem] text-slate-400">
                        Invité le {new Date(u.lastInviteSentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${fullName(u)}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {u.status === "en_attente" && (
                        <>
                          <DropdownMenuItem
                            disabled={!canEdit}
                            onSelect={() => {
                              resendInvite(u.id);
                              toast.success(`Invitation renvoyée à ${u.email}`);
                            }}
                          >
                            <Mail /> Renvoyer le mail
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setInviteFor(u)}>
                            <Eye /> Voir l&apos;email d&apos;invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              simulateActivation(u.id);
                              toast.success(`${fullName(u)} a défini son mot de passe`, { description: "Compte actif (simulation)." });
                            }}
                          >
                            <MailCheck /> Simuler l&apos;activation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {u.status !== "archive" ? (
                        <>
                          <DropdownMenuItem
                            disabled={!canEdit}
                            onSelect={() => {
                              setEditing(u);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={!canEdit} onSelect={() => setArchiving(u)}>
                            <Archive /> Archiver
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            disabled={!canEdit}
                            onSelect={() => {
                              reactivateUser(u.id);
                              toast.success(`${fullName(u)} réactivé(e)`, { description: "Pensez à le/la rattacher à nouveau à une équipe." });
                            }}
                          >
                            <RotateCcw /> Réactiver
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openPerson(u.id)}>
                            <History /> Voir l&apos;historique
                          </DropdownMenuItem>
                        </>
                      )}
                      {u.status !== "actif" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" disabled={!can("param.cabinet")} onSelect={() => setDeleting(u)}>
                            <Trash2 /> Supprimer définitivement
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                Aucun utilisateur ne correspond.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="text-xs text-slate-400">
        La suppression définitive n&apos;est proposée qu&apos;aux comptes archivés ou jamais activés, pour ne pas effacer par erreur la traçabilité d&apos;un compte actif.
      </p>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ArchiveDialog key={archiving?.id ?? "no-archive"} user={archiving} onClose={() => setArchiving(null)} />
      <DeleteDialog key={deleting?.id ?? "no-delete"} user={deleting} onClose={() => setDeleting(null)} />
      <Dialog open={Boolean(inviteFor)} onOpenChange={(o) => !o && setInviteFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email d&apos;invitation</DialogTitle>
            <DialogDescription>Tel que reçu par {inviteFor ? fullName(inviteFor) : ""}.</DialogDescription>
          </DialogHeader>
          {inviteFor && <InvitationEmail user={inviteFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
