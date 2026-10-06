"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, ChevronLeft, ChevronRight, DoorOpen, Mail, Pencil, Phone, Stethoscope, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/context/TeamDataContext";
import { RoleBadges, UserAvatar, toneFor } from "@/components/team/shared";
import { ContractHoursField, HoursEditor } from "@/components/team/WorkSchedule";
import { usePersonRights } from "@/components/team/profile/rights";
import { ETAT_LABELS, MissionEtatBadge, RateText, primes12Mois } from "@/components/team/profile/RHSections";
import { assiduite, ASSIDUITE_NB } from "@/lib/assiduite";
import { cpSummary, CP_PAR_AN, hasCongesPayes } from "@/lib/conges";
import { daysFromHours, dayMinutes, effectiveHours, hoursLabel, rangesError, toMinutes, weekMinutes } from "@/lib/horaires";
import { MissionEtat, TAUX_MISSIONS_NB, frequenceLabel, missionsDueOn, missionRate, missionStatus, missionsOf, missionsSummary, personMissionRate, rateTone } from "@/lib/missions";
import { ABSENCE_TYPE_LABELS, absenceOn, dayStaffing, fullName, isChairAssistant, shortDate, worksOn } from "@/lib/team";
import { PraticienProfile, TeamUser, TimeRange, WeekHours } from "@/types/team";
import { WEEKDAYS, WEEKDAY_LABELS, addDays, formatShortDate, fromISODate, startOfWeek, toISODate } from "@/utils/date";
import { Weekday } from "@/types";
import { activityName } from "@/lib/semaine";
import { cn } from "@/lib/utils";

/** Praticien avec qui la personne travaille par défaut (rattachement, facultatif hors fauteuil). */
export function travailleAvec(u: TeamUser, profiles: PraticienProfile[]): PraticienProfile | undefined {
  if (u.roleIds.includes("role-praticien")) return undefined;
  return profiles.find((p) => p.id === u.defaultEnvironmentId);
}

export function dateEntree(u: TeamUser): string {
  return u.contrat?.dateEmbauche ?? u.createdAt.slice(0, 10);
}

/** Dernier 1:1 ou entretien déjà tenu. */
export function dernierEntretien(u: TeamUser): { label: string; date: string } | null {
  const all = [
    ...(u.oneOnOne?.history ?? []).map((h) => ({ label: "1:1", date: h.date })),
    ...(u.entretienPro?.history ?? []).map((h) => ({ label: "Entretien professionnel", date: h.date })),
  ];
  return all.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

/** Réduit une photo à 256 px de côté pour la garder légère. */
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoEditor({ user }: { user: TeamUser }) {
  const { updateUser } = useTeam();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const photo = await resizePhoto(file);
            const res = updateUser({ ...user, photo });
            if (res.ok) toast.success("Photo mise à jour");
            else toast.error(res.error);
          } catch {
            toast.error("Image illisible");
          }
        }}
      />
      <Button variant="outline" size="xs" onClick={() => input.current?.click()}>
        <Camera /> {user.photo ? "Changer la photo" : "Ajouter une photo"}
      </Button>
      {user.photo && (
        <Button variant="ghost" size="xs" onClick={() => updateUser({ ...user, photo: undefined })} aria-label="Retirer la photo">
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

function PhoneField({ user, editable }: { user: TeamUser; editable: boolean }) {
  const { updateUser } = useTeam();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.phone ?? "");
  if (editing)
    return (
      <span className="flex items-center gap-1.5">
        <Input
          autoFocus
          type="tel"
          className="h-7 w-40 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateUser({ ...user, phone: value.trim() || undefined });
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => {
            updateUser({ ...user, phone: value.trim() || undefined });
            setEditing(false);
          }}
        />
      </span>
    );
  return (
    <span className="flex items-center gap-1.5">
      {user.phone ?? <span className="text-slate-400">Pas de téléphone</span>}
      {editable && (
        <button className="text-slate-400 hover:text-slate-700" onClick={() => setEditing(true)} aria-label="Modifier le téléphone">
          <Pencil className="size-3" />
        </button>
      )}
    </span>
  );
}

