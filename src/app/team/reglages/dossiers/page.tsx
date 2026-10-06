"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trombinoscope } from "@/components/team/Trombinoscope";
import { missionsSummary } from "@/lib/missions";
import { assiduite, ASSIDUITE_NB } from "@/lib/assiduite";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessGate } from "@/components/team/Access";
import { PageHeader, RoleBadges, UserAvatar } from "@/components/team/shared";
import { useTeam } from "@/context/TeamDataContext";
import { CP_PAR_AN, cpSummary, hasCongesPayes } from "@/lib/conges";
import { fullName } from "@/lib/team";
import { DocTemplate, TeamUser } from "@/types/team";
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
          <TabsTrigger value="trombi">Trombinoscope</TabsTrigger>
          <TabsTrigger value="modeles">Modèles de documents</TabsTrigger>
        </TabsList>
        <TabsContent value="trombi" className="mt-5">
          <Trombinoscope />
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
                      <span className={cn(ms.tone === "rouge" ? "text-rose-700" : ms.tone === "orange" ? "text-amber-700" : "text-emerald-700")}>
                        {ms.tone === "rouge" ? `${ms.enRetard.length} en retard` : ms.tone === "orange" ? `${ms.aFaire.length} à faire` : "À jour"}
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
        </TabsContent>
      </Tabs>
    </div>
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
