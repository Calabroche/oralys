"use client";

import { Fragment } from "react";
import { ListChecks, Siren } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeam } from "@/context/TeamDataContext";
import {
  ABSENCE_TYPE_LABELS,
  DayStaffing,
  ROLE_GROUP_LABELS,
  ROLE_ORDER,
  absenceOn,
  displayName,
  halvesOn,
  isChairAssistant,
  isHealthProfessional,
  isLastMinute,
  occupationOn,
  primaryRoleId,
  worksOn,
} from "@/lib/team";
import { missionsDueOn } from "@/lib/missions";
import { UserAvatar, absenceTone } from "@/components/team/shared";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { PersonLink } from "@/components/team/PersonSheet";
import { HalfDay, TeamUser } from "@/types/team";
import { fromISODate, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";


const DAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

/**
 * Calendrier consolidé de l'équipe (présences / absences), distinct de l'agenda RDV patients de Soins.
 */
export function TeamCalendar({
  dates,
  people,
  tensionDates,
  staffing,
  roleFilter,
  highlightUserId,
  readOnly = false,
  onCellClick,
}: {
  dates: string[];
  people: TeamUser[];
  tensionDates: Set<string>;
  staffing: Map<string, DayStaffing>;
  /** Rôle filtré : un seul groupe, qui inclut aussi les personnes pour qui c'est un rôle secondaire. */
  roleFilter?: string;
  /** Personne mise en avant (lien direct depuis sa fiche). */
  highlightUserId?: string | null;
  /** Consultation seule (sans droit « Planning d'équipe ») : la grille est inerte, aucun clic ni action. */
  readOnly?: boolean;
  onCellClick?: (userId: string, date: string) => void;
}) {
  const { absences, now, findUser, roles, sessionUser, can } = useTeam();
  // Missions du jour : chacun voit les siennes ; gestionnaire, praticiens et comptable voient celles de tous.
  const seesAllMissions = can("param.cabinet") || can("compta") || (!!sessionUser && isHealthProfessional(sessionUser, roles));
  const today = toISODate(now());
  const compact = dates.length > 10;
  const roleIds = [...ROLE_ORDER, ...roles.map((r) => r.id).filter((id) => !ROLE_ORDER.includes(id))];
  const groups = (roleFilter ? [roleFilter] : roleIds)
    .map((id) => ({
      id,
      label: ROLE_GROUP_LABELS[id] ?? roles.find((r) => r.id === id)?.name ?? id,
      users: people.filter((u) => (roleFilter ? u.roleIds.includes(id) : primaryRoleId(u) === id)),
    }))
    .filter((g) => g.users.length);
  const secondary = (u: TeamUser, groupId: string) =>
    u.roleIds.filter((r) => r !== groupId).map((r) => roles.find((x) => x.id === r)?.name).filter(Boolean).join(", ");

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50/80">
            <th className="sticky left-0 z-10 w-56 min-w-56 bg-slate-50 px-4 py-2 text-left text-xs font-medium text-slate-500">Collaborateur</th>
            {dates.map((iso) => {
              const d = fromISODate(iso);
              const isToday = iso === today;
              return (
                <th key={iso} className={cn("px-0.5 py-2 text-center font-normal", compact ? "min-w-8" : "min-w-28", isToday && "bg-pink-50")}>
                  <div className={cn("text-[0.68rem] text-slate-500 uppercase", isToday && "text-pink-700")}>{DAY_SHORT[d.getDay()]}</div>
                  <div className={cn("text-sm font-medium", isToday ? "text-pink-700" : "text-slate-800")}>{d.getDate()}</div>
                  {tensionDates.has(iso) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="mx-auto mt-0.5 block size-1.5 rounded-full bg-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>Tension : un praticien n&apos;a aucun assistant rattaché disponible</TooltipContent>
                    </Tooltip>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody inert={readOnly}>
          {groups.map((g) => (
            <Fragment key={g.id}>
              <tr className="border-b bg-pink-50/40">
                <td colSpan={dates.length + 1} className="sticky left-0 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  {g.label} <span className="font-normal text-slate-400">({g.users.length})</span>
                </td>
              </tr>
              {g.users.map((u) => (
                <tr
                  key={u.id}
                  ref={(el) => {
                    if (el && u.id === highlightUserId) el.scrollIntoView({ block: "center" });
                  }}
                  className={cn("border-b last:border-0", u.id === highlightUserId && "bg-pink-50/70")}
                >
                  <td className={cn("sticky left-0 z-10 px-4 py-1.5", u.id === highlightUserId ? "bg-pink-50" : "bg-white")}>
                    <div className="flex items-center gap-2">
                      <UserAvatar user={u} className="size-6 text-[0.6rem]" />
                      <span className="min-w-0">
                        <PersonLink userId={u.id} className="block truncate text-sm text-slate-800">
                          {displayName(u)}
                        </PersonLink>
                        {secondary(u, g.id) && <span className="block truncate text-[0.68rem] text-slate-400">+ {secondary(u, g.id)}</span>}
                      </span>
                    </div>
                  </td>
                  {dates.map((iso) => {
                    const abs = absenceOn(u.id, iso, absences);
                    const works = worksOn(u, iso);
                    const isToday = iso === today;
                    const declarer = abs ? findUser(abs.declaredById) : undefined;
                    return (
                      <td key={iso} className={cn("h-10 px-0.5 py-1", isToday && "bg-pink-50/50")}>
                        {abs ? (
                          <AbsencePopover absence={abs} date={iso}>
                              <button
                                title={`${ABSENCE_TYPE_LABELS[abs.type]}${abs.motif ? ` · ${abs.motif}` : ""} · ${abs.status === "demandee" ? "à valider" : "validée"}${declarer ? ` · déclarée par ${declarer.firstName}` : ""}. Cliquer pour annuler ou modifier.`}
                                className={cn(
                                  "flex h-full w-full items-center justify-center gap-1 rounded-md border text-xs font-medium",
                                  absenceTone(abs.type),
                                  abs.status === "demandee" && "border-2 border-dashed bg-white",
                                  isLastMinute(abs) && "ring-2 ring-rose-400"
                                )}
                              >
                                {isLastMinute(abs) && <Siren className="size-3" />}
                                {!compact && ABSENCE_TYPE_LABELS[abs.type]}
                                {!compact && abs.status === "demandee" && <span className="font-normal opacity-70">· à valider</span>}
                              </button>
                          </AbsencePopover>
                        ) : works ? (
                          <button
                            onClick={() => onCellClick?.(u.id, iso)}
                            className="group flex h-full w-full items-center justify-center rounded-md hover:bg-slate-50"
                            aria-label={`Déclarer une absence pour ${displayName(u)} le ${iso}`}
                          >
                            <span className="flex flex-col items-center group-hover:hidden">
                              <PresenceLabel user={u} staffing={staffing.get(iso)} compact={compact} />
                              {!compact && !isChairAssistant(u) && halvesOn(u, iso).length === 1 && (
                                <span className="text-[0.62rem] leading-tight text-slate-500">{halvesOn(u, iso)[0] === "matin" ? "matin" : "après-midi"}</span>
                              )}
                              {!compact && (seesAllMissions || u.id === sessionUser?.id) && <DayMissions user={u} iso={iso} today={today} />}
                            </span>
                            <span className="hidden text-xs text-slate-400 group-hover:inline">+ absence</span>
                          </button>
                        ) : (
                          <div className="h-full w-full rounded-md bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_3px,transparent_3px,transparent_7px)]" title="Non travaillé" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Missions dues ce jour-là : un petit compteur, coloré selon la pire situation, le détail au survol. */
function DayMissions({ user, iso, today }: { user: TeamUser; iso: string; today: string }) {
  const list = missionsDueOn(user, iso, today);
  if (!list.length) return null;
  const late = list.some((x) => x.etat === "en_retard" || x.etat === "non_conforme");
  const todo = iso === today && list.some((x) => x.etat === "a_faire");
  const label: Record<string, string> = { fait: "fait", a_controler: "à contrôler", non_conforme: "non conforme", a_faire: iso === today ? "à faire" : "prévu", en_retard: "pas fait" };
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex items-center gap-0.5 rounded px-1 text-[0.62rem] leading-4 font-medium",
        late ? "bg-rose-50 text-rose-700" : todo ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"
      )}
      title={list.map((x) => `${x.mission.titre}${x.mission.horaire ? ` (${x.mission.horaire})` : ""} : ${label[x.etat]}`).join("\n")}
    >
      <ListChecks className="size-3" />
      {list.length === 1 ? (list[0].mission.titre.length > 18 ? `${list[0].mission.titre.slice(0, 17)}…` : list[0].mission.titre) : `${list.length} missions`}
    </span>
  );
}

/** Ce que fait la personne ce jour-là : avec quel praticien (assistant), avec qui (praticien). */
function PresenceLabel({ user, staffing, compact }: { user: TeamUser; staffing?: DayStaffing; compact: boolean }) {
  const { findUser } = useTeam();
  if (!staffing || compact) return <span className="inline-block size-1.5 rounded-full bg-emerald-400" />;
  if (isChairAssistant(user)) {
    // Avec qui, et quand : une assistante peut être avec un praticien le matin et un autre l'après-midi.
    const withWhom = staffing.praticiens
      .map((p) => ({ p, slot: p.slots.find((s) => s.assistantId === user.id) }))
      .filter((x) => x.slot)
      .sort((a, b) => (a.slot!.partial === "apres_midi" ? 1 : 0) - (b.slot!.partial === "apres_midi" ? 1 : 0));
    // Demi-journées au cabinet mais pas au fauteuil (plage « FSE test », stérilisation…), en orange.
    const occupations = halvesOn(user, staffing.date)
      .map((h) => ({ h, label: occupationOn(user, staffing.date, h) }))
      .filter((x): x is { h: HalfDay; label: string } => Boolean(x.label));
    const occChips = occupations.map((o) => (
      <span key={o.h} className="max-w-28 truncate rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800" title={`${o.label} (${o.h === "matin" ? "matin" : "après-midi"})`}>
        {o.label} <span className="font-normal opacity-70">· {o.h === "matin" ? "matin" : "aprèm"}</span>
      </span>
    ));
    if (!withWhom.length)
      return occChips.length ? (
        <span className="flex flex-col items-center gap-0.5">{occChips}</span>
      ) : (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Sans équipe</span>
      );
    return (
      <span className="flex flex-col items-center gap-0.5">
        {withWhom.map(({ p, slot }) => (
          <span
            key={p.praticien.id}
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
              slot!.kind === "backup" ? "border border-dashed border-sky-300 bg-sky-50 text-sky-900" : "bg-emerald-100 text-emerald-900"
            )}
          >
            {slot!.kind === "backup" ? "↻ " : ""}Dr {findUser(p.praticien.id)?.lastName}
            {p.halves.length === 2 && (
              <span className="font-normal opacity-70">{slot!.partial === "matin" ? " · matin" : slot!.partial === "apres_midi" ? " · aprèm" : " · matin + aprèm"}</span>
            )}
          </span>
        ))}
        {occChips}
      </span>
    );
  }
  if (user.poste === "praticien") {
    const day = staffing.praticiens.find((p) => p.praticien.id === user.id);
    if (!day || day.status !== "travaille") return <span className="inline-block size-1.5 rounded-full bg-emerald-400" />;
    if (day.need === 0) return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">Sans assistant</span>;
    const names = day.slots.map((s) => findUser(s.assistantId)?.firstName).join(" + ");
    return (
      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", day.missing ? "bg-rose-100 text-rose-800" : "bg-emerald-50 text-emerald-800")}>
        {names || "Seul"}
        {day.missing > 0 && ` · manque ${day.missing}`}
      </span>
    );
  }
  return <span className="inline-block size-1.5 rounded-full bg-emerald-400" />;
}