/** Colonne de gauche de la fiche, comme la fiche patient de Soins : identité et coordonnées. */
export function IdentityCard({ user, profile, extra }: { user: TeamUser; profile?: PraticienProfile; extra?: React.ReactNode }) {
  const { profiles } = useTeam();
  const rights = usePersonRights(user);
  const avec = travailleAvec(user, profiles);
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <UserAvatar user={user} className="size-24 text-2xl" />
          {rights.canEditContact && <PhotoEditor user={user} />}
          <div>
            <p className="text-lg font-semibold text-slate-900">{fullName(user)}</p>
            <div className="mt-1 flex justify-center">
              <RoleBadges user={user} />
            </div>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <Row icon={<Mail className="size-3.5" />} label="Email">
            <span className="break-all">{user.email}</span>
          </Row>
          <Row icon={<Phone className="size-3.5" />} label="Téléphone">
            <PhoneField user={user} editable={rights.canEditContact} />
          </Row>
          {avec && (
            <Row icon={<UsersRound className="size-3.5" />} label="Travaille avec">
              <Link href={`/team/profil/${avec.praticienUserId}`} className="text-pink-700 hover:underline">
                {avec.label}
              </Link>
            </Row>
          )}
          {profile && (
            <Row icon={<DoorOpen className="size-3.5" />} label="Salle">
              {profile.rooms.join(", ") || "Non définie"}
            </Row>
          )}
          <Row label="Date d'entrée">{formatShortDate(dateEntree(user))}</Row>
          {(user.rpps || user.numeroAM) && (
            <Row icon={<Stethoscope className="size-3.5" />} label="Identifiants">
              <span className="tabular-nums">
                {user.rpps && `RPPS ${user.rpps}`}
                {user.rpps && user.numeroAM && <br />}
                {user.numeroAM && `AM ${user.numeroAM}`}
              </span>
            </Row>
          )}
        </dl>
        {extra}
        <Link href={`/team/planning?view=${profile ? "binomes" : "personnes"}&user=${user.id}`} className="block text-center text-xs text-pink-700 hover:underline">
          Voir dans le planning →
        </Link>
      </CardContent>
    </Card>
  );
}

function Row({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 text-right text-slate-800">{children}</dd>
    </div>
  );
}

/**
 * Récapitulatif d'une personne : utilisé sous l'identité de la fiche et dans la fiche latérale (trombinoscope).
 * Assiduité, congés, salaire et missions ne s'affichent qu'à ceux qui peuvent les voir.
 */
export function RecapContent({ user, compact }: { user: TeamUser; compact?: boolean }) {
  const { absences, now } = useTeam();
  const rights = usePersonRights(user);
  const today = toISODate(now());
  const salarie = hasCongesPayes(user);
  const ass = salarie ? assiduite(user, absences, today) : null;
  const cp = salarie ? cpSummary(user, absences, today) : null;
  const ms = missionsSummary(user, today);
  const rate = personMissionRate(user, today, (iso) => worksOn(user, iso));
  const entretien = dernierEntretien(user);
  const primes = salarie ? primes12Mois(user, today) : null;
  const recadrages = [...(user.recadrages ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const RATE_TILE = { vert: "border-emerald-200 bg-emerald-50", orange: "border-amber-200 bg-amber-50", rouge: "border-rose-200 bg-rose-50" } as const;
  const tile = (label: string, value: React.ReactNode, hint?: React.ReactNode, tone?: string) => (
    <div className={cn("rounded-lg border px-3 py-2", tone ?? "bg-slate-50")}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
  if (!rights.canSeeSensitive) return null;
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
        {ass && tile("Assiduité", `${ass.taux.toLocaleString("fr-FR")} %`, `${ass.absents} j d'absence sur 12 mois`)}
        {cp && tile("Congés payés", `${cp.solde} j`, `restants sur ${CP_PAR_AN} · ${cp.horsAppli + cp.pris} pris`)}
        {ms.tone &&
          tile(
            "Missions",
            rate ? `${rate.taux} % réalisées` : ms.tone === "rouge" ? `${ms.enRetard.length} en retard` : "À jour",
            [
              ms.enRetard.length ? `${ms.enRetard.length} en retard` : ms.aFaire.length ? `${ms.aFaire.length} à faire` : "à jour",
              ms.aControler.length ? `${ms.aControler.length} à contrôler` : null,
              rate ? "sur 8 semaines" : null,
            ]
              .filter(Boolean)
              .join(" · "),
            RATE_TILE[rate ? rateTone(rate.taux) : ms.tone === "orange" ? "orange" : ms.tone]
          )}
        {user.salary && tile("Salaire brut", `${user.salary.brut.toLocaleString("fr-FR")} €`, `${(user.salary.brut * 12).toLocaleString("fr-FR")} € par an · ${user.salary.net.toLocaleString("fr-FR")} € net`)}
        {primes && tile("Primes", `${primes.total.toLocaleString("fr-FR")} €`, primes.nombre ? `${primes.nombre} sur 12 mois` : "aucune sur 12 mois")}
        {salarie &&
          rights.canSeeRecadrages &&
          tile(
            "Recadrages",
            recadrages.length,
            recadrages.length ? `dernier le ${formatShortDate(recadrages[0].date)}` : "aucun",
            recadrages.length ? "border-amber-200 bg-amber-50" : undefined
          )}
        {entretien && tile("Dernier entretien", formatShortDate(entretien.date), entretien.label)}
      </div>
      {ass && <p className="text-[11px] leading-snug text-slate-400">NB : {ASSIDUITE_NB}</p>}
      {rate && <p className="text-[11px] leading-snug text-slate-400">NB : {TAUX_MISSIONS_NB}</p>}
    </div>
  );
}

/** Liste courte des missions suivies, pour la fiche latérale. */
export function MissionsRecap({ user }: { user: TeamUser }) {
  const { now } = useTeam();
  const today = toISODate(now());
  const suivies = missionsOf(user).filter((m) => m.frequence !== "aucune");
  const fiche = missionsOf(user).filter((m) => m.frequence === "aucune");
  if (!suivies.length && !fiche.length) return <p className="text-sm text-slate-400">Pas de mission.</p>;
  return (
    <div className="space-y-2">
      {suivies.length > 0 && (
        <ul className="divide-y rounded-md border">
          {suivies.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{m.titre}</span>
                <span className="flex gap-2 text-xs text-slate-500">
                  {frequenceLabel(m)} <RateText rate={missionRate(m, today, (iso) => worksOn(user, iso))} />
                </span>
              </span>
              <MissionEtatBadge status={missionStatus(m, today)} />
            </li>
          ))}
        </ul>
      )}
      {fiche.length > 0 && <p className="text-xs text-slate-500">Fiche de poste : {fiche.map((m) => m.titre).join(" · ")}</p>}
    </div>
  );
}

