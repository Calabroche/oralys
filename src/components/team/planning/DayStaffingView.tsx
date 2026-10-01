"use client";

import { RefreshCw, UserX } from "lucide-react";
import { GapActions } from "@/components/team/GapActions";
import { useTeam } from "@/context/TeamDataContext";
import { ABSENCE_TYPE_LABELS, DayStaffing, RoomStaffing, absenceOn, displayName, fullName, isChairAssistant } from "@/lib/team";
import { activityName, activityType, needSummary } from "@/lib/semaine";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { UserAvatar, absenceTone } from "@/components/team/shared";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { PersonLink } from "@/components/team/PersonSheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVersion } from "@/components/team/Version";
import { fromISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

const KIND_LABEL = { titulaire: "titulaire", backup: "back-up", pret: "prêté(e) pour la journée" } as const;

/**
 * Vue « Jour » : une journée à la fois, en grand — comme l'Activité de Soins. La grille Équipes
 * tasse une salle dans une petite case ; ici chaque salle a sa propre carte, lisible d'un coup
 * d'œil, pour les journées où un praticien tient plusieurs salles en même temps.
 */
export function DayStaffingView({
  date,
  staffing,
  readOnly = false,
}: {
  date: string;
  staffing: DayStaffing;
  readOnly?: boolean;
}) {
  const { findUser, absences } = useTeam();
  const { has } = useVersion();
  const showRooms = has("multiSalles");

  return (
    <div className="space-y-3">
      {staffing.praticiens.map(({ profile, praticien }) => {
        const chair = (l: { userId: string }) => { const u = findUser(l.userId); return Boolean(u && isChairAssistant(u)); };
        const titulaires = profile.team.filter((l) => l.priority === "titulaire" && chair(l)).sort((a, b) => a.rank - b.rank);
        const backups = profile.team.filter((l) => l.priority === "backup" && chair(l)).sort((a, b) => a.rank - b.rank);
        const day = staffing.praticiens.find((p) => p.profile.id === profile.id)!;

        return (
          <div key={profile.id} className="rounded-xl border p-4" inert={readOnly}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UserAvatar user={praticien} className="size-9" />
                <div>
                  <PersonLink userId={praticien.id} className="block font-medium text-slate-900">
                    {displayName(praticien)}
                  </PersonLink>
                  <p className="text-xs text-slate-500">{needSummary(profile)}</p>
                </div>
              </div>
              <div className="text-right text-[0.7rem] leading-snug text-slate-500">
                <span className="text-emerald-700">Titulaire{titulaires.length > 1 ? "s" : ""} : </span>
                {titulaires.map((l) => findUser(l.userId)?.firstName ?? "?").join(", ") || "aucun"}
                <br />
                <span className="text-sky-700">Back-up : </span>
                {backups.map((l) => findUser(l.userId)?.firstName ?? "?").join(", ") || "aucun"}
              </div>
            </div>

            <div className="mt-3">
              {day.status === "repos" ? (
                <div className="rounded-lg bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_4px,transparent_4px,transparent_9px)] px-3 py-2.5 text-sm text-slate-400">
                  Ne consulte pas aujourd&apos;hui
                </div>
              ) : day.status === "absent" ? (
                (() => {
                  const abs = absenceOn(praticien.id, date, absences)!;
                  return (
                    <AbsencePopover absence={abs} date={date}>
                      <button className={cn("w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium", absenceTone(abs.type))}>
                        {abs.source === "soins" ? `${abs.motif?.replace(" (agenda Soins)", "")} · agenda Soins` : `${ABSENCE_TYPE_LABELS[abs.type]} · agenda fermé`}
                      </button>
                    </AbsencePopover>
                  );
                })()
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {day.byHalf.map((h) => (
                    <div key={h.half}>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {h.half === "matin" ? "Matin" : "Après-midi"}
                        {h.activities.map((a) => (
                          <span key={a} className={cn("rounded border px-1.5 py-0.5 text-[0.65rem] font-medium normal-case", ACTIVITY_COLOR_CLASSES[activityType(a)?.color ?? "gray"].chip)}>
                            {activityName(a)}
                          </span>
                        ))}
                      </p>
                      {(() => {
                        // Le détail par salle arrive en V4 : avant, une seule carte fusionnée comme la grille Équipes.
                        const rooms = showRooms ? h.rooms : [{ room: undefined, need: h.need, assistants: h.assistants, missing: h.missing }];
                        return (
                          <div className={cn("grid gap-2", rooms.length > 1 ? "sm:grid-cols-2" : "grid-cols-1")}>
                            {rooms.map((room) => (
                              <RoomCard key={room.room ?? "sans-salle"} room={room} day={day} staffing={staffing} half={h.half} date={date} />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomCard({
  room,
  day,
  staffing,
  half,
  date,
}: {
  room: RoomStaffing;
  day: DayStaffing["praticiens"][number];
  staffing: DayStaffing;
  half: string;
  date: string;
}) {
  const { findUser } = useTeam();
  const slotOf = (id: string) => day.slots.find((x) => x.assistantId === id)!;

  return (
    <div className={cn("rounded-lg border p-2.5", room.missing > 0 ? "border-rose-200 bg-rose-50/60" : "border-emerald-100 bg-emerald-50/50")}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{room.room ? `🏠 ${room.room}` : "Présence"}</span>
        <span className={cn("text-xs font-semibold tabular-nums", room.missing > 0 ? "text-rose-700" : "text-emerald-700")}>
          {room.need === 0 ? "sans assistant" : `${room.assistants.length}/${room.need}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {room.assistants.map((id) => {
          const u = findUser(id);
          const s = slotOf(id);
          if (!u || !s) return null;
          return (
            <Popover key={id}>
              <PopoverTrigger asChild>
                <button
                  title={`${fullName(u)} · ${KIND_LABEL[s.kind]}. Cliquer pour agir.`}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:ring-1 hover:ring-slate-300",
                    s.kind === "titulaire"
                      ? "bg-emerald-100 text-emerald-900"
                      : s.kind === "pret"
                        ? "border border-violet-300 bg-violet-50 text-violet-900"
                        : "border border-dashed border-sky-300 bg-sky-50 text-sky-900"
                  )}
                >
                  {s.kind === "backup" && <RefreshCw className="size-3 shrink-0" />}
                  {s.kind === "pret" && <span className="shrink-0">⇄</span>}
                  {fullName(u)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <p className="px-2 py-1 text-xs text-slate-500">
                  {fullName(u)} · {KIND_LABEL[s.kind]} avec {displayName(day.praticien)} ·{" "}
                  {fromISODate(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </PopoverContent>
            </Popover>
          );
        })}
        {room.missing > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="Voir pourquoi et agir"
                className="flex items-center gap-1 rounded border border-dashed border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                <UserX className="size-3 shrink-0" /> Manque {room.missing}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4" align="start">
              <p className="mb-3 text-sm font-medium text-slate-900">
                {room.room ? `${room.room} — ` : ""}Il manque {room.missing} assistant{room.missing > 1 ? "s" : ""} à {displayName(day.praticien)} le{" "}
                {half === "matin" ? "matin" : "l'après-midi"}
              </p>
              <GapActions day={day} staffing={staffing} showLink />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
