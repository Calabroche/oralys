"use client";

import { RefreshCw, UserX } from "lucide-react";
import { GapActions } from "@/components/team/GapActions";
import { useTeam } from "@/context/TeamDataContext";
import { ABSENCE_TYPE_LABELS, DayStaffing, absenceOn, displayName, fullName, isChairAssistant, teamMembersOn } from "@/lib/team";
import { activityName, activityType, needSummary } from "@/lib/semaine";
import { ACTIVITY_COLOR_CLASSES } from "@/utils/colors";
import { HalfDay } from "@/types/team";
import { UserAvatar, absenceTone } from "@/components/team/shared";
import { AbsencePopover } from "@/components/team/AbsencePopover";
import { PersonLink, usePersonSheet } from "@/components/team/PersonSheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Undo2, UserRound } from "lucide-react";
import { fromISODate, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

const DAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const KIND_LABEL = { titulaire: "titulaire", backup: "back-up", pret: "prêté(e) pour la journée" } as const;

/**
 * Vue « binômes » : une ligne par praticien, et pour chaque jour les assistants réellement
 * à ses côtés (titulaire ou back-up), avec les manques par rapport à son besoin.
 */
/** Tri des assistants dans une case : matin seulement, journée, après-midi seulement. */
const halfOrder = (partial?: HalfDay) => (partial === "matin" ? 0 : partial === "apres_midi" ? 2 : 1);

export function BinomesCalendar({
  dates,
  staffing,
  readOnly = false,
  editablePraticienId,
  onDeclare,
}: {
  dates: string[];
  staffing: Map<string, DayStaffing>;
  /** Consultation seule (sans droit « Planning d'équipe ») : la grille est inerte, aucun clic ni action. */
  readOnly?: boolean;
  /** En lecture seule, un praticien peut quand même agir sur sa propre ligne (manques, besoin du jour, prêts). */
  editablePraticienId?: string;
  onDeclare: (userId: string, date: string) => void;
}) {
  const { findUser, users, absences, now, dayOverrides, removeLoan } = useTeam();
  const { open: openPerson } = usePersonSheet();
  const today = toISODate(now());
  const compact = dates.length > 10;
  const first = staffing.get(dates[0]);
  const rows = first?.praticiens ?? [];

  const name = (id: string) => findUser(id)?.firstName ?? "?";

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50/80">
            <th className="sticky left-0 z-10 w-64 min-w-64 bg-slate-50 px-4 py-2 text-left text-xs font-medium text-slate-500">Praticien · besoin</th>
            {dates.map((iso) => {
              const d = fromISODate(iso);
              const missing = staffing.get(iso)?.praticiens.reduce((s, p) => s + p.missing, 0) ?? 0;
              return (
                <th key={iso} className={cn("px-0.5 py-2 text-center font-normal", compact ? "min-w-10" : "min-w-32", iso === today && "bg-pink-50")}>
                  <div className={cn("text-[0.68rem] text-slate-500 uppercase", iso === today && "text-pink-700")}>{DAY_SHORT[d.getDay()]}</div>
                  <div className={cn("text-sm font-medium", iso === today ? "text-pink-700" : "text-slate-800")}>{d.getDate()}</div>
                  {missing > 0 && <div className="mt-0.5 text-[0.65rem] font-medium text-rose-600">−{missing}</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ profile, praticien }) => {
            // Seuls les assistants dentaires comptent (un rattachement d'aide dentaire est signalé dans le profil, pas ici).
            const chair = (l: { userId: string }) => { const u = findUser(l.userId); return Boolean(u && isChairAssistant(u)); };
            const titulaires = profile.team.filter((l) => l.priority === "titulaire" && chair(l)).sort((a, b) => a.rank - b.rank);
            const backups = profile.team.filter((l) => l.priority === "backup" && chair(l)).sort((a, b) => a.rank - b.rank);
            return (
              <tr key={profile.id} className="border-b align-top" inert={readOnly && praticien.id !== editablePraticienId}>
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={praticien} className="size-7 text-[0.65rem]" />
                    <div className="min-w-0">
                      <PersonLink userId={praticien.id} className="block truncate font-medium text-slate-900">
                        {displayName(praticien)}
                      </PersonLink>
                      <div className="text-xs text-slate-500">
                        {needSummary(profile)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-[0.7rem] leading-snug text-slate-500">
                    <span className="text-emerald-700">Titulaire{titulaires.length > 1 ? "s" : ""} : </span>
                    {titulaires.map((l) => `${name(l.userId)}${l.days.length ? ` (${l.days.map((d) => d.slice(0, 3)).join(", ")})` : ""}`).join(", ") || "aucun"}
                    <br />
                    <span className="text-sky-700">Back-up : </span>
                    {backups.map((l) => name(l.userId)).join(", ") || "aucun"}
                  </div>
                </td>
                {dates.map((iso) => {
                  const day = staffing.get(iso)?.praticiens.find((p) => p.profile.id === profile.id);
                  if (!day || day.status === "repos") {
                    return (
                      <td key={iso} className={cn("p-1", iso === today && "bg-pink-50/50")}>
                        <div className="h-full min-h-12 rounded-md bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_3px,transparent_3px,transparent_7px)]" title="Ne consulte pas" />
                      </td>
                    );
                  }
                  if (day.status === "absent") {
                    const abs = absenceOn(praticien.id, iso, absences)!;
                    return (
                      <td key={iso} className={cn("p-1", iso === today && "bg-pink-50/50")}>
                        <AbsencePopover absence={abs} date={iso}>
                          <button className={cn("flex min-h-12 w-full items-center justify-center rounded-md border text-xs font-medium", absenceTone(abs.type))}>
                            {compact ? "—" : abs.source === "soins" ? `${abs.motif?.replace(" (agenda Soins)", "")} · agenda Soins` : `${ABSENCE_TYPE_LABELS[abs.type]} · agenda fermé`}
                          </button>
                        </AbsencePopover>
                      </td>
                    );
                  }
                  // Une case = une journée ; en vue semaine, elle est découpée par demi-journée (activité, besoin, présents, manque).
                  const slotOf = (id: string) => day.slots.find((x) => x.assistantId === id)!;
                  const renderChip = (s: (typeof day.slots)[number], key: string) => {
                    const u = findUser(s.assistantId)!;
                    return (
                            <Popover key={key}>
                              <PopoverTrigger asChild>
                                <button
                                  title={`${fullName(u)} · ${KIND_LABEL[s.kind]}. Cliquer pour agir.`}
                                  className={cn(
                                    "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium hover:ring-1 hover:ring-slate-300",
                                    s.kind === "titulaire"
                                      ? "bg-emerald-100 text-emerald-900"
                                      : s.kind === "pret"
                                        ? "border border-violet-300 bg-violet-50 text-violet-900"
                                        : "border border-dashed border-sky-300 bg-sky-50 text-sky-900"
                                  )}
                                >
                                  {s.kind === "backup" && <RefreshCw className="size-3 shrink-0" />}
                                  {s.kind === "pret" && <span className="shrink-0">⇄</span>}
                                  {compact ? u.firstName[0] + u.lastName[0] : u.firstName}
                                  {compact && s.partial && <span className="font-normal opacity-70">½</span>}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2" align="start">
                                <p className="px-2 pt-1 pb-2 text-xs text-slate-500">
                                  {fullName(u)} · {KIND_LABEL[s.kind]} avec {displayName(praticien)} le {fromISODate(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                </p>
                                {s.kind === "pret" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-violet-700"
                                    onClick={() => {
                                      const loan = dayOverrides.find((o) => o.date === iso && o.assistantId === u.id);
                                      if (loan) removeLoan(loan.id);
                                    }}
                                  >
                                    <Undo2 /> Retirer le prêt du jour
                                  </Button>
                                )}
                                {!readOnly && (
                                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onDeclare(u.id, iso)}>
                                    <CalendarPlus /> Déclarer absent(e) ce jour
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openPerson(u.id)}>
                                  <UserRound /> Voir la fiche de {u.firstName}
                                </Button>
                              </PopoverContent>
                            </Popover>
                    );
                  };
                  const renderGap = (label: React.ReactNode) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                title="Voir pourquoi et agir"
                                className="flex items-center gap-1 rounded border border-dashed border-rose-300 bg-white px-1.5 py-0.5 text-left text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                <UserX className="size-3 shrink-0" />
                                {label}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-4" align="start">
                              <p className="mb-3 text-sm font-medium text-slate-900">
                                Il manque {day.missing} assistant{day.missing > 1 ? "s" : ""} à {displayName(praticien)} le{" "}
                                {fromISODate(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                <span className="mt-1 block space-y-0.5 text-xs font-normal text-slate-500">
                                  {day.byHalf.map((h) => (
                                    <span key={h.half} className={cn("block", h.missing > 0 && "font-medium text-rose-700")}>
                                      {h.half === "matin" ? "Matin" : "Après-midi"}
                                      {h.activities.length > 0 && ` (${h.activities.map(activityName).join(", ").toLowerCase()})`} : besoin {h.need}, {h.assistants.length} présent
                                      {h.assistants.length > 1 ? "s" : ""}
                                    </span>
                                  ))}
                                </span>
                              </p>
                              <GapActions day={day} staffing={staffing.get(iso)!} showLink />
                            </PopoverContent>
                          </Popover>
                  );
                  return (
                    <td key={iso} className={cn("p-1", iso === today && "bg-pink-50/50")}>
                      <div className={cn("flex min-h-12 flex-col gap-1 rounded-md p-1", day.missing > 0 ? "bg-rose-50 ring-1 ring-rose-200" : "bg-emerald-50/60")}>
                        {compact ? (
                          <>
                            {day.need === 0 && <span className="px-1 py-0.5 text-xs text-slate-500">·</span>}
                            {[...day.slots].sort((a, b) => halfOrder(a.partial) - halfOrder(b.partial)).map((s) => renderChip(s, s.assistantId))}
                            {day.missing > 0 && renderGap(`−${day.missing}`)}
                          </>
                        ) : (
                          day.byHalf.map((h) => (
                            <div key={h.half} className={cn("rounded border bg-white/80 p-1", h.missing > 0 ? "border-rose-200" : "border-emerald-100")}>
                              <div className="mb-0.5 flex flex-wrap items-center gap-1 px-0.5">
                                <span className="text-[0.62rem] font-semibold tracking-wide text-slate-500 uppercase">{h.half === "matin" ? "Matin" : "Aprèm"}</span>
                                {h.activities.map((a) => (
                                  <span key={a} className={cn("rounded border px-1 text-[0.6rem] font-medium", ACTIVITY_COLOR_CLASSES[activityType(a)?.color ?? "gray"].chip)}>
                                    {activityName(a)}
                                  </span>
                                ))}
                                <span className={cn("ml-auto text-[0.65rem] font-semibold tabular-nums", h.missing > 0 ? "text-rose-700" : "text-emerald-700")} title="Présents / besoin">
                                  {h.need === 0 ? "sans assistant" : `${h.assistants.length}/${h.need}`}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {h.assistants.map((id) => renderChip(slotOf(id), `${h.half}-${id}`))}
                                {h.missing > 0 && renderGap(`Manque ${h.missing}`)}
                              </div>
                            </div>
                          ))
                        )}
                        {day.dayNeed && !compact && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-fit truncate rounded px-1 text-left text-[0.65rem] text-emerald-800 hover:bg-white" title="Besoin ajusté pour la journée. Cliquer pour rétablir.">
                                Besoin {day.need} ce jour (au lieu de {day.baseNeed})
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-4" align="start">
                              <GapActions day={day} staffing={staffing.get(iso)!} />
                            </PopoverContent>
                          </Popover>
                        )}
                        {!compact &&
                          teamMembersOn(day, staffing.get(iso)!, users, absences, dayOverrides)
                            // Les back-ups ne sont expliqués que s'il manque quelqu'un ; les titulaires toujours.
                            .filter((m) => m.state !== "present" && m.state !== "autre_jour" && (m.priority === "titulaire" || day.missing > 0))
                            .map((m) =>
                              m.absence ? (
                                <AbsencePopover key={m.user.id} absence={m.absence} date={iso}>
                                  <button
                                    title="Absent(e). Cliquer pour la/le remettre présent(e)."
                                    className="w-fit truncate rounded px-1 text-left text-[0.65rem] text-slate-500 line-through hover:bg-white hover:text-slate-700"
                                  >
                                    {m.user.firstName} absent(e)
                                  </button>
                                </AbsencePopover>
                              ) : (
                                <span key={m.user.id} title={m.label} className="truncate px-1 text-[0.65rem] text-slate-500">
                                  {m.state === "ailleurs"
                                    ? `${m.user.firstName} → Dr ${m.elsewhere?.lastName ?? "?"}${m.loan ? " (prêt)" : ""}`
                                    : `${m.user.firstName} : ${m.label.includes("ne travaille pas") ? "repos" : "libre"}`}
                                </span>
                              )
                            )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}

        </tbody>
      </table>
    </div>
  );
}
