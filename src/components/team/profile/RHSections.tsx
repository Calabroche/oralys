"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Euro, CalendarClock, FileText, GraduationCap, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTeam } from "@/context/TeamDataContext";
import { PersonAbsences } from "@/components/team/PersonAbsences";
import { DocumentChip, FileButton, type DocumentDraft } from "@/components/team/Justificatifs";
import { diffInDays, formatShortDate, toISODate } from "@/utils/date";
import { CP_PAR_AN, cpSummary } from "@/lib/conges";
import { cn } from "@/lib/utils";
import {
  Contrat,
  ContratType,
  EntretienPro,
  MedecineTravail,
  OneOnOne,
  OneOnOneFrequency,
  RappelHistoryEntry,
  RHDocument,
  RHDocumentType,
  SalaryInfo,
  SalaryStatut,
  TeamUser,
} from "@/types/team";

/**
 * Cartes RH de la fiche profil (`/team/moi`, `/team/profil/[id]`) : missions, rémunération, contrat,
 * rappels (1:1, médecine du travail, entretien professionnel), documents, DPC, congés payés.
 * Chaque carte sauvegarde en direct au blur/au changement (comme `SpecialtyPicker`), indépendamment
 * du bouton « Enregistrer » de l'en-tête qui ne porte que sur les horaires.
 */

const DOCUMENT_TYPE_LABELS: Record<RHDocumentType, string> = {
  contrat: "Contrat",
  avenant: "Avenant",
  diplome: "Diplôme",
  habilitation: "Habilitation",
  autre: "Autre",
};

const FREQUENCY_LABELS: Record<OneOnOneFrequency, string> = { hebdo: "Hebdo", mensuel: "Mensuel", annuel: "Annuel" };

/** Brut annuel : 12 fois le brut mensuel (sans 13e mois ni primes, qui ne sont pas saisis). */
const annuel = (brutMensuel: number) => brutMensuel * 12;

function euros(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

/** Depuis une date : « dans 5 jours », « aujourd'hui », « en retard de 3 jours ». */
function RelativeDue({ iso, today }: { iso: string; today: string }) {
  const days = diffInDays(today, iso) - 1;
  if (days === 0) return <Badge className="bg-pink-100 text-pink-900">Aujourd&apos;hui</Badge>;
  if (days < 0)
    return (
      <Badge variant="outline" className="border-rose-300 text-rose-700">
        En retard de {Math.abs(days)} j
      </Badge>
    );
  if (days <= 14)
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700">
        Dans {days} j
      </Badge>
    );
  return <span className="text-sm text-slate-500">{formatShortDate(iso)}</span>;
}

// --- Missions -----------------------------------------------------------------

