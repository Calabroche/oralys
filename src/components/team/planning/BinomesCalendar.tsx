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
import { useVersion } from "@/components/team/Version";
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
  const { has } = useVersion();
  const showRooms = has("multiSalles");
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
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={praticien} className="size-8 text-[0.68rem]" />
                    <div className="min-w-0">
                      <PersonLink userId={praticien.id} className="block truncate font-medium text-slate-900">
                        {displayName(praticien)}
                      </PersonLink>
                      <span className="inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.68rem] text-slate-600">{needSummary(profile)}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1 text-[0.7rem] leading-snug">
                    <p className="flex gap-1">
                      <span className="shrink-0 font-medium text-emerald-700">Titulaire{titulaires.length > 1 ? "s" : ""} :</span>
                      <span className="text-slate-600">
                        {titulaires.map((l) => `${name(l.userId)}${l.days.length ? ` (${l.days.map((d) => d.slice(0, 3)).join(", ")})` : ""}`).join(", ") || "aucun"}
                      </span>
                    </p>
                    <p className="flex gap-1">
                      <span className="shrink-0 font-medium text-sky-700">Back-up :</span>
                      <span className="text-slate-600">{backups.map((l) => name(l.userId)).join(", ") || "aucun"}</span>
                    </p>
                  </div>
                </td>
                {dates.map((iso) => {
                  const day = staffing.get(iso)?.praticiens.find((p) => p.profile.id === profile.id);
                  if (!day || day.status === "repos") {
                    return (
                      <td key={iso} className={cn("p-1.5", iso === today && "bg-pink-50/40")}>
                        <div className="h-full min-h-12 rounded-md bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_3px,transparent_3px,transparent_7px)]" title="Ne consulte pas" />
                      </td>
                    );
                  }
                  if (day.status === "absent") {
                    const abs = absenceOn(praticien.id, iso, absences)!;
                    return (
                      <td key={iso} className={cn("p-1.5", iso === today && "bg-pink-50/40")}>
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
                                    "flex items-center gap-1 truncate rounded px-1.5 py-1 text-left text-xs font-medium hover:ring-1 hover:ring-slate-300",
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
                  // Titulaire au cabinet mais pas au fauteuil sur ce créneau : en orange, tant qu'un back-up n'a pas pris sa place.
                  const renderOccupied = (o: { userId: string; label: string }, half: HalfDay, key: string) => {
                    const u = findUser(o.userId)!;
                    return (
                      <Popover key={key}>
                        <PopoverTrigger asChild>
                          <button
                            title={`${fullName(u)} est prévu(e) en titulaire mais sur « ${o.label} » ce créneau.`}
                            className="flex flex-col items-start rounded border border-amber-300 bg-amber-50 px-1.5 py-1 text-left text-xs font-medium text-amber-900 hover:ring-1 hover:ring-amber-400"
                          >
                            <span className="flex items-center gap-1">
                              {u.firstName} <span className="font-normal opacity-80">· titulaire</span>
                            </span>
                            <span className="line-clamp-2 text-[0.65rem] font-normal">sur {o.label}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-4" align="start">
                          <p className="mb-3 text-sm font-medium text-slate-900">
                            {u.firstName} est au cabinet {half === "matin" ? "ce matin-là" : "cet après-midi-là"}, mais sur « {o.label} »
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              Elle reste prévue comme titulaire de {displayName(praticien)}.
                              {has("remplacements") && " Choisissez un back-up : il prend sa place sur ce créneau."}
                            </span>
                          </p>
                          <GapActions day={day} staffing={staffing.get(iso)!} showLink />
                        </PopoverContent>
                      </Popover>
                    );
                  };
                  const renderGap = (label: React.ReactNode) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                title={has("remplacements") ? "Voir pourquoi et agir" : "Voir pourquoi (le combler arrive en V1)"}
                                className="flex items-center gap-1 rounded border border-dashed border-rose-300 bg-white px-1.5 py-1 text-left text-xs font-medium text-rose-700 hover:bg-rose-100"
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
                  // Le statut du jour (manque ou complet) se lit à l'accent de bordure des cartes, pas sur
                  // tout le fond de la cellule : moins de couleur au repos, pour que le manque ressorte.
                  const footnotes = !compact
                    ? teamMembersOn(day, staffing.get(iso)!, users, absences, dayOverrides).filter(
                        (m) => m.state !== "present" && m.state !== "autre_jour" && (m.priority === "titulaire" || day.missing > 0)
                      )
                    : [];
                  return (
                    <td key={iso} className={cn("p-1.5", iso === today && "bg-pink-50/40")}>
                      <div className="flex min-h-12 flex-col gap-1.5 rounded-md bg-slate-50/60 p-1">
                        {compact ? (
                          <>
                            {day.need === 0 && <span className="px-1 py-0.5 text-xs text-slate-500">·</span>}
                            {[...day.slots].sort((a, b) => halfOrder(a.partial) - halfOrder(b.partial)).map((s) => renderChip(s, s.assistantId))}
                            {day.missing > 0 && renderGap(`−${day.missing}`)}
                          </>
                        ) : (
                          day.byHalf.map((h) => (
                            <div
                              key={h.half}
                              className={cn(
                                "rounded-md border-l-[3px] border-y border-r border-slate-100 bg-white p-1.5",
                                h.missing > 0 ? "border-l-rose-400" : "border-l-emerald-300"
                              )}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-1">
                                <span className="text-[0.63rem] font-semibold tracking-wide text-slate-400 uppercase">{h.half === "matin" ? "Matin" : "Aprèm"}</span>
                                {h.activities.map((a) => (
                                  <span key={a} className={cn("rounded border px-1 text-[0.6rem] font-medium", ACTIVITY_COLOR_CLASSES[activityType(a)?.color ?? "gray"].chip)}>
                                    {activityName(a)}
                                  </span>
                                ))}
                                <span
                                  className={cn(
                                    "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums",
                                    h.need === 0 ? "text-slate-400" : h.missing > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                                  )}
                                  title="Présents / besoin"
                                >
                                  {h.need === 0 ? "sans assistant" : `${h.assistants.length}/${h.need}`}
                                </span>
                              </div>
                              {showRooms && h.rooms.length > 1 ? (
                                <div className="flex flex-col gap-1">
                                  {h.rooms.map((room) => (
                                    <div key={room.room ?? "sans-salle"} className="rounded bg-slate-50 p-1">
                                      <div className="flex items-center gap-1 text-[0.6rem] font-medium text-slate-500">
                                        <span>🏠 {room.room ?? "Salle"}</span>
                                        <span className={cn("ml-auto font-semibold tabular-nums", room.missing > 0 ? "text-rose-700" : "text-emerald-700")}>
                                          {room.assistants.length}/{room.need}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 flex flex-col gap-1">
                                        {room.assistants.map((id) => renderChip(slotOf(id), `${h.half}-${room.room}-${id}`))}
                                        {room.missing > 0 && h.occupied.map((o) => renderOccupied(o, h.half, `${h.half}-${room.room}-occ-${o.userId}`))}
                                        {room.missing > 0 && renderGap(`Manque ${room.missing}`)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {h.assistants.map((id) => renderChip(slotOf(id), `${h.half}-${id}`))}
                                  {/* Chaque back-up ou prêt placé prend la place d'un titulaire occupé ailleurs ; les autres restent en orange. */}
                                  {h.occupied.map((o, i) =>
                                    i < h.assistants.filter((id) => slotOf(id).kind !== "titulaire").length ? (
                                      <span key={o.userId} className="truncate px-1 text-[0.65rem] text-amber-700" title={`${findUser(o.userId)?.firstName} est sur « ${o.label} » ce créneau`}>
                                        ↻ remplace {findUser(o.userId)?.firstName} ({o.label})
                                      </span>
                                    ) : (
                                      renderOccupied(o, h.half, `${h.half}-occ-${o.userId}`)
                                    )
                                  )}
                                  {h.missing > 0 && renderGap(`Manque ${h.missing}`)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        {((day.dayNeed && !compact) || footnotes.length > 0) && (
                          <div className="space-y-0.5 border-t border-dashed border-slate-200 pt-1">
                            {day.dayNeed && !compact && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="block w-fit truncate rounded px-1 text-left text-[0.65rem] text-emerald-800 hover:bg-white" title="Besoin ajusté pour la journée. Cliquer pour rétablir.">
                                    Besoin {day.need} ce jour (au lieu de {day.baseNeed})
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 p-4" align="start">
                                  <GapActions day={day} staffing={staffing.get(iso)!} />
                                </PopoverContent>
                              </Popover>
                            )}
                            {footnotes.map((m) =>
                              m.absence ? (
                                <AbsencePopover key={m.user.id} absence={m.absence} date={iso}>
                                  <button
                                    title="Absent(e). Cliquer pour la/le remettre présent(e)."
                                    className="block w-fit truncate rounded px-1 text-left text-[0.65rem] text-slate-500 line-through hover:bg-white hover:text-slate-700"
                                  >
                                    {m.user.firstName} absent(e)
                                  </button>
                                </AbsencePopover>
                              ) : (
                                <span key={m.user.id} title={m.label} className="block truncate px-1 text-[0.65rem] text-slate-500">
                                  {m.state === "ailleurs"
                                    ? `${m.user.firstName} → Dr ${m.elsewhere?.lastName ?? "?"}${m.loan ? " (prêt)" : ""}`
                                    : `${m.user.firstName} : ${m.label.includes("ne travaille pas") ? "repos" : "libre"}`}
                                </span>
                              )
                            )}
                          </div>
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
