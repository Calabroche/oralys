"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FREQUENCE_LABELS, TAUX_MISSIONS_NB, frequenceLabel, missionsSummary, personMissionRate, rateTone } from "@/lib/missions";
import { assiduite, ASSIDUITE_NB } from "@/lib/assiduite";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessGate } from "@/components/team/Access";
import { PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { useTeam } from "@/context/TeamDataContext";
import { CP_PAR_AN, cpSummary, hasCongesPayes } from "@/lib/conges";
import { fullName, worksOn } from "@/lib/team";
import { DocTemplate, MissionFrequence, MissionTemplate, Poste, TeamUser } from "@/types/team";
import { Weekday } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/utils/date";
import { formatShortDate, toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

/**
 * Dossiers du personnel, côté gestionnaire : toutes les fiches RH en un coup d'œil (contrat, congés,
 * prochain rendez-vous), et un accès direct au dossier de chacun pour le remplir. Chaque personne voit
 * le sien en lecture seule depuis son profil.
 */
export default function DossiersPage() {
  return (
    <AccessGate access="utilisateurs">
      <Dossiers />
    </AccessGate>
  );
}

/** Prochain rendez-vous RH de la personne (1:1, médecine du travail ou entretien professionnel). */
function nextRendezVous(u: TeamUser): { label: string; date: string } | null {
  // Un praticien libéral n'a ni 1:1 ni entretien professionnel : seule la médecine du travail compte.
  const salarie = hasCongesPayes(u);
  const all = [
    salarie && u.oneOnOne && { label: "1:1", date: u.oneOnOne.nextDate },
    u.medecineTravail && { label: "Médecine du travail", date: u.medecineTravail.nextDate },
    salarie && u.entretienPro && { label: "Entretien professionnel", date: u.entretienPro.prochaineDate },
  ].filter((x): x is { label: string; date: string } => !!x);
  return all.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

function Dossiers() {
  const { users, absences, now } = useTeam();
  const today = toISODate(now());
  const actifs = users.filter((u) => u.status === "actif").sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossiers du personnel"
        description="Contrat, rémunération, missions, rappels, congés payés et documents de chacun. Vous les remplissez ici ; chaque personne les retrouve en lecture seule sur son profil."
      />
      <Tabs defaultValue="liste">
        <TabsList variant="line">
          <TabsTrigger value="liste">Liste</TabsTrigger>
          <TabsTrigger value="missions">Missions types</TabsTrigger>
          <TabsTrigger value="modeles">Modèles de documents</TabsTrigger>
        </TabsList>
        <TabsContent value="missions" className="mt-5">
          <MissionsTypes />
        </TabsContent>
        <TabsContent value="modeles" className="mt-5">
          <ModelesDocuments />
        </TabsContent>
        <TabsContent value="liste" className="mt-5 space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs uppercase">
              <TableHead>Personne</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Congés payés</TableHead>
              <TableHead>Prochain rendez-vous</TableHead>
              <TableHead>Missions</TableHead>
              <TableHead>Assiduité</TableHead>
              <TableHead>À compléter</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actifs.map((u) => {
              const salarie = hasCongesPayes(u);
              const cp = salarie ? cpSummary(u, absences, today) : null;
              const rdv = nextRendezVous(u);
              const ms = missionsSummary(u, today);
              const rate = personMissionRate(u, today, (iso) => worksOn(u, iso));
              const ass = salarie ? assiduite(u, absences, today) : null;
              const missing = [
                salarie && !u.missions?.length && "missions",
                salarie && !u.contrat && "contrat",
                salarie && !u.salary && "rémunération",
              ].filter(Boolean) as string[];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} />
                      <div>
                        <p className="font-medium text-slate-900">{fullName(u)}</p>
                        <RoleBadges user={u} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {!salarie ? (
                      <span className="text-slate-400">Libéral</span>
                    ) : u.contrat ? (
                      <>
                        <span className="font-medium">{u.contrat.type.toUpperCase()}</span>
                        <span className="text-slate-500"> · depuis le {formatShortDate(u.contrat.dateEmbauche)}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {cp ? (
                      <span className={cn(cp.solde < 0 && "text-rose-700")}>
                        <span className="font-medium">{cp.solde} j</span>
                        <span className="text-slate-500"> restants sur {CP_PAR_AN}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rdv ? (
                      <span className={cn(rdv.date < today && "text-rose-700")}>
                        {rdv.label} <span className="text-slate-500">· {formatShortDate(rdv.date)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ms.tone ? (
                      <span className="flex flex-col">
                        {rate && (
                          <span className={cn("font-medium tabular-nums", rateTone(rate.taux) === "rouge" ? "text-rose-700" : rateTone(rate.taux) === "orange" ? "text-amber-700" : "text-emerald-700")}>
                            {rate.taux} % sur 8 sem.
                          </span>
                        )}
                        <span className={cn("text-xs", ms.tone === "rouge" ? "text-rose-700" : ms.tone === "orange" ? "text-amber-700" : "text-slate-500")}>
                          {ms.tone === "rouge" ? `${ms.enRetard.length} en retard` : ms.tone === "orange" ? `${ms.aFaire.length} à faire` : "à jour"}
                          {ms.aControler.length > 0 && <span className="text-sky-700"> · {ms.aControler.length} à contrôler</span>}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {ass ? (
                      <span>
                        <span className="font-medium">{ass.taux.toLocaleString("fr-FR")} %</span>
                        <span className="text-slate-500"> · {ass.absents} j</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {missing.length ? (
                      <Badge variant="outline" className="border-amber-300 text-amber-800">
                        {missing.join(", ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-emerald-700">Complet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/team/profil/${u.id}`}>
                        <FolderOpen /> Ouvrir le dossier
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-slate-400">NB : {ASSIDUITE_NB}</p>
      <p className="text-[11px] text-slate-400">NB : {TAUX_MISSIONS_NB}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const POSTE_LABELS: Record<Poste, string> = { assistant: "Assistants et aides", secretariat: "Secrétariat", gestion: "Gestion", praticien: "Praticiens" };

/** Missions types du cabinet : on les pioche depuis la carte Missions de chaque profil, sans tout retaper. */
function MissionsTypes() {
  const { missionTemplates, upsertMissionTemplate, deleteMissionTemplate } = useTeam();
  const [editing, setEditing] = useState<MissionTemplate | null>(null);
  const groupes = (["assistant", "secretariat", "gestion"] as Poste[])
    .map((p) => ({ p, list: missionTemplates.filter((t) => t.postes?.includes(p)) }))
    .concat([{ p: "praticien", list: missionTemplates.filter((t) => !t.postes?.length) }])
    .filter((g) => g.list.length);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Les missions qui reviennent dans le cabinet. Dans chaque profil, carte Missions → « Piocher dans les missions types » : la mission est pré-remplie (fréquence,
        jour, horaire, contrôle), il n&apos;y a plus qu&apos;à l&apos;ajouter.
      </p>
      {groupes.map((g) => (
        <section key={g.p}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.p === "praticien" ? "Pour tous" : POSTE_LABELS[g.p]}</h3>
          <ul className="divide-y rounded-lg border">
            {g.list.map((t) => (
              <li key={`${g.p}-${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{t.titre}</span>
                  {t.aControler && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-sky-700">
                      <ShieldCheck className="size-3" /> à contrôler
                    </span>
                  )}
                  <span className="block text-xs text-slate-500">{frequenceLabel(t)}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)} aria-label="Modifier">
                  <Pencil />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Supprimer"
                  onClick={() => {
                    deleteMissionTemplate(t.id);
                    toast("Mission type supprimée", { description: t.titre, action: { label: "Annuler", onClick: () => upsertMissionTemplate(t) } });
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Button variant="outline" onClick={() => setEditing({ id: `mtpl-${Date.now().toString(36)}`, titre: "", frequence: "hebdo", jour: "lundi", postes: [] })}>
        <Plus /> Nouvelle mission type
      </Button>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <MissionTemplateForm
              template={editing}
              onSave={(t) => {
                upsertMissionTemplate(t);
                toast.success("Mission type enregistrée", { description: t.titre });
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MissionTemplateForm({ template, onSave, onCancel }: { template: MissionTemplate; onSave: (t: MissionTemplate) => void; onCancel: () => void }) {
  const [t, setT] = useState(template);
  const [debut, setDebut] = useState(template.horaire?.split(" → ")[0] ?? "");
  const [fin, setFin] = useState(template.horaire?.split(" → ")[1] ?? "");
  return (
    <>
      <DialogHeader>
        <DialogTitle>{template.titre ? "Modifier la mission type" : "Nouvelle mission type"}</DialogTitle>
        <DialogDescription>Elle sera proposée dans la carte Missions de chaque profil, en tête pour les postes cochés.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Titre (ex. Réassort des salles)" value={t.titre} onChange={(e) => setT({ ...t, titre: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <Select value={t.frequence} onValueChange={(v) => setT({ ...t, frequence: v as MissionFrequence })}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCE_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {t.frequence === "hebdo" && (
            <Select value={t.jour ?? "lundi"} onValueChange={(v) => setT({ ...t, jour: v as Weekday })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {WEEKDAY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {t.frequence === "mensuelle" && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              le
              <Input type="number" min={1} max={28} className="w-16" value={t.jourDuMois ?? 1} onChange={(e) => setT({ ...t, jourDuMois: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })} />
            </span>
          )}
        </div>
        {t.frequence !== "aucune" && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            Horaire (facultatif)
            <Input type="time" className="w-28" value={debut} onChange={(e) => setDebut(e.target.value)} />→
            <Input type="time" className="w-28" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
        )}
        {t.frequence !== "aucune" && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={Boolean(t.aControler)} onCheckedChange={(v) => setT({ ...t, aControler: v === true || undefined })} />À contrôler par le gestionnaire ou le
            praticien
          </label>
        )}
        <div className="space-y-1.5">
          <p className="text-sm text-slate-600">Pour quels postes ?</p>
          <div className="flex flex-wrap gap-3">
            {(["assistant", "secretariat", "gestion"] as Poste[]).map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={t.postes?.includes(p) ?? false}
                  onCheckedChange={(v) => setT({ ...t, postes: v === true ? [...(t.postes ?? []), p] : (t.postes ?? []).filter((x) => x !== p) })}
                />
                {POSTE_LABELS[p]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={() => onSave({ ...t, titre: t.titre.trim(), horaire: t.frequence !== "aucune" && debut && fin ? `${debut} → ${fin}` : undefined })}
          disabled={!t.titre.trim()}
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}

/** Modèles de documents (trame de 1:1, entretien, recadrage…) : on les rédige ici, on les utilise depuis chaque profil. */
function ModelesDocuments() {
  const { docTemplates, upsertDocTemplate, deleteDocTemplate } = useTeam();
  const [editing, setEditing] = useState<DocTemplate | null>(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Chaque modèle se retrouve dans les profils, carte Documents → « Rédiger depuis un modèle » : le document est pré-rempli, vous le complétez, il est rangé dans
        le dossier de la personne.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docTemplates.map((t) => (
          <li key={t.id} className="flex flex-col rounded-lg border p-4">
            <p className="font-medium text-slate-900">{t.titre}</p>
            <p className="mt-1 line-clamp-4 flex-1 text-xs whitespace-pre-line text-slate-500">{t.contenu}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                <Pencil /> Modifier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  deleteDocTemplate(t.id);
                  toast("Modèle supprimé", { description: t.titre, action: { label: "Annuler", onClick: () => upsertDocTemplate(t) } });
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={() => setEditing({ id: `tpl-${Date.now().toString(36)}`, titre: "", contenu: "" })}>
        <Plus /> Nouveau modèle
      </Button>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          {editing && (
            <TemplateForm
              template={editing}
              onSave={(t) => {
                upsertDocTemplate(t);
                toast.success("Modèle enregistré", { description: t.titre });
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateForm({ template, onSave, onCancel }: { template: DocTemplate; onSave: (t: DocTemplate) => void; onCancel: () => void }) {
  const [titre, setTitre] = useState(template.titre);
  const [contenu, setContenu] = useState(template.contenu);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{template.titre ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
        <DialogDescription>Le texte servira de point de départ à chaque document créé depuis ce modèle.</DialogDescription>
      </DialogHeader>
      <Input placeholder="Titre (ex. Trame de 1:1)" value={titre} onChange={(e) => setTitre(e.target.value)} />
      <Textarea rows={14} value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Points à aborder…" className="font-mono text-sm" />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={() => onSave({ ...template, titre: titre.trim(), contenu })} disabled={!titre.trim()}>
          Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}