export function MissionsCard({ user, canEdit }: { user: TeamUser; canEdit: boolean }) {
  const { updateUser } = useTeam();
  const missions = user.missions ?? [];
  const [draft, setDraft] = useState("");

  function set(next: string[]) {
    const res = updateUser({ ...user, missions: next.length ? next : undefined });
    if (!res.ok) toast.error(res.error);
  }
  function add() {
    if (!draft.trim()) return;
    set([...missions, draft.trim()]);
    setDraft("");
  }
  function remove(i: number) {
    set(missions.filter((_, idx) => idx !== i));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="size-4 text-slate-400" /> Missions
        </CardTitle>
        <CardDescription>Ce que couvre le poste au quotidien.{!canEdit && " Réglées par le gestionnaire."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.length > 0 ? (
          <ul className="space-y-1.5">
            {missions.map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm text-slate-700">
                <span className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  {m}
                </span>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => remove(i)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">{canEdit ? "Pas encore renseignées." : "Pas encore renseignées par le gestionnaire."}</p>
        )}
        {canEdit && (
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter une mission…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
              className="flex-1"
            />
            <Button variant="outline" onClick={add} disabled={!draft.trim()}>
              <Plus /> Ajouter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Rémunération ---------------------------------------------------------------

/** « 1 mars '23 » : forme compacte pour l'axe du graphe. */
function shortAxisDate(iso: string): string {
  return formatShortDate(iso).replace(/\d{4}/, (y) => `'${y.slice(2)}`);
}

function SalaryChart({ history }: { history: SalaryInfo["history"] }) {
  const chartId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  if (history.length < 2) return null;
  const w = 560;
  const h = 170;
  const padX = 34;
  const padTop = 28;
  const padBottom = 24;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const allValues = sorted.flatMap((p) => [p.net, p.brut]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (sorted.length - 1)) * (w - padX * 2);
  const y = (v: number) => h - padBottom - ((v - min) / span) * (h - padTop - padBottom);
  const netPoints = sorted.map((p, i) => [x(i), y(p.net)] as const);
  const brutPoints = sorted.map((p, i) => [x(i), y(p.brut)] as const);
  const line = (pts: readonly (readonly [number, number])[]) => pts.map(([px, py]) => `${px},${py}`).join(" ");
  const area = `${padX},${h - padBottom} ${line(netPoints)} ${x(sorted.length - 1)},${h - padBottom}`;
  const gridValues = [min, (min + max) / 2, max];
  const active = hovered !== null ? sorted[hovered] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Évolution de la rémunération, brut et net">
        <defs>
          <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ec4899" stopOpacity="0.18" />
            <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Repères discrets : les valeurs exactes sont déjà sur chaque point, pas besoin d'un axe chiffré redondant. */}
        {gridValues.map((v, i) => (
          <line key={i} x1={padX} x2={w - padX} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
        ))}

        <polygon points={area} fill={`url(#${chartId}-fill)`} />
        <polyline points={line(brutPoints)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={line(netPoints)} fill="none" stroke="#ec4899" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {sorted.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.brut)} r="2.5" fill="#94a3b8" />
            <circle cx={x(i)} cy={y(p.net)} r="4" fill="#ec4899" stroke="white" strokeWidth="2" />
            <text x={x(i)} y={y(p.net) - 11} textAnchor="middle" className="fill-slate-700 text-[10px] font-medium tabular-nums">
              {euros(p.net)}
            </text>
            <text
              x={x(i)}
              y={h - 6}
              textAnchor={i === 0 ? "start" : i === sorted.length - 1 ? "end" : "middle"}
              className="fill-slate-400 text-[9px]"
            >
              {shortAxisDate(p.date)}
            </text>
            {/* Zone de survol, plus large que le point lui-même. */}
            <rect
              x={x(i) - (w / sorted.length) / 2}
              y={padTop - 10}
              width={w / sorted.length}
              height={h - padTop - padBottom + 10}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((v) => (v === i ? null : v))}
            />
            {hovered === i && <line x1={x(i)} x2={x(i)} y1={padTop - 10} y2={h - padBottom} stroke="#cbd5e1" strokeWidth="1" />}
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-pink-500" /> Net
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-slate-400" style={{ backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0 3px, transparent 3px 6px)" }} /> Brut
        </span>
      </div>

      {active && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
          <p className="font-medium text-slate-900">{formatShortDate(active.date)}</p>
          <p className="text-slate-600">
            {euros(active.brut)} brut · <span className="font-medium text-pink-700">{euros(active.net)}</span> net
          </p>
          <p className="text-slate-500">{euros(annuel(active.brut))} brut annuel
          </p>
          {active.motif && <p className="text-slate-400">{active.motif}</p>}
        </div>
      )}
    </div>
  );
}

/** Ratios net/brut et coût entreprise/brut par statut (France, approximatifs) : point de départ, ajustable à la main. */
const STATUT_RATIOS: Record<SalaryStatut, { net: number; coutEntreprise: number; label: string }> = {
  non_cadre: { net: 0.78, coutEntreprise: 1.42, label: "Salarié non-cadre" },
  cadre: { net: 0.75, coutEntreprise: 1.48, label: "Salarié cadre" },
  fonction_publique: { net: 0.82, coutEntreprise: 1.25, label: "Fonction publique" },
  liberal: { net: 1, coutEntreprise: 1, label: "Profession libérale" },
  portage: { net: 0.5, coutEntreprise: 1, label: "Portage salarial" },
};

/** La ligne la plus récente de l'historique redevient les valeurs « actuelles » après une modif ou une suppression. */
function syncSalaryTop(history: SalaryInfo["history"]): Partial<SalaryInfo> {
  if (history.length === 0) return {};
  const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
  return { brut: latest.brut, net: latest.net, coutEntreprise: latest.coutEntreprise };
}

