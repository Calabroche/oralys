"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTeam } from "@/context/TeamDataContext";
import { fullName } from "@/lib/team";
import { TeamUser } from "@/types/team";
import { toISODate } from "@/utils/date";

const REASONS = ["Départ du cabinet", "Fin de contrat / CDD", "Remplacement saisonnier terminé", "Congé longue durée"];

export function ArchiveDialog({ user, onClose }: { user: TeamUser | null; onClose: () => void }) {
  const { archiveUser, rdvs, profiles, audit, now } = useTeam();
  const [reason, setReason] = useState(REASONS[0]);
  if (!user) return null;
  const today = toISODate(now());
  const futureRdvs = rdvs.filter((r) => r.assistantUserId === user.id && r.date >= today).length;
  const teams = profiles.filter((p) => p.team.some((l) => l.userId === user.id)).length;
  const history = audit.filter((a) => a.actorId === user.id || a.targetUserId === user.id).length;

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-slate-100">
            <Archive />
          </AlertDialogMedia>
          <AlertDialogTitle>Archiver {fullName(user)} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le compte est désactivé et n&apos;apparaît plus dans les affectations futures. Son historique reste consultable, et vous pourrez le réactiver à tout moment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 text-sm">
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {REASONS.map((r) => (
              <Label key={r} className="flex items-center gap-2 font-normal">
                <RadioGroupItem value={r} /> {r}
              </Label>
            ))}
          </RadioGroup>
          <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-slate-600">
            <li>• {futureRdvs} RDV à venir seront à réaffecter</li>
            <li>• Retiré(e) de {teams} équipe(s) praticien</li>
            <li>• {history} action(s) historique(s) conservée(s) avec le rôle de l&apos;époque</li>
          </ul>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              archiveUser(user.id, reason);
              toast.success(`${fullName(user)} archivé(e)`, { description: futureRdvs ? `${futureRdvs} RDV à réaffecter dans Remplacements.` : undefined });
              onClose();
            }}
          >
            Archiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteDialog({ user, onClose }: { user: TeamUser | null; onClose: () => void }) {
  const { deleteUser } = useTeam();
  const [confirm, setConfirm] = useState("");
  if (!user) return null;
  const ok = confirm.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <ShieldAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer définitivement {fullName(user)} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Action irréversible : données personnelles effacées, historique anonymisé. Pour un départ classique, préférez l&apos;archivage qui conserve la
            traçabilité.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">
            Tapez <span className="font-mono text-slate-800">{user.email}</span> pour confirmer
          </Label>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!ok}
            onClick={() => {
              deleteUser(user.id);
              toast.success(`${fullName(user)} supprimé(e) définitivement`);
              onClose();
            }}
          >
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