// --- Semaine type (emploi du temps) ----------------------------------------------

const DAY_START = 7 * 60;
const DAY_END = 20 * 60;
const PX_PER_MIN = 0.7;

/**
 * Plages qui se chevauchent (un praticien sur deux salles en même temps) : côte à côte plutôt que l'une sur
 * l'autre. Chaque plage reçoit une colonne et le nombre de colonnes de son groupe de chevauchement.
 */
function lanes(ranges: TimeRange[]): { r: TimeRange; lane: number; count: number }[] {
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const out: { r: TimeRange; lane: number; count: number }[] = [];
  let group: typeof out = [];
  let groupEnd = "";
  const flush = () => {
    const count = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => (g.count = count));
    out.push(...group);
    group = [];
  };
  for (const r of sorted) {
    if (group.length && r.start >= groupEnd) flush();
    const ends: string[] = [];
    group.forEach((g) => (ends[g.lane] = ends[g.lane] && ends[g.lane] > g.r.end ? ends[g.lane] : g.r.end));
    let lane = ends.findIndex((e) => !e || e <= r.start);
    if (lane === -1) lane = ends.length;
    // Fin du groupe = la plus tardive de ses plages (une plage qui commence ensuite ouvre un nouveau groupe).
    groupEnd = group.length && groupEnd > r.end ? groupEnd : r.end;
    group.push({ r, lane, count: 1 });
  }
  if (group.length) flush();
  return out;
}

/** Une mission posée sur l'emploi du temps : à son horaire si elle en a un, sinon sous la colonne du jour. */
export interface TimetableMission {
  titre: string;
  horaire?: string;
  etat?: MissionEtat;
}

/** Ce qui change un jour donné par rapport à la semaine type (vue « Cette semaine »). */
export interface TimetableDay {
  date?: string;
  absence?: string;
  /** Écart avec la semaine type, ex. « Avec Dr Martin au lieu de Dr Perche ». */
  ecart?: string;
  missions?: TimetableMission[];
}

const MISSION_TONES: Record<MissionEtat | "neutre", string> = {
  neutre: "border-slate-300 bg-white/90 text-slate-700",
  fait: "border-emerald-300 bg-emerald-50/95 text-emerald-800",
  a_controler: "border-sky-300 bg-sky-50/95 text-sky-800",
  non_conforme: "border-rose-300 bg-rose-50/95 text-rose-800",
  a_faire: "border-amber-300 bg-amber-50/95 text-amber-900",
  en_retard: "border-rose-300 bg-rose-50/95 text-rose-800",
  sans_suivi: "border-slate-300 bg-white/90 text-slate-700",
};

