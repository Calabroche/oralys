"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Plus, Timer, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeam } from "@/context/TeamDataContext";
import { VersionGate } from "@/components/team/Version";
import { AbsenceBadge, PageHeader, UserAvatar } from "@/components/team/shared";
import { absenceOn, fullName, shortDate, worksOn } from "@/lib/team";
import { DayTime, PUNCH_LABELS, SOURCE_LABELS, formatMinutes, nowMinutesOf, timeOf, weekTime } from "@/lib/time";
import { PunchKind, TeamUser } from "@/types/team";
import { addDays, fromISODate, startOfWeek, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

const DAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default function TempsPage() {
  return (
    <VersionGate feature="pointage">
      <Temps />
    </VersionGate>
  );
}

/**
 * Temps de travail (V4) : les pointages de la semaine, personne par personne, comparés au contrat.
 * Le gestionnaire voit tout le monde et corrige les oublis ; chacun voit ses propres heures.
 */
function Temps() {
  const { users, punches, absences, can, sessionUser } = useTeam();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const today = toISODate(now);
  const [monday, setMonday] = useState(() => toISODate(startOfWeek(now)));
  const [open, setOpen] = useState<{ user: TeamUser; day: DayTime } | null>(null);
  const manager = can("team.planning") || can("param.cabinet");

  const dates = useMemo(() => Array.from({ length: 6 }, (_, i) => toISODate(addDays(fromISODate(monday), i))), [monday]);
  const staff = users
    .filter((u) => u.status === "actif" && (manager || u.id === sessionUser?.id))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const rows = staff.map((u) => ({ user: u, week: weekTime(u, dates, punches, today, nowMinutesOf(now)) }));
  const isCurrentWeek = dates.includes(today);
  const weekPunches = punches.filter((p) => p.at.slice(0, 10) >= dates[0] && p.at.slice(0, 10) <= dates[5]);
  const fromBadges = weekPunches.length > 0 && weekPunches.every((p) => p.source !== "poste");

  const onSite = isCurrentWeek ? rows.filter((r) => r.week.days.find((d) => d.date === today)?.state === "en_poste").length : null;
  const extra = rows.reduce((n, r) => n + r.week.extraMinutes, 0);
  const anomalies = rows.reduce((n, r) => n + r.week.anomalies, 0);

  // Le détail ouvert suit les corrections faites dans la fenêtre.
  const openDay = open ? rows.find((r) => r.user.id === open.user.id)?.week.days.find((d) => d.date === open.day.date) ?? open.day : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <PageHeader
        title="Temps de travail"
        description="Arrivée, pause, reprise et départ, pointés par chacun sur son profil. Les heures sont comparées au contrat."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={UserCheck} label="En poste maintenant" value={onSite === null ? "—" : String(onSite)} />
        <Kpi icon={Timer} label="Au-delà du contrat (semaine)" value={formatMinutes(extra)} tone={extra > 0 ? "amber" : undefined} />
        <Kpi icon={AlertTriangle} label="Anomalies à corriger" value={String(anomalies)} tone={anomalies > 0 ? "rose" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => setMonday(toISODate(addDays(fromISODate(monday), -7)))} aria-label="Semaine précédente">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMonday(toISODate(startOfWeek(now)))}>
          Cette semaine
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => setMonday(toISODate(addDays(fromISODate(monday), 7)))} aria-label="Semaine suivante">
          <ChevronRight />
        </Button>
        <span className="ml-2 text-sm font-medium text-slate-800">
          {shortDate(dates[0])} → {shortDate(dates[5])}
        </span>
        {fromBadges && (
          <span className="ml-auto rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            Pointages importés des badges actuels (bipeurs)
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-xs text-slate-500">
              <th className="px-4 py-2 text-left font-medium">Collaborateur</th>
              {dates.map((iso) => {
                const d = fromISODate(iso);
                return (
                  <th key={iso} className={cn("min-w-28 px-1 py-2 text-center font-normal", iso === today && "bg-pink-50 text-pink-700")}>
                    <div className="uppercase">{DAY_SHORT[d.getDay()]}</div>
                    <div className="text-sm font-medium">{d.getDate()}</div>
                  </th>
                );
              })}
              <th className="min-w-40 px-4 py-2 text-left font-medium">Semaine</th>
              <th className="px-4 py-2 text-right font-medium">Au-delà du contrat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, week }) => {
              const pct = week.contractMinutes ? Math.min(100, (week.workedMinutes / week.contractMinutes) * 100) : 0;
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={user} className="size-8" />
                      <div>
                        <p className="font-medium text-slate-900">{fullName(user)}</p>
                        <p className="text-xs text-slate-500">{user.weeklyHours ? `Contrat ${user.weeklyHours} h / semaine` : "Sans contrat horaire"}</p>
                      </div>
                    </div>
                  </td>
                  {week.days.map((d) => {
                    const abs = absenceOn(user.id, d.date, absences);
                    if (d.date > today) return <td key={d.date} className="p-1" />;
                    if (abs && abs.status === "validee" && d.punches.length === 0) {
                      return (
                        <td key={d.date} className="p-1 text-center">
                          <AbsenceBadge absence={abs} compact />
                        </td>
                      );
                    }
                    if (!worksOn(user, d.date) && d.punches.length === 0) {
                      return (
                        <td key={d.date} className="p-1">
                          <div className="h-12 rounded-md bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_3px,transparent_3px,transparent_7px)]" title="Ne travaille pas ce jour-là" />
                        </td>
                      );
                    }
                    const first = d.punches[0];
                    const last = d.punches[d.punches.length - 1];
                    return (
                      <td key={d.date} className={cn("p-1", d.date === today && "bg-pink-50/40")}>
                        <button
                          onClick={() => setOpen({ user, day: d })}
                          className={cn(
                            "flex h-12 w-full flex-col items-center justify-center rounded-md border text-xs hover:ring-1 hover:ring-slate-300",
                            d.anomalies.length
                              ? "border-rose-300 bg-rose-50"
                              : d.punches.length
                                ? "border-slate-200 bg-white"
                                : d.date === today
                                  ? "border-dashed border-slate-300 bg-white"
                                  : "border-dashed border-rose-300 bg-white"
                          )}
                        >
                          {d.punches.length === 0 ? (
                            d.date === today ? <span className="text-slate-400">Pas encore pointé</span> : <span className="text-rose-600">Aucun pointage</span>
                          ) : (
                            <>
                              <span className="flex items-center gap-1 font-medium text-slate-900">
                                {d.anomalies.length > 0 && <AlertTriangle className="size-3 text-rose-600" />}
                                {d.state === "en_poste" && d.date === today && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
                                {formatMinutes(d.workedMinutes)}
                              </span>
                              <span className="font-mono text-[0.65rem] text-slate-500">
                                {timeOf(first.at)}–{last.kind === "depart" ? timeOf(last.at) : "…"}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    <p className="text-sm">
                      <span className="font-medium text-slate-900">{formatMinutes(week.workedMinutes)}</span>
                      {user.weeklyHours ? <span className="text-slate-500"> / {user.weeklyHours} h</span> : <span className="text-slate-500"> travaillées</span>}
                    </p>
                    {user.weeklyHours ? (
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className={cn("h-1.5 rounded-full", week.extraMinutes > 0 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {week.extraMinutes > 0 ? (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-sm font-medium text-amber-800">+{formatMinutes(week.extraMinutes)}</span>
                    ) : (
                      <span className="text-sm text-slate-400">{isCurrentWeek ? "semaine en cours" : "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Règles appliquées : 20 min de pause dès 6 h travaillées, 10 h de travail effectif au maximum par jour. Les praticiens pointent aussi ; sans contrat horaire, on affiche leurs heures sans calcul d'heures sup.
        {!manager && " Vous voyez vos propres heures ; le gestionnaire voit celles de toute l'équipe."}
      </p>

      <DayDialog open={open} day={openDay} canEdit={manager} onClose={() => setOpen(null)} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: "amber" | "rose" }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={cn("mt-1 text-3xl font-semibold", tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : "text-slate-900")}>{value}</p>
        </div>
        <Icon className={cn("size-6", tone === "amber" ? "text-amber-500" : tone === "rose" ? "text-rose-500" : "text-slate-300")} />
      </CardContent>
    </Card>
  );
}

/** Détail d'une journée : pointages, anomalies, et correction par le gestionnaire. */
function DayDialog({
  open,
  day,
  canEdit,
  onClose,
}: {
  open: { user: TeamUser } | null;
  day: DayTime | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { addPunch, removePunch, restorePunch, findUser } = useTeam();
  const [kind, setKind] = useState<PunchKind>("depart");
  const [time, setTime] = useState("17:30");
  const [note, setNote] = useState("");
  if (!open || !day) return null;
  const user = open.user;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {fullName(user)} · {fromISODate(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </DialogTitle>
          <DialogDescription>
            {formatMinutes(day.workedMinutes)} travaillées{day.breakMinutes > 0 ? `, ${day.breakMinutes} min de pause` : ""}.
          </DialogDescription>
        </DialogHeader>

        {day.anomalies.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {day.anomalies.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a}
              </li>
            ))}
          </ul>
        )}

        <ul className="divide-y rounded-lg border">
          {day.punches.length === 0 && <li className="p-3 text-sm text-slate-500">Aucun pointage ce jour-là.</li>}
          {day.punches.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-12 font-mono font-medium text-slate-900">{timeOf(p.at)}</span>
              <span className="flex-1">
                <span className="text-slate-800">{PUNCH_LABELS[p.kind]}</span>
                {p.note && <span className="block text-xs text-slate-500">« {p.note} » · par {findUser(p.correctedById)?.firstName ?? "?"}</span>}
                {p.workstation && <span className="block text-xs text-slate-400">{p.workstation}</span>}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[0.65rem] font-medium",
                  p.source === "correction" ? "bg-violet-50 text-violet-700" : p.source === "badge" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"
                )}
              >
                {SOURCE_LABELS[p.source]}
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Supprimer ce pointage"
                  onClick={() => {
                    const removed = removePunch(p.id);
                    if (removed) toast("Pointage supprimé", { duration: 10000, action: { label: "Annuler", onClick: () => restorePunch(removed) } });
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <form
            className="space-y-3 rounded-lg border bg-slate-50 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return toast.error("Indiquez le motif de la correction : il apparaît dans le journal d'audit.");
              const added = addPunch(user.id, `${day.date}T${time}:00`, kind, note.trim());
              toast.success(`${PUNCH_LABELS[kind]} ajouté(e) à ${time}`, { duration: 10000, action: { label: "Annuler", onClick: () => removePunch(added.id) } });
              setNote("");
            }}
          >
            <p className="text-sm font-medium text-slate-900">Ajouter un pointage oublié</p>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as PunchKind)}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {(Object.keys(PUNCH_LABELS) as PunchKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {PUNCH_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Heure</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Motif (tracé dans le journal)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. oubli de badge, confirmé par le praticien" className="bg-white" />
            </div>
            <Button type="submit" size="sm">
              <Plus /> Ajouter
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