/** Historique des révisions de salaire : modifiable et supprimable ligne par ligne par le gestionnaire/comptable. */
function SalaryHistoryList({ user, salary, canEdit }: { user: TeamUser; salary: SalaryInfo; canEdit: boolean }) {
  const { updateUser } = useTeam();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ date: string; brut: string; net: string; coutEntreprise: string; motif: string } | null>(null);
  const order = salary.history.map((_, i) => i).sort((a, b) => salary.history[b].date.localeCompare(salary.history[a].date));

  function startEdit(i: number) {
    const h = salary.history[i];
    setEditing(i);
    setDraft({ date: h.date, brut: String(h.brut), net: String(h.net), coutEntreprise: String(h.coutEntreprise), motif: h.motif ?? "" });
  }

  function saveEdit() {
    if (editing === null || !draft) return;
    const b = Number(draft.brut);
    const n = Number(draft.net);
    const c = Number(draft.coutEntreprise);
    if (!draft.date || !b || !n || !c) return;
    const history = salary.history.map((h, i) => (i === editing ? { date: draft.date, brut: b, net: n, coutEntreprise: c, motif: draft.motif.trim() || undefined } : h));
    const res = updateUser({ ...user, salary: { ...salary, ...syncSalaryTop(history), history } });
    if (res.ok) {
      setEditing(null);
      setDraft(null);
    } else toast.error(res.error);
  }

  function remove(i: number) {
    const history = salary.history.filter((_, idx) => idx !== i);
    const res = updateUser({ ...user, salary: { ...salary, ...syncSalaryTop(history), history } });
    if (!res.ok) toast.error(res.error);
    else if (editing === i) {
      setEditing(null);
      setDraft(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Historique</p>
      <ul className="divide-y rounded-md border">
        {order.map((i) => {
          const h = salary.history[i];
          return (
            <li key={i} className="px-3 py-2 text-sm">
              {editing === i && draft ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Input type="date" className="w-36" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  <Input type="number" className="w-24" placeholder="Brut" value={draft.brut} onChange={(e) => setDraft({ ...draft, brut: e.target.value })} />
                  <Input type="number" className="w-24" placeholder="Net" value={draft.net} onChange={(e) => setDraft({ ...draft, net: e.target.value })} />
                  <Input
                    type="number"
                    className="w-28"
                    placeholder="Coût entreprise"
                    value={draft.coutEntreprise}
                    onChange={(e) => setDraft({ ...draft, coutEntreprise: e.target.value })}
                  />
                  <Input className="min-w-32 flex-1" placeholder="Motif" value={draft.motif} onChange={(e) => setDraft({ ...draft, motif: e.target.value })} />
                  <Button size="sm" onClick={saveEdit}>
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      setDraft(null);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="tabular-nums text-slate-500">{formatShortDate(h.date)}</span>
                  <span className="text-slate-700">
                    {euros(h.brut)} brut · {euros(h.net)} net · {euros(annuel(h.brut))} brut annuel
                    {canEdit && ` · ${euros(h.coutEntreprise)} coût`}
                  </span>
                  {h.motif && <span className="text-xs text-slate-400">{h.motif}</span>}
                  {canEdit && (
                    <span className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => startEdit(i)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => remove(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SalaryCard({ user, canSee, canEdit }: { user: TeamUser; canSee: boolean; canEdit: boolean }) {
  const { updateUser, now } = useTeam();
  const salary = user.salary;
  const [statut, setStatut] = useState<SalaryStatut>(salary?.statut ?? "non_cadre");
  const [brut, setBrut] = useState(String(salary?.brut ?? ""));
  const [net, setNet] = useState(String(salary?.net ?? ""));
  const [coutEntreprise, setCoutEntreprise] = useState(String(salary?.coutEntreprise ?? ""));
  const [coutTouched, setCoutTouched] = useState(false);
  if (!canSee) return null;
  const ratios = STATUT_RATIOS[statut];

  /** Le brut entraîne net + coût entreprise (sauf coût si on l'a tapé à la main). */
  function recomputeFromBrut(b: number, s: SalaryStatut) {
    const r = STATUT_RATIOS[s];
    setNet(b ? String(Math.round(b * r.net)) : "");
    if (!coutTouched) setCoutEntreprise(b ? String(Math.round(b * r.coutEntreprise)) : "");
  }

  /** Le net entraîne le brut (et donc le coût entreprise, sauf s'il a été tapé à la main). */
  function recomputeFromNet(n: number, s: SalaryStatut) {
    const r = STATUT_RATIOS[s];
    const b = r.net ? n / r.net : 0;
    setBrut(b ? String(Math.round(b)) : "");
    if (!coutTouched) setCoutEntreprise(b ? String(Math.round(b * r.coutEntreprise)) : "");
  }

  function onBrutChange(v: string) {
    setBrut(v);
    recomputeFromBrut(Number(v), statut);
  }

  function onNetChange(v: string) {
    setNet(v);
    recomputeFromNet(Number(v), statut);
  }

  function onStatutChange(v: SalaryStatut) {
    setStatut(v);
    recomputeFromBrut(Number(brut), v);
  }

  function addRaise() {
    const b = Number(brut);
    const n = Number(net);
    const c = Number(coutEntreprise);
    if (!b || !n || !c) return;
    const date = toISODate(now());
    const history = [...(salary?.history ?? []), { date, brut: b, net: n, coutEntreprise: c, motif: "Révision" }];
    const res = updateUser({ ...user, salary: { statut, brut: b, net: n, coutEntreprise: c, history } });
    if (res.ok) {
      toast.success("Rémunération mise à jour");
      setCoutTouched(false);
    } else toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="size-4 text-slate-400" /> Rémunération
          <Badge variant="outline">Confidentiel</Badge>
        </CardTitle>
        <CardDescription>
          {canEdit
            ? "Brut et net visibles par la personne concernée, et par gestionnaire ou comptable, qui les règlent. Le coût entreprise reste réservé à eux."
            : "Réglée par le gestionnaire. Vous voyez votre salaire actuel et son évolution, en brut et en net."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={statut} onValueChange={(v) => onStatutChange(v as SalaryStatut)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUT_RATIOS).map(([id, r]) => (
                      <SelectItem key={id} value={id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brut mensuel</Label>
                <Input type="number" value={brut} onChange={(e) => onBrutChange(e.target.value)} />
                {Number(brut) > 0 && <p className="text-xs text-slate-500">soit {euros(annuel(Number(brut)))} brut annuel</p>}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Net mensuel <span className="font-normal text-slate-400">· ~{Math.round(ratios.net * 100)} %</span>
                </Label>
                <Input type="number" value={net} onChange={(e) => onNetChange(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Coût entreprise <span className="font-normal text-slate-400">· ~{Math.round(ratios.coutEntreprise * 100)} %</span>
                </Label>
                <Input type="number" value={coutEntreprise} onChange={(e) => (setCoutTouched(true), setCoutEntreprise(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Net et coût entreprise calculés depuis le brut selon le statut, les deux restent ajustables à la main.</p>
              <Button variant="outline" onClick={addRaise} disabled={!brut || !net || !coutEntreprise} className="shrink-0">
                <TrendingUp /> {salary ? "Enregistrer la révision" : "Enregistrer"}
              </Button>
            </div>
          </div>
        ) : salary ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Brut mensuel", salary.brut],
              ["Net mensuel", salary.net],
              ["Brut annuel", annuel(salary.brut)],
            ].map(([label, v]) => (
              <div key={label} className="rounded-lg border bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-semibold text-slate-900 tabular-nums">{euros(v as number)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Pas encore renseignée par le gestionnaire.</p>
        )}
        {salary && salary.history.length >= 2 && (
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Évolution de la rémunération</p>
            <SalaryChart history={salary.history} />
          </div>
        )}
        {salary && salary.history.length > 0 && <SalaryHistoryList user={user} salary={salary} canEdit={canEdit} />}
      </CardContent>
    </Card>
  );
}

// --- Rappels : 1:1, médecine du travail, entretien professionnel ----------------

/**
 * Historique d'un rappel (1:1, visite, entretien) : saisi une fois par le gestionnaire, puis figé —
 * aucune action d'édition ou de suppression n'est proposée sur une ligne déjà enregistrée.
 */
function RappelHistoryList({ history, canEdit, onAdd }: { history: RappelHistoryEntry[]; canEdit: boolean; onAdd: (e: RappelHistoryEntry) => void }) {
  const { now } = useTeam();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(toISODate(now()));
  const [note, setNote] = useState("");
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="basis-full space-y-1.5">
      {sorted.length > 0 && <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Déjà effectués</p>}
      {sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((h, i) => (
            <li key={i} className="flex items-baseline gap-2 text-xs text-slate-500">
              <span className="tabular-nums text-slate-600">{formatShortDate(h.date)}</span>
              {h.note && <span>— {h.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {canEdit &&
        (adding ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" className="w-36" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input placeholder="Note (facultatif)" className="min-w-32 flex-1" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              size="sm"
              onClick={() => {
                onAdd({ date, note: note.trim() || undefined });
                setNote("");
                setAdding(false);
              }}
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500" onClick={() => setAdding(true)}>
            <Plus className="size-3" /> Ajouter au historique
          </Button>
        ))}
    </div>
  );
}

/**
 * `medecineOnly` : un praticien libéral n'a ni 1:1 ni entretien professionnel avec le cabinet,
 * seule la médecine du travail le concerne.
 */
export function RappelsCard({ user, canEdit, medecineOnly }: { user: TeamUser; canEdit: boolean; medecineOnly?: boolean }) {
  const { updateUser, now } = useTeam();
  const today = toISODate(now());
  const oneOnOne = user.oneOnOne;
  const medecine = user.medecineTravail;
  const entretien = user.entretienPro;

  function setOneOnOne(patch: Partial<OneOnOne>) {
    const next: OneOnOne = { frequency: "mensuel", nextDate: today, ...oneOnOne, ...patch };
    const res = updateUser({ ...user, oneOnOne: next });
    if (!res.ok) toast.error(res.error);
  }
  function setMedecine(patch: Partial<MedecineTravail>) {
    const next: MedecineTravail = { periodiciteMois: 24, nextDate: today, ...medecine, ...patch };
    const res = updateUser({ ...user, medecineTravail: next });
    if (!res.ok) toast.error(res.error);
  }
  function setEntretien(patch: Partial<EntretienPro>) {
    const next: EntretienPro = { prochaineDate: today, ...entretien, ...patch };
    const res = updateUser({ ...user, entretienPro: next });
    if (!res.ok) toast.error(res.error);
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-slate-400" /> Rappels
        </CardTitle>
        <CardDescription>
          {medecineOnly ? "Médecine du travail." : "1:1, médecine du travail, entretien professionnel (obligatoire tous les 2 ans)."}{" "}
          {canEdit ? "L'historique est saisi par le gestionnaire et ne se modifie plus ensuite." : "Programmés par le gestionnaire : le prochain rendez-vous et ceux déjà effectués."}
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {!medecineOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0">
          <p className="text-sm font-medium text-slate-700">1:1</p>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Select value={oneOnOne?.frequency ?? "mensuel"} onValueChange={(v) => setOneOnOne({ frequency: v as OneOnOneFrequency })}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hebdo">Hebdo</SelectItem>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-40" value={oneOnOne?.nextDate ?? ""} onChange={(e) => e.target.value && setOneOnOne({ nextDate: e.target.value })} />
            </div>
          ) : oneOnOne ? (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              {FREQUENCY_LABELS[oneOnOne.frequency]} · prochain <RelativeDue iso={oneOnOne.nextDate} today={today} />
            </span>
          ) : (
            <span className="text-sm text-slate-400">Non programmé</span>
          )}
          <RappelHistoryList history={oneOnOne?.history ?? []} canEdit={canEdit} onAdd={(e) => setOneOnOne({ history: [...(oneOnOne?.history ?? []), e] })} />
        </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <p className="text-sm font-medium text-slate-700">Médecine du travail</p>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-20"
                value={medecine?.periodiciteMois ?? 24}
                onChange={(e) => setMedecine({ periodiciteMois: Number(e.target.value) || 24 })}
              />
              <span className="text-xs text-slate-500">mois</span>
              <Input type="date" className="w-40" value={medecine?.nextDate ?? ""} onChange={(e) => e.target.value && setMedecine({ nextDate: e.target.value })} />
            </div>
          ) : medecine ? (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              tous les {medecine.periodiciteMois} mois · prochaine <RelativeDue iso={medecine.nextDate} today={today} />
            </span>
          ) : (
            <span className="text-sm text-slate-400">Non programmée</span>
          )}
          <RappelHistoryList history={medecine?.history ?? []} canEdit={canEdit} onAdd={(e) => setMedecine({ history: [...(medecine?.history ?? []), e] })} />
        </div>
        {!medecineOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 last:pb-0">
          <p className="text-sm font-medium text-slate-700">Entretien professionnel</p>
          {canEdit ? (
            <Input type="date" className="w-40" value={entretien?.prochaineDate ?? ""} onChange={(e) => e.target.value && setEntretien({ prochaineDate: e.target.value })} />
          ) : entretien ? (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              prochain <RelativeDue iso={entretien.prochaineDate} today={today} />
            </span>
          ) : (
            <span className="text-sm text-slate-400">Non programmé</span>
          )}
          <RappelHistoryList
            history={entretien?.history ?? []}
            canEdit={canEdit}
            onAdd={(e) => setEntretien({ history: [...(entretien?.history ?? []), e] })}
          />
        </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Contrat (salariés uniquement) ------------------------------------------------

export function ContratCard({ user, canEdit }: { user: TeamUser; canEdit: boolean }) {
  const { updateUser } = useTeam();
  const contrat = user.contrat;

  function set(patch: Partial<Contrat>) {
    const next: Contrat = { type: "cdi", tempsPartiel: false, dateEmbauche: contrat?.dateEmbauche ?? user.createdAt.slice(0, 10), ...contrat, ...patch };
    const res = updateUser({ ...user, contrat: next });
    if (!res.ok) toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contrat</CardTitle>
        <CardDescription>{canEdit ? "Rempli par le gestionnaire, visible en lecture seule par la personne." : "Rempli par le gestionnaire."}</CardDescription>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={contrat?.type ?? "cdi"} onValueChange={(v) => set({ type: v as ContratType })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cdi">CDI</SelectItem>
                  <SelectItem value="cdd">CDD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;embauche</Label>
              <Input type="date" value={contrat?.dateEmbauche ?? ""} onChange={(e) => e.target.value && set({ dateEmbauche: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin de période d&apos;essai</Label>
              <Input type="date" value={contrat?.finPeriodeEssai ?? ""} onChange={(e) => set({ finPeriodeEssai: e.target.value || undefined })} />
            </div>
            {contrat?.type === "cdd" && (
              <div className="space-y-1.5">
                <Label>Fin de CDD</Label>
                <Input type="date" value={contrat?.dateFinCdd ?? ""} onChange={(e) => set({ dateFinCdd: e.target.value || undefined })} />
              </div>
            )}
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={contrat?.tempsPartiel ?? false} onCheckedChange={(v) => set({ tempsPartiel: v })} />
              <Label>Temps partiel</Label>
            </div>
          </div>
        ) : contrat ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {[
              ["Type de contrat", `${contrat.type.toUpperCase()}, ${contrat.tempsPartiel ? "temps partiel" : "temps plein"}`],
              ["Date d'embauche", formatShortDate(contrat.dateEmbauche)],
              ["Heures du contrat", user.weeklyHours ? `${user.weeklyHours} h par semaine` : "Non renseignées"],
              ...(contrat.finPeriodeEssai ? [["Fin de période d'essai", formatShortDate(contrat.finPeriodeEssai)]] : []),
              ...(contrat.type === "cdd" && contrat.dateFinCdd ? [["Fin de CDD", formatShortDate(contrat.dateFinCdd)]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Pas encore renseigné par le gestionnaire.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Documents RH -----------------------------------------------------------------

/**
 * Chacun peut ajouter ses propres documents (diplôme, attestation…) ; le gestionnaire en ajoute pour tout le monde.
 * On ne retire que ce qu'on a ajouté soi-même, sauf le gestionnaire qui peut tout retirer.
 */
export function DocumentsCard({ user, canAdd, canManage }: { user: TeamUser; canAdd: boolean; canManage: boolean }) {
  const { updateUser, now, sessionUserId, findUser } = useTeam();
  const canRemove = (d: RHDocument) => canManage || (!!d.addedById && d.addedById === sessionUserId);
  const documents = user.documents ?? [];
  const [adding, setAdding] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<RHDocumentType>("autre");
  const [file, setFile] = useState<DocumentDraft | null>(null);

  function add() {
    if (!nom.trim()) return;
    const doc: RHDocument = {
      id: `doc-${Date.now().toString(36)}`,
      nom: nom.trim(),
      type,
      dateAjout: toISODate(now()),
      mime: file?.mime,
      size: file?.size,
      dataUrl: file?.dataUrl,
      addedById: sessionUserId ?? undefined,
    };
    const res = updateUser({ ...user, documents: [...documents, doc] });
    if (res.ok) {
      setNom("");
      setType("autre");
      setFile(null);
      setAdding(false);
    } else toast.error(res.error);
  }
  function remove(id: string) {
    const res = updateUser({ ...user, documents: documents.filter((d) => d.id !== id) });
    if (!res.ok) toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-slate-400" /> Documents
        </CardTitle>
        <CardDescription>Contrat, avenants, diplômes, habilitations, attestations. Chacun peut ajouter les siens ; la pièce jointe est facultative.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length === 0 && !canAdd && <p className="text-sm text-slate-400">Aucun document pour l&apos;instant.</p>}
        {documents.length > 0 && (
          <ul className="divide-y rounded-md border">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                {d.dataUrl || d.size ? (
                  <DocumentChip doc={{ name: d.nom, mime: d.mime ?? "application/octet-stream", size: d.size ?? 0, dataUrl: d.dataUrl }} />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{d.nom}</span>
                )}
                <Badge variant="outline" className="shrink-0">
                  {DOCUMENT_TYPE_LABELS[d.type]}
                </Badge>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatShortDate(d.dateAjout)}
                  {d.addedById && ` · par ${d.addedById === sessionUserId ? "vous" : (findUser(d.addedById)?.firstName ?? "?")}`}
                </span>
                {canRemove(d) && (
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => remove(d.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canAdd &&
          (adding ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <Input placeholder="Nom du document" value={nom} onChange={(e) => setNom(e.target.value)} className="min-w-48 flex-1" />
                <Select value={type} onValueChange={(v) => setType(v as RHDocumentType)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {file ? (
                  <DocumentChip doc={file} onRemove={() => setFile(null)} />
                ) : (
                  <FileButton
                    label="Joindre un fichier"
                    size="xs"
                    onFiles={(docs) => {
                      const f = docs[0];
                      if (f) {
                        setFile(f);
                        if (!nom.trim()) setNom(f.name.replace(/\.[^.]+$/, ""));
                      }
                    }}
                  />
                )}
                <Button onClick={add} disabled={!nom.trim()}>
                  Ajouter
                </Button>
                <Button variant="ghost" onClick={() => (setAdding(false), setFile(null))}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> Ajouter un document
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}

// --- Congés payés (salariés uniquement) --------------------------------------------

/**
 * 25 jours par an pour tout le monde, non modifiables. Les jours pris se calculent tout seuls depuis les
 * congés déclarés dans Team (par la personne, son manager ou la gestionnaire), le solde aussi : on ne le
 * saisit jamais. Seul un rattrapage « pris hors application » se règle à la main, par le gestionnaire.
 */
export function CongesPayesCard({ user, canEdit }: { user: TeamUser; canEdit: boolean }) {
  const { updateUser, absences, now } = useTeam();
  const today = toISODate(now());
  const cp = cpSummary(user, absences, today);
  const [horsAppli, setHorsAppli] = useState(String(cp.horsAppli));

  function saveHorsAppli() {
    const n = Math.max(0, Math.min(CP_PAR_AN, Math.round(Number(horsAppli) || 0)));
    setHorsAppli(String(n));
    if (n === cp.horsAppli) return;
    const res = updateUser({ ...user, congesPayes: { prisHorsAppli: n } });
    if (res.ok) toast.success("Congés payés mis à jour", { description: `Solde restant : ${CP_PAR_AN - n - cp.pris - cp.poses} j` });
    else toast.error(res.error);
  }

  const tile = (label: string, value: number, hint?: string, strong?: boolean) => (
    <div className={cn("rounded-lg border px-3 py-2.5", strong ? "border-pink-200 bg-pink-50" : "bg-slate-50")}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", strong ? (value < 0 ? "text-rose-700" : "text-pink-900") : "text-slate-900")}>{value} j</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
  const prisTotal = cp.horsAppli + cp.pris;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Congés payés</CardTitle>
        <CardDescription>
          {CP_PAR_AN} jours par an pour chaque salarié, sur la période du {formatShortDate(cp.period.start)} au {formatShortDate(cp.period.end)}. Pris et solde se
          calculent depuis les congés déclarés dans Team, en jours ouvrés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tile("Acquis par an", cp.acquis, "fixe")}
          {tile("Pris", prisTotal, cp.horsAppli ? `dont ${cp.horsAppli} j hors application` : undefined)}
          {tile("Posés à venir", cp.poses, "validés")}
          {tile("Solde restant", cp.solde, cp.enAttente ? `${cp.enAttente} j en attente de validation` : "calculé", true)}
        </div>
        {cp.solde < 0 && <p className="text-xs text-rose-700">Plus de congés posés que de jours acquis sur la période.</p>}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2.5">
            <Label htmlFor={`cp-${user.id}`} className="text-sm">
              Jours pris hors application
            </Label>
            <Input
              id={`cp-${user.id}`}
              type="number"
              min={0}
              max={CP_PAR_AN}
              className="w-20"
              value={horsAppli}
              onChange={(e) => setHorsAppli(e.target.value)}
              onBlur={saveHorsAppli}
              onKeyDown={(e) => e.key === "Enter" && saveHorsAppli()}
            />
            <span className="text-xs text-slate-500">ex. congés pris avant la mise en place de Team. Le reste se met à jour tout seul.</span>
          </div>
        )}
        <PersonAbsences userId={user.id} types={["conge"]} workingDays />
      </CardContent>
    </Card>
  );
}

// --- DPC (praticiens uniquement) ----------------------------------------------------

export function DpcCard({ user, canEdit }: { user: TeamUser; canEdit: boolean }) {
  const { updateUser } = useTeam();
  const dpc = user.dpc;
  const [realisees, setRealisees] = useState(String(dpc?.heuresRealisees ?? ""));
  const [requises, setRequises] = useState(String(dpc?.heuresRequises ?? 21));
  const [periodeFin, setPeriodeFin] = useState(dpc?.periodeFin ?? "");
  if (!canEdit && !dpc) return null;

  function save() {
    const r = Number(realisees);
    const req = Number(requises);
    if (Number.isNaN(r) || Number.isNaN(req) || !periodeFin) return;
    const res = updateUser({ ...user, dpc: { heuresRealisees: r, heuresRequises: req, periodeFin } });
    if (!res.ok) toast.error(res.error);
  }

  const pct = dpc ? Math.min(100, Math.round((dpc.heuresRealisees / dpc.heuresRequises) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-4 text-slate-400" /> Formation continue (DPC)
        </CardTitle>
        <CardDescription>Développement professionnel continu, obligatoire sur une période triennale.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Heures réalisées</Label>
              <Input type="number" className="w-24" value={realisees} onChange={(e) => setRealisees(e.target.value)} onBlur={save} />
            </div>
            <div className="space-y-1.5">
              <Label>Heures requises</Label>
              <Input type="number" className="w-24" value={requises} onChange={(e) => setRequises(e.target.value)} onBlur={save} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin de période</Label>
              <Input type="date" value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} onBlur={save} />
            </div>
          </div>
        ) : (
          dpc && (
            <p className="text-sm text-slate-700">
              {dpc.heuresRealisees} h / {dpc.heuresRequises} h · échéance {formatShortDate(dpc.periodeFin)}
            </p>
          )
        )}
        {dpc && (
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-pink-400" style={{ width: `${pct}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
