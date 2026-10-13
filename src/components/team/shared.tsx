"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeam } from "@/context/TeamDataContext";
import { PermissionId, TeamAbsence, TeamUser, UserStatus } from "@/types/team";
import { ABSENCE_TYPE_LABELS, initials, isLastMinute } from "@/lib/team";
import { useVersion } from "@/components/team/Version";
import { PERMISSIONS } from "@/data/teamMockData";
import { cn } from "@/lib/utils";

const AVATAR_TONES = [
  "bg-pink-100 text-pink-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-orange-100 text-orange-800",
];

export function toneFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/**
 * Photos par défaut de l'équipe de démo (portraits libres de randomuser.me), pour que le trombinoscope et
 * le planning ressemblent à un vrai cabinet. Une photo ajoutée par la personne passe toujours devant ;
 * un compte créé pendant la démo garde ses initiales tant qu'il n'a pas de photo.
 */
const PHOTOS_DEMO: Record<string, string> = {
  "u-delphine": "women/44",
  "u-sophie": "women/68",
  "u-flore": "women/65",
  "u-dray": "men/32",
  "u-thomas": "men/45",
  "u-ines": "women/12",
  "u-camille": "women/26",
  "u-lea": "women/90",
  "u-manon": "women/57",
  "u-karima": "women/79",
  "u-nathalie": "women/50",
  "u-julie": "women/33",
  "u-hugo": "men/75",
  "u-michel": "men/62",
};

/** Photo affichée : celle de la personne, sinon celle de la démo. */
export function photoDe(user: TeamUser): string | undefined {
  const demo = PHOTOS_DEMO[user.id];
  return user.photo ?? (demo ? `https://randomuser.me/api/portraits/${demo}.jpg` : undefined);
}

export function UserAvatar({ user, className }: { user: TeamUser; className?: string }) {
  const photo = photoDe(user);
  return (
    <Avatar className={cn("size-8", className)}>
      {photo && <AvatarImage src={photo} alt={`Photo de ${user.firstName}`} className={cn("object-cover", user.status === "archive" && "grayscale opacity-60")} />}
      <AvatarFallback className={cn("text-xs font-medium", user.status === "archive" ? "bg-slate-100 text-slate-400" : toneFor(user.id))}>
        {initials(user)}
      </AvatarFallback>
    </Avatar>
  );
}

const STATUS_STYLES: Record<UserStatus, { label: string; className: string }> = {
  actif: { label: "Actif", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  en_attente: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  archive: { label: "Archivé", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn("rounded-md text-[0.68rem] font-semibold tracking-wide uppercase", s.className)}>
      {s.label}
    </Badge>
  );
}

export function RoleBadges({ user }: { user: TeamUser }) {
  const { roles } = useTeam();
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.roleIds.map((id) => {
        const role = roles.find((r) => r.id === id);
        if (!role) return null;
        return (
          <Badge key={id} variant="secondary" className="rounded-md bg-slate-100 font-normal text-slate-700">
            {role.name}
          </Badge>
        );
      })}
    </div>
  );
}

const ABSENCE_STYLES: Record<TeamAbsence["type"], string> = {
  conge: "bg-sky-100 text-sky-800 border-sky-200",
  maladie: "bg-rose-100 text-rose-800 border-rose-200",
  formation: "bg-violet-100 text-violet-800 border-violet-200",
  autre: "bg-slate-100 text-slate-700 border-slate-200",
};

export function absenceTone(type: TeamAbsence["type"]) {
  return ABSENCE_STYLES[type];
}

export function AbsenceBadge({ absence, compact }: { absence: TeamAbsence; compact?: boolean }) {
  const dernierMoment = useVersion().has("dernierMoment");
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="outline" className={cn("rounded-md", absenceTone(absence.type), absence.status === "demandee" && "border-dashed")}>
        {ABSENCE_TYPE_LABELS[absence.type]}
        {absence.status === "demandee" && !compact && " · à valider"}
      </Badge>
      {dernierMoment && isLastMinute(absence) && !compact && (
        <Badge variant="destructive" className="rounded-md">
          Dernier moment
        </Badge>
      )}
    </span>
  );
}

/**
 * Masque ou grise une action selon les droits de la session courante.
 * Les droits sont recalculés à chaque rendu : un retrait de rôle s'applique immédiatement, sans reconnexion.
 */
export function Gate({
  perm,
  children,
  mode = "disable",
}: {
  perm: PermissionId;
  children: ReactNode;
  mode?: "disable" | "hide";
}) {
  const { can } = useTeam();
  if (can(perm)) return <>{children}</>;
  if (mode === "hide") return null;
  const label = PERMISSIONS.find((p) => p.id === perm)?.label ?? perm;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">
          <span className="pointer-events-none opacity-45">{children}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="flex items-center gap-1.5">
          <Lock className="size-3" /> Droit requis : {label}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Filtres en pastilles façon Oralys ("Tous", "Actifs"…), version rose pour Team. */
export function PillFilter<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm transition-colors",
            value === o.value ? "bg-pink-100 font-medium text-pink-900" : "text-slate-700 hover:bg-slate-100"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
