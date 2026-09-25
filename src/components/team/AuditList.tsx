"use client";

import {
  Archive,
  CalendarCheck,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  FlaskConical,
  KeyRound,
  Mail,
  Pencil,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Repeat,
  Undo2,
  Redo2, Clock } from "lucide-react";
import { useTeam } from "@/context/TeamDataContext";
import { AuditAction, AuditEntry } from "@/types/team";
import { fullName } from "@/lib/team";
import { cn } from "@/lib/utils";
import { PersonLink } from "@/components/team/PersonSheet";

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; icon: typeof Mail; sensitive?: boolean }> = {
  "user.create": { label: "Création d'utilisateur", icon: UserPlus },
  "user.invite": { label: "Invitation", icon: Mail },
  "user.update": { label: "Modification de profil", icon: Pencil },
  "user.archive": { label: "Archivage", icon: Archive, sensitive: true },
  "user.reactivate": { label: "Réactivation", icon: RotateCcw },
  "user.delete": { label: "Suppression définitive", icon: Trash2, sensitive: true },
  "role.assign": { label: "Modification de rôle", icon: KeyRound, sensitive: true },
  "role.permissions": { label: "Modification des droits", icon: ShieldCheck, sensitive: true },
  "absence.declare": { label: "Déclaration d'absence", icon: CalendarPlus },
  "absence.validate": { label: "Validation d'absence", icon: CalendarCheck },
  "absence.refuse": { label: "Refus d'absence", icon: CalendarX },
  "absence.cancel": { label: "Absence annulée (retour arrière)", icon: Undo2 },
  "absence.restore": { label: "Absence rétablie", icon: Redo2 },
  "sterilisation.cycle": { label: "Cycle de stérilisation", icon: FlaskConical, sensitive: true },
  "paiement.note": { label: "Note sur paiement", icon: Receipt, sensitive: true },
  "session.switch": { label: "Bascule de session", icon: Repeat },
  "rdv.assign": { label: "Affectation de RDV", icon: UserRoundCheck },
  "rdv.reschedule": { label: "RDV reprogrammé", icon: CalendarClock },
  "rdv.cancel": { label: "RDV annulé", icon: CalendarX },
  "binome.pret": { label: "Prêt d'assistant pour la journée", icon: Repeat },
  "binome.besoin": { label: "Besoin ajusté pour la journée", icon: Repeat },
  "pointage.punch": { label: "Pointage", icon: Clock },
  "pointage.correction": { label: "Correction de pointage", icon: Clock, sensitive: true },
};

export function AuditList({ entries, compact }: { entries: AuditEntry[]; compact?: boolean }) {
  const { findUser } = useTeam();
  if (entries.length === 0) return <p className="py-6 text-center text-sm text-slate-400">Aucune action trouvée.</p>;
  return (
    <ol className="relative space-y-0">
      {entries.map((e) => {
        const meta = AUDIT_ACTION_META[e.action];
        const actor = findUser(e.actorId);
        const Icon = meta.icon;
        return (
          <li key={e.id} className={cn("flex gap-3 border-b py-3 last:border-0", compact && "py-2.5")}>
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                meta.sensitive ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-900">{e.summary}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {actor ? <PersonLink userId={actor.id}>{fullName(actor)}</PersonLink> : <span className="italic">Utilisateur supprimé</span>}
                {actor?.status === "archive" && " (archivé)"} · en tant que {e.actorRoles.join(" + ") || "?"}
                {e.workstation && ` · ${e.workstation}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