/**
 * Emploi du temps de la semaine : une colonne par jour, une case par plage avec ce que la personne y fait,
 * et ses missions (à leur horaire, en pointillés). `days` ajoute la date, les absences et les écarts de la semaine en cours.
 */
export function Timetable({ hours, days: info }: { hours: WeekHours; days?: Partial<Record<Weekday, TimetableDay>> }) {
  const days = WEEKDAYS.filter((d) => d !== "samedi" || (hours.samedi?.length ?? 0) > 0);
  const height = (DAY_END - DAY_START) * PX_PER_MIN;
  return (
    <div className="flex gap-1.5">
      <div className="relative w-9 shrink-0 text-right text-[10px] text-slate-400" style={{ height: height + 22 }}>
        {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => (
          <span key={i} className="absolute right-1" style={{ top: 22 + i * 60 * PX_PER_MIN - 6 }}>
            {String(7 + i).padStart(2, "0")}h
          </span>
        ))}
      </div>
      {days.map((d) => {
        const day = info?.[d];
        const timed = (day?.missions ?? []).filter((m) => m.horaire);
        const untimed = (day?.missions ?? []).filter((m) => !m.horaire);
        return (
          <div key={d} className="min-w-0 flex-1">
            <p className="h-[22px] text-center text-xs font-medium text-slate-600">
              {WEEKDAY_LABELS[d].slice(0, 3)}
              {day?.date && <span className="font-normal text-slate-400"> {fromISODate(day.date).getDate()}</span>}
            </p>
            <div className={cn("relative rounded-md border bg-slate-50/60", day?.ecart && "border-amber-300")} style={{ height }}>
              {Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => (
                <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * 60 * PX_PER_MIN }} />
              ))}
              {day?.absence ? (
                <div className="absolute inset-0.5 flex items-center justify-center rounded-md bg-[repeating-linear-gradient(135deg,#fff1f2,#fff1f2_4px,#ffe4e6_4px,#ffe4e6_8px)] px-1 text-center text-[11px] font-medium text-rose-800">
                  {day.absence}
                </div>
              ) : (
                <>
                  {lanes(hours[d] ?? []).map(({ r, lane, count }, i) => {
                    const top = (Math.max(DAY_START, toMinutes(r.start)) - DAY_START) * PX_PER_MIN;
                    const h = Math.max(18, (Math.min(DAY_END, toMinutes(r.end)) - Math.max(DAY_START, toMinutes(r.start))) * PX_PER_MIN);
                    return (
                      <div
                        key={i}
                        className={cn("absolute overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight", toneFor(r.label ?? "travail"))}
                        style={{ top, height: h, left: `calc(${(lane / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)` }}
                        title={`${r.start} → ${r.end}${r.label ? ` · ${r.label}` : ""}`}
                      >
                        <p className="font-medium tabular-nums">
                          {r.start}–{r.end}
                        </p>
                        {r.label && <p className="line-clamp-3">{r.label}</p>}
                      </div>
                    );
                  })}
                  {timed.map((m, i) => {
                    const [a, b] = m.horaire!.split(" → ");
                    const top = (Math.max(DAY_START, toMinutes(a)) - DAY_START) * PX_PER_MIN;
                    const h = Math.max(16, (Math.min(DAY_END, toMinutes(b ?? a)) - Math.max(DAY_START, toMinutes(a))) * PX_PER_MIN);
                    return (
                      <div
                        key={`m-${i}`}
                        className={cn("absolute right-0.5 left-1/3 z-10 overflow-hidden rounded border border-dashed px-1 text-[10px] leading-tight", MISSION_TONES[m.etat ?? "neutre"])}
                        style={{ top, height: h }}
                        title={`Mission : ${m.titre} (${m.horaire})${m.etat ? ` · ${ETAT_LABELS[m.etat].toLowerCase()}` : ""}`}
                      >
                        <span className="line-clamp-2">{m.titre}</span>
                      </div>
                    );
                  })}
                  {!hours[d]?.length && <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[11px] text-slate-400">Repos</p>}
                </>
              )}
            </div>
            {day?.ecart && <p className="mt-1 text-[10px] leading-tight text-amber-700">{day.ecart}</p>}
            {!day?.absence && untimed.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {untimed.map((m, i) => (
                  <li
                    key={i}
                    className={cn("truncate rounded border border-dashed px-1 text-[10px] leading-4", MISSION_TONES[m.etat ?? "neutre"])}
                    title={`Mission : ${m.titre}${m.etat ? ` · ${ETAT_LABELS[m.etat].toLowerCase()}` : ""}`}
                  >
                    {m.titre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Bascule « Semaine type / Cette semaine » et sélecteur de semaine, comme dans le planning. */
function SemaineNav({
  vue,
  setVue,
  decalage,
  setDecalage,
  label,
}: {
  vue: "type" | "semaine";
  setVue: (v: "type" | "semaine") => void;
  decalage: number;
  setDecalage: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full bg-slate-100 p-0.5 text-sm">
        {(["type", "semaine"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVue(v)}
            className={cn("rounded-full px-3 py-1", vue === v ? "bg-pink-100 font-medium text-pink-900" : "text-slate-600 hover:text-slate-900")}
          >
            {v === "type" ? "Semaine type" : "Cette semaine"}
          </button>
        ))}
      </div>
      {vue === "semaine" && (
        <>
          <Button variant="outline" size="icon-sm" onClick={() => setDecalage(decalage - 1)} aria-label="Semaine précédente">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDecalage(0)} disabled={decalage === 0}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setDecalage(decalage + 1)} aria-label="Semaine suivante">
            <ChevronRight />
          </Button>
          <span className="text-sm font-medium text-slate-800 capitalize">{label}</span>
        </>
      )}
    </div>
  );
}

/**
 * Semaine d'un collaborateur pour le récapitulatif (trombinoscope) : la semaine type, puis semaine par semaine
 * ce que le planning en a fait (absences, renfort chez un autre praticien, jours modifiés, missions). Lecture seule :
 * on la modifie depuis le dossier ou Planning → Semaines types.
 */
export function SemaineCollaborateur({ user }: { user: TeamUser }) {
  const [vue, setVue] = useState<"type" | "semaine">("type");
  const [decalage, setDecalage] = useState(0);
  const hours = effectiveHours(user);
  const enCours = useSemaineEnCours(user, hours, decalage);
  return (
    <div className="space-y-3">
      <SemaineNav vue={vue} setVue={setVue} decalage={decalage} setDecalage={setDecalage} label={enCours.label} />
      {vue === "type" ? <Timetable hours={hours} days={missionsSemaineType(user, hours)} /> : <Timetable hours={enCours.hours} days={enCours.days} />}
      {vue === "semaine" && <p className="text-[11px] text-slate-400">Les écarts avec la semaine type (absence, renfort, jour modifié) sont en orange ; les missions en pointillés.</p>}
    </div>
  );
}

/**
 * Semaine d'un praticien comme pour les salariés : la semaine type de son agenda Soins, puis semaine par semaine
 * ce que le planning en a fait (absence, qui est à ses côtés, back-up, manque). Les écarts sont en orange.
 */
export function SemainePraticien({ profile }: { profile: PraticienProfile }) {
  const { now, absences, profiles, users, dayOverrides, dayNeeds, findUser } = useTeam();
  const [vue, setVue] = useState<"type" | "semaine">("type");
  const [decalage, setDecalage] = useState(0);
  const today = toISODate(now());
  const monday = addDays(startOfWeek(fromISODate(today)), decalage * 7);
  const slots = [...(profile.weekSlots ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const typeHours: WeekHours = {};
  for (const slot of slots) (typeHours[slot.day] ??= []).push({ start: slot.start, end: slot.end, label: `${activityName(slot.activityTypeId)}${slot.room ? ` · ${slot.room}` : ""}` });

  const week: WeekHours = {};
  const days: Partial<Record<Weekday, TimetableDay>> = {};
  const prenom = (id: string) => findUser(id)?.firstName ?? "?";
  WEEKDAYS.forEach((d, i) => {
    const iso = toISODate(addDays(monday, i));
    const info: TimetableDay = { date: iso };
    const abs = absenceOn(profile.praticienUserId, iso, absences);
    if (abs) info.absence = abs.source === "soins" ? `${abs.motif?.replace(" (agenda Soins)", "") ?? "Fermé"} · agenda Soins` : `${ABSENCE_TYPE_LABELS[abs.type]} · agenda fermé`;
    const day = slots.some((sl) => sl.day === d) && !abs ? dayStaffing(iso, profiles, users, absences, dayOverrides, dayNeeds).praticiens.find((p) => p.profile.id === profile.id) : undefined;
    const ecarts: string[] = [];
    week[d] = slots
      .filter((sl) => sl.day === d)
      .map((sl) => {
        const half = toMinutes(sl.start) < 13 * 60 ? "matin" : "apres_midi";
        const h = day?.byHalf.find((x) => x.half === half);
        const base = `${activityName(sl.activityTypeId)}${sl.room ? ` · ${sl.room}` : ""}`;
        if (!h || h.need === 0) return { start: sl.start, end: sl.end, label: base };
        const avec = h.assistants.map(prenom).join(" + ");
        return { start: sl.start, end: sl.end, label: `${base} · ${avec || "sans assistant"}${h.missing ? ` · manque ${h.missing}` : ""}` };
      });
    if (day) {
      for (const h of day.byHalf) {
        const moment = h.half === "matin" ? "matin" : "aprèm";
        if (h.missing) ecarts.push(`Manque ${h.missing} le ${moment}`);
        h.occupied.forEach((o) => ecarts.push(`${prenom(o.userId)} sur ${o.label} (${moment})`));
      }
      day.slots.filter((x) => x.kind !== "titulaire").forEach((x) => ecarts.push(`${x.kind === "pret" ? "⇄" : "↻"} ${prenom(x.assistantId)} en ${x.kind === "pret" ? "prêt" : "back-up"}`));
      day.absentTitulaires.forEach((id) => ecarts.push(`${prenom(id)} absent(e)`));
      if (day.dayNeed) ecarts.push(`Besoin ${day.need} ce jour (au lieu de ${day.baseNeed})`);
    }
    if (ecarts.length) info.ecart = [...new Set(ecarts)].join(" · ");
    days[d] = info;
  });
  const jours = WEEKDAYS.filter((d) => d !== "samedi" || (week.samedi?.length ?? 0) > 0);
  const label = `${shortDate(toISODate(monday))} → ${shortDate(toISODate(addDays(monday, jours.length - 1)))}`;

  if (!slots.length) return <p className="text-sm text-slate-400">Pas encore de semaine type dans l&apos;agenda Soins.</p>;
  return (
    <div className="space-y-3">
      <SemaineNav vue={vue} setVue={setVue} decalage={decalage} setDecalage={setDecalage} label={label} />
      {vue === "type" ? <Timetable hours={typeHours} /> : <Timetable hours={week} days={days} />}
      {vue === "semaine" && <p className="text-[11px] text-slate-400">Qui est à ses côtés vient du planning d&apos;équipe ; les écarts avec l&apos;habitude (absence, back-up, prêt, manque) sont en orange.</p>}
    </div>
  );
}

/** Missions de la semaine type : les quotidiennes chaque jour travaillé, les hebdomadaires leur jour. */
function missionsSemaineType(user: TeamUser, hours: WeekHours): Partial<Record<Weekday, TimetableDay>> {
  const suivies = missionsOf(user).filter((m) => m.frequence === "quotidienne" || m.frequence === "hebdo");
  return Object.fromEntries(
    WEEKDAYS.filter((d) => hours[d]?.length).map((d) => [
      d,
      { missions: suivies.filter((m) => m.frequence === "quotidienne" || m.jour === d).map((m) => ({ titre: m.titre, horaire: m.horaire })) },
    ])
  );
}

/**
 * La semaine en cours, comparée à la semaine type : absences posées, prêts et remplacements du planning
 * (une assistante détachée chez un autre praticien), et les missions dues avec leur état.
 */
function useSemaineEnCours(user: TeamUser, hours: WeekHours, decalage = 0) {
  const { now, absences, profiles, users, dayOverrides, dayNeeds } = useTeam();
  const today = toISODate(now());
  const monday = addDays(startOfWeek(fromISODate(today)), decalage * 7);
  const habituel = profiles.find((p) => p.id === user.defaultEnvironmentId);
  const chair = isChairAssistant(user);
  const out: Partial<Record<Weekday, TimetableDay>> = {};
  const week: WeekHours = {};
  // Horaires de la semaine avant les libellés du planning : ce qu'on modifie dans « Modifier cette semaine ».
  const base: WeekHours = {};
  const dates: Partial<Record<Weekday, string>> = {};
  WEEKDAYS.forEach((d, i) => {
    const iso = toISODate(addDays(monday, i));
    dates[d] = iso;
    const abs = absenceOn(user.id, iso, absences);
    const info: TimetableDay = { date: iso };
    if (abs) info.absence = `Absent(e) · ${ABSENCE_TYPE_LABELS[abs.type].toLowerCase()}`;
    const modif = user.semainesModifiees?.[iso];
    let ranges = modif ?? hours[d] ?? [];
    base[d] = ranges;
    const ecarts = new Set<string>();
    if (modif) ecarts.add(modif.length ? "Horaires changés pour ce jour" : "Repos ce jour-là");
    if (!abs && ranges.length && chair) {
      const st = dayStaffing(iso, profiles, users, absences, dayOverrides, dayNeeds);
      ranges = ranges.map((r) => {
        // Une plage qui n'est pas au fauteuil (stérilisation, stock…) garde ce qu'on y a mis.
        if (r.label && !r.label.startsWith("Fauteuil")) return r;
        const half = toMinutes(r.start) < 13 * 60 ? "matin" : "apres_midi";
        const avec = st.praticiens.find((p) => p.slots.some((s) => s.assistantId === user.id && (!s.partial || s.partial === half)));
        if (!avec) {
          ecarts.add("Sans praticien ce jour-là");
          return { ...r, label: "Sans praticien" };
        }
        const slot = avec.slots.find((s) => s.assistantId === user.id)!;
        const nom = avec.profile.label;
        if (avec.profile.id !== habituel?.id)
          ecarts.add(`${slot.kind === "pret" ? "Prêté(e) à" : "En renfort avec"} ${nom}${habituel ? ` au lieu de ${habituel.label}` : ""}`);
        return { ...r, label: `Fauteuil ${nom}` };
      });
    }
    if (ecarts.size) info.ecart = [...ecarts].join(" · ");
    week[d] = ranges;
    info.missions = (abs ? [] : missionsDueOn(user, iso, today)).map((x) => ({ titre: x.mission.titre, horaire: x.mission.horaire, etat: x.etat === "a_faire" && iso > today ? undefined : x.etat }));
    out[d] = info;
  });
  const jours = WEEKDAYS.filter((d) => d !== "samedi" || (week.samedi?.length ?? 0) > 0);
  const label = `${shortDate(toISODate(monday))} → ${shortDate(toISODate(addDays(monday, jours.length - 1)))}`;
  return { hours: week, days: out, label, base, dates };
}

/**
 * Semaine type d'un salarié : ses horaires de chaque jour, ce qu'il y fait et ses missions. Créée et modifiée
 * par le gestionnaire (ou le praticien pour son équipe) ; la personne la voit en lecture seule. « Cette semaine »
 * montre la semaine en cours telle que le planning l'a faite : c'est elle qui peut s'écarter de la référence.
 */
export function SemaineTypeSalarie({ user }: { user: TeamUser }) {
  const { updateUser, can } = useTeam();
  const rights = usePersonRights(user);
  const [open, setOpen] = useState(false);
  const [vue, setVue] = useState<"type" | "semaine">("type");
  // Semaine affichée dans la vue « Cette semaine » : 0 = semaine en cours, -1 la précédente, +1 la suivante.
  const [decalage, setDecalage] = useState(0);
  const current = effectiveHours(user);
  const enCours = useSemaineEnCours(user, current, decalage);
  const ecartsCetteSemaine = useSemaineEnCours(user, current, 0);
  const [draft, setDraft] = useState<WeekHours>(current);
  // Ce que modifie la fenêtre : la semaine type (pour toutes les semaines) ou seulement la semaine affichée.
  const [cible, setCible] = useState<"type" | "semaine">("type");
  const [contract, setContract] = useState<number | undefined>(user.weeklyHours);
  const total = weekMinutes(current);
  const datesSemaine = WEEKDAYS.map((d) => enCours.dates[d]).filter((x): x is string => Boolean(x));
  const semaineModifiee = datesSemaine.some((iso) => user.semainesModifiees?.[iso]);
  const invalid = WEEKDAYS.some((d) => rangesError(draft[d]));
  const ecarts = WEEKDAYS.filter((d) => ecartsCetteSemaine.days[d]?.ecart || ecartsCetteSemaine.days[d]?.absence).length;

  /** Enregistre la semaine affichée : seuls les jours qui diffèrent de la semaine type sont gardés à part. */
  function saveSemaine(hours: WeekHours | null) {
    const next = { ...user.semainesModifiees };
    const same = (a: WeekHours[Weekday] = [], b: WeekHours[Weekday] = []) =>
      JSON.stringify(a.map((r) => [r.start, r.end, r.label ?? ""])) === JSON.stringify(b.map((r) => [r.start, r.end, r.label ?? ""]));
    for (const d of WEEKDAYS) {
      const iso = enCours.dates[d];
      if (!iso) continue;
      if (!hours || same(hours[d], current[d])) delete next[iso];
      else next[iso] = hours[d] ?? [];
    }
    const res = updateUser({ ...user, semainesModifiees: Object.keys(next).length ? next : undefined });
    if (res.ok) {
      toast.success(hours ? "Semaine modifiée" : "Retour à la semaine type", {
        description: hours ? `Seulement pour la semaine ${enCours.label}. Le planning suit.` : enCours.label,
      });
      setOpen(false);
    } else toast.error(res.error);
  }

  function save() {
    if (cible === "semaine") return saveSemaine(draft);
    const res = updateUser({ ...user, schedule: draft, weeklyHours: contract, ...daysFromHours(draft) });
    if (res.ok) {
      toast.success("Semaine type enregistrée", { description: "Le planning suit les nouveaux horaires." });
      setOpen(false);
    } else toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{vue === "type" ? "Semaine type" : decalage === 0 ? "Cette semaine" : decalage < 0 ? "Semaine passée" : "Semaine à venir"}</CardTitle>
          <CardDescription>
            {vue === "type" ? (
              <>
                La référence qui revient chaque semaine : horaires, ce que {rights.self ? "vous y faites" : `${user.firstName} y fait`} et les missions (en
                pointillés). {rights.canManage ? "Créée par le gestionnaire ou le praticien." : "Créée par le gestionnaire ou votre praticien, en lecture seule."}
              </>
            ) : (
              <>
                La semaine telle que le planning l&apos;a faite : absences, renforts chez un autre praticien, missions. Les écarts avec la semaine type sont en
                orange.
              </>
            )}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-slate-100 p-0.5 text-sm">
            {(["type", "semaine"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVue(v)}
                className={cn("rounded-full px-3 py-1", vue === v ? "bg-pink-100 font-medium text-pink-900" : "text-slate-600 hover:text-slate-900")}
              >
                {v === "type" ? "Semaine type" : "Cette semaine"}
                {v === "semaine" && ecarts > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-800">{ecarts}</span>}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-600">
            <span className="font-semibold tabular-nums">{hoursLabel(vue === "semaine" ? weekMinutes(enCours.base) : total)}</span> par semaine
            {user.weeklyHours !== undefined && <span className="text-slate-400"> · contrat {user.weeklyHours} h</span>}
          </span>
          {rights.canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCible(vue);
                setDraft(vue === "type" ? current : enCours.base);
                setContract(user.weeklyHours);
                setOpen(true);
              }}
            >
              <Pencil /> {vue === "type" ? "Modifier" : decalage === 0 ? "Modifier cette semaine" : "Modifier cette semaine-là"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {vue === "semaine" && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setDecalage(decalage - 1)} aria-label="Semaine précédente">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDecalage(0)} disabled={decalage === 0}>
              Aujourd&apos;hui
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setDecalage(decalage + 1)} aria-label="Semaine suivante">
              <ChevronRight />
            </Button>
            <span className="ml-1 text-sm font-medium text-slate-800 capitalize">{enCours.label}</span>
          </div>
        )}
        {vue === "type" ? <Timetable hours={current} days={missionsSemaineType(user, current)} /> : <Timetable hours={enCours.hours} days={enCours.days} />}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {WEEKDAYS.filter((d) => current[d]?.length).map((d) => (
            <span key={d}>
              {WEEKDAY_LABELS[d]} : {hoursLabel(dayMinutes(current[d]))}
            </span>
          ))}
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{cible === "type" ? `Semaine type de ${fullName(user)}` : `${fullName(user)} · semaine ${enCours.label}`}</DialogTitle>
            <DialogDescription>
              {cible === "type"
                ? "Pour chaque jour : repos, matin, après-midi ou journée, puis les plages précises et ce qui y est fait. Vaut pour toutes les semaines."
                : "Seulement pour cette semaine-là : la semaine type ne change pas. Utile pour un échange de jour, une demi-journée en plus, une plage sur une autre mission."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {cible === "type" && <ContractHoursField value={contract} disabled={!can("param.cabinet")} onChange={setContract} />}
            <HoursEditor value={draft} onChange={setDraft} contractHours={contract} withLabels />
          </div>
          <DialogFooter className="sm:justify-between">
            {cible === "semaine" && semaineModifiee ? (
              <Button variant="ghost" onClick={() => saveSemaine(null)}>
                Revenir à la semaine type
              </Button>
            ) : (
              <span />
            )}
            <span className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={invalid}>
              Enregistrer
            </Button>
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

