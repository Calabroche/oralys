"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { ABSENCE_TYPE_LABELS, fullName, roleNames, worksOn } from "@/lib/team";
import { MonthTime, PUNCH_LABELS, SOURCE_LABELS, decimalHours, formatMinutes, monthTime, timeOf } from "@/lib/time";
import { TeamAbsence, TeamUser } from "@/types/team";
import { cn } from "@/lib/utils";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Fichier CSV lisible par Excel en français : séparateur « ; », virgule décimale, BOM UTF-8. */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Récapitulatif du mois pour préparer la paie : heures travaillées face au contrat mensualisé,
 * heures au-delà du contrat semaine par semaine, absences et anomalies à corriger avant l'envoi.
 * Ceux qui voient toute l'équipe (gestionnaire…) exportent le récapitulatif et le détail en CSV.
 */
export function MonthView({ staff, manager, now }: { staff: TeamUser[]; manager: boolean; now: Date }) {
  const { punches, absences, roles, log, findUser } = useTeam();
  const [cursor, setCursor] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isCurrent = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const isFuture = new Date(cursor.year, cursor.month, 1) > now;
  const monthLabel = `${MONTHS[cursor.month]} ${cursor.year}`;
  const slug = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const rows = staff.map((user) => ({ user, m: monthTime(user, cursor.year, cursor.month, punches, absences, today, nowMin, worksOn) }));
  const weeks = rows[0]?.m.weeks ?? [];
  const total = (f: (m: MonthTime) => number) => rows.reduce((n, r) => n + f(r.m), 0);
  const overtime = total((m) => m.overtime25 + m.overtime50);
  const complementary = total((m) => m.complementary);
  const anomalies = total((m) => m.anomalies);

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  function exportSummary() {
    downloadCsv(`heures-${slug}-recapitulatif.csv`, [
      [
        "Nom",
        "Prénom",
        "Rôle",
        "Contrat hebdo (h)",
        "Contrat mensuel (h)",
        "Heures travaillées (h)",
        "Heures sup 25 % (h)",
        "Heures sup 50 % (h)",
        "Heures complémentaires (h)",
        ...(Object.keys(ABSENCE_TYPE_LABELS) as TeamAbsence["type"][]).map((t) => `Jours ${ABSENCE_TYPE_LABELS[t].toLowerCase()}`),
        "Jours pointés",
        "Anomalies non corrigées",
      ],
      ...rows.map(({ user, m }) => [
        user.lastName,
        user.firstName,
        roleNames(user, roles).join(" + "),
        user.weeklyHours ?? "",
        decimalHours(m.contractMinutes),
        decimalHours(m.workedMinutes),
        decimalHours(m.overtime25),
        decimalHours(m.overtime50),
        decimalHours(m.complementary),
        ...(Object.keys(ABSENCE_TYPE_LABELS) as TeamAbsence["type"][]).map((t) => m.absenceDays[t]),
        m.daysWorked,
        m.anomalies,
      ]),
    ]);
    log("pointage.export", `Export du récapitulatif des heures de ${monthLabel} (${rows.length} salariés)${isCurrent ? ", mois en cours" : ""}`);
    toast.success(`Récapitulatif de ${monthLabel} exporté`, { description: "Fichier CSV, s'ouvre dans Excel ou le logiciel de paie." });
  }

  function exportDetail() {
    const ids = new Set(staff.map((u) => u.id));
    const list = punches.filter((p) => ids.has(p.userId) && p.at.startsWith(slug)).sort((a, b) => a.at.localeCompare(b.at));
    downloadCsv(`heures-${slug}-pointages.csv`, [
      ["Date", "Nom", "Prénom", "Pointage", "Heure", "Source", "Poste", "Code PIN vérifié", "Corrigé par", "Motif"],
      ...list.map((p) => {
        const u = findUser(p.userId);
        const by = findUser(p.correctedById);
        return [
          p.at.slice(0, 10),
          u?.lastName ?? "",
          u?.firstName ?? "",
          PUNCH_LABELS[p.kind],
          timeOf(p.at),
          SOURCE_LABELS[p.source],
          p.workstation ?? "",
          p.pinVerified ? "oui" : "",
          by ? fullName(by) : "",
          p.note ?? "",
        ];
      }),
    ]);
    log("pointage.export", `Export du détail des pointages de ${monthLabel} (${list.length} pointages)`);
    toast.success(`Détail des pointages de ${monthLabel} exporté`, { description: `${list.length} pointages, fichier CSV.` });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={CalendarDays} label={`Heures travaillées (${MONTHS[cursor.month]})`} value={formatMinutes(total((m) => m.workedMinutes))} />
        <Kpi
          icon={Timer}
          label="Heures sup et complémentaires"
          value={formatMinutes(overtime + complementary)}
          tone={overtime + complementary > 0 ? "amber" : undefined}
        />
        <Kpi icon={AlertTriangle} label="Anomalies à corriger avant la paie" value={String(anomalies)} tone={anomalies > 0 ? "rose" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => move(-1)} aria-label="Mois précédent">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>
          Ce mois-ci
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="Mois suivant">
          <ChevronRight />
        </Button>
        <span className="ml-2 text-sm font-medium capitalize text-slate-800">{monthLabel}</span>
        {isCurrent && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
            Mois en cours : chiffres provisoires au {now.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </span>
        )}
        {manager && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={exportSummary} disabled={isFuture}>
              <FileSpreadsheet /> Exporter le récapitulatif (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={exportDetail} disabled={isFuture}>
              <Download /> Détail des pointages (CSV)
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-xs text-slate-500">
              <th className="px-4 py-2 text-left font-medium">Collaborateur</th>
              {weeks.map((w) => (
                <th key={w.start} className="min-w-28 px-2 py-2 text-center font-normal">
                  <div className="font-medium text-slate-700">{w.label.split(" · ")[0]}</div>
                  <div className="text-[0.65rem]">{w.label.split(" · ")[1]}</div>
                </th>
              ))}
              <th className="min-w-40 px-4 py-2 text-left font-medium">Total du mois</th>
              <th className="px-3 py-2 text-right font-medium">Sup 25 %</th>
              <th className="px-3 py-2 text-right font-medium">Sup 50 %</th>
              <th className="px-3 py-2 text-right font-medium">Complém.</th>
              <th className="px-3 py-2 text-left font-medium">Absences</th>
              <th className="px-3 py-2 text-right font-medium">Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, m }) => {
              const pct = m.contractMinutes ? Math.min(100, (m.workedMinutes / m.contractMinutes) * 100) : 0;
              const abs = (Object.keys(m.absenceDays) as TeamAbsence["type"][]).filter((t) => m.absenceDays[t] > 0);
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={user} className="size-8" />
                      <div>
                        <p className="font-medium whitespace-nowrap text-slate-900">{fullName(user)}</p>
                        <p className="text-xs whitespace-nowrap text-slate-500">
                          {user.weeklyHours} h / sem. · {decimalHours(m.contractMinutes)} h / mois
                        </p>
                      </div>
                    </div>
                  </td>
                  {m.weeks.map((w) => (
                    <td key={w.start} className="px-2 py-2.5 text-center">
                      <span className="font-medium text-slate-900">{w.workedMinutes ? formatMinutes(w.workedMinutes) : "—"}</span>
                      {w.overMinutes > 0 && <span className="block text-[0.7rem] font-medium text-amber-700">+{formatMinutes(w.overMinutes)}</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <p className="whitespace-nowrap">
                      <span className="font-medium text-slate-900">{formatMinutes(m.workedMinutes)}</span>
                      <span className="text-slate-500"> / {decimalHours(m.contractMinutes)} h</span>
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <Num value={m.overtime25} />
                  <Num value={m.overtime50} />
                  <Num value={m.complementary} />
                  <td className="px-3 py-2.5 text-xs text-slate-600">
                    {abs.length === 0 ? <span className="text-slate-400">—</span> : abs.map((t) => `${m.absenceDays[t]} j ${ABSENCE_TYPE_LABELS[t].toLowerCase()}`).join(" · ")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {m.anomalies > 0 ? (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-sm font-medium text-rose-700">{m.anomalies}</span>
                    ) : (
                      <span className="text-sm text-slate-400">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Contrat mensualisé = heures hebdo × 52 / 12. Heures au-delà du contrat comptées par semaine (lundi → dimanche, rattachée au mois de son dimanche) :
        temps plein +25 % jusqu&apos;à 43 h puis +50 %, temps partiel en heures complémentaires. Règles à valider avec le cabinet comptable.
        {manager && " Chaque export est tracé dans le journal d'audit."}
      </p>
    </div>
  );
}

function Num({ value }: { value: number }) {
  return (
    <td className="px-3 py-2.5 text-right whitespace-nowrap">
      {value > 0 ? <span className="font-medium text-amber-700">{formatMinutes(value)}</span> : <span className="text-slate-400">—</span>}
    </td>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Timer; label: string; value: string; tone?: "amber" | "rose" }) {
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
