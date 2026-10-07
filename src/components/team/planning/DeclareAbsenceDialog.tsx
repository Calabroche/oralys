"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarOff, Siren } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTeam } from "@/context/TeamDataContext";
import { DocumentDraft, JustificatifPicker } from "@/components/team/Justificatifs";
import { ABSENCE_TYPE_LABELS, displayName, isHealthProfessional, isLastMinute } from "@/lib/team";
import { useVersion } from "@/components/team/Version";
import { AbsenceType } from "@/types/team";
import { toISODate } from "@/utils/date";

export interface DeclarePrefill {
  userId?: string;
  date?: string;
}

export function DeclareAbsenceDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: DeclarePrefill;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && <Form prefill={prefill} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function Form({ prefill, onDone }: { prefill?: DeclarePrefill; onDone: () => void }) {
  const { users, sessionUserId, can, declareAbsence, cancelAbsence, restoreAbsence, rdvs, now, findUser, roles } = useTeam();
  const { has } = useVersion();
  const today = toISODate(now());
  const canForOthers = can("team.planning");
  const [userId, setUserId] = useState(prefill?.userId && canForOthers ? prefill.userId : sessionUserId);
  const [type, setType] = useState<AbsenceType>("conge");
  const [start, setStart] = useState(prefill?.date ?? today);
  const [end, setEnd] = useState(prefill?.date ?? today);
  const [motif, setMotif] = useState("");
  const [documents, setDocuments] = useState<DocumentDraft[]>([]);

  const target = findUser(userId);
  const invalid = !start || !end || end < start;
  const draft = { declaredAt: now().toISOString(), startDate: start };
  const lastMinute = !invalid && isLastMinute({ ...draft, id: "", userId, type, endDate: end, status: "demandee", declaredById: "" });
  const affected = invalid
    ? []
    : rdvs.filter((r) => r.date >= start && r.date <= end && (r.assistantUserId === userId || r.praticienUserId === userId));
  // Praticien libéral : personne ne valide ses absences, elles sont enregistrées pour information.
  const targetLiberal = !!target && isHealthProfessional(target, roles);
  const willAutoValidate = type === "maladie" || canForOthers || targetLiberal;

  function submit() {
    if (invalid) return;
    const uploadedAt = now().toISOString();
    const abs = declareAbsence({
      userId,
      type,
      startDate: start,
      endDate: end,
      motif: motif.trim() || undefined,
      documents: type === "maladie" && documents.length ? documents.map((d, i) => ({ ...d, id: `doc-${Date.now().toString(36)}-${i}`, uploadedAt, uploadedById: sessionUserId })) : undefined,
    });
    toast.success(abs.status === "validee" ? "Absence enregistrée" : "Demande envoyée au gestionnaire", {
      description: has("dernierMoment") && isLastMinute(abs)
        ? "Absence de dernier moment : alerte immédiate envoyée au planning Soins."
        : affected.length
          ? `${affected.length} RDV Soins signalés au gestionnaire.`
          : undefined,
      duration: 10000,
      // Retour arrière immédiat, puis possibilité de rétablir.
      action: {
        label: "Annuler",
        onClick: () => {
          const removed = cancelAbsence(abs.id);
          if (removed) toast("Absence annulée", { action: { label: "Rétablir", onClick: () => restoreAbsence(removed) } });
        },
      },
    });
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarOff className="size-5 text-pink-600" /> Déclarer une absence
        </DialogTitle>
        <DialogDescription>Le cabinet est prévenu en une fois, sans devoir prévenir chaque personne.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Collaborateur</Label>
          <Select value={userId} onValueChange={setUserId} disabled={!canForOthers}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users
                .filter((u) => u.status === "actif")
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {displayName(u)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {!canForOthers && <p className="text-xs text-slate-500">Vous déclarez pour vous-même. Un gestionnaire peut déclarer pour un tiers.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Motif</Label>
          <ToggleGroup type="single" variant="outline" value={type} onValueChange={(v) => v && setType(v as AbsenceType)} className="w-full">
            {(Object.keys(ABSENCE_TYPE_LABELS) as AbsenceType[]).map((t) => (
              <ToggleGroupItem key={t} value={t} className="flex-1">
                {ABSENCE_TYPE_LABELS[t]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Du</Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value > end) setEnd(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Au (inclus)</Label>
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-invalid={invalid} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            Précision <span className="font-normal text-slate-400">(optionnel)</span>
          </Label>
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="ex. Formation radioprotection" />
        </div>
        {/* Justificatif seulement pour un arrêt maladie : pour un congé ou une formation, il ne sert à rien. */}
        {type === "maladie" && (
          <div className="space-y-1.5">
            <Label>
              Arrêt de travail <span className="font-normal text-slate-400">(optionnel)</span>
            </Label>
            <JustificatifPicker value={documents} onChange={setDocuments} maladie />
          </div>
        )}

        {lastMinute && has("dernierMoment") && (
          <Alert variant="destructive">
            <Siren />
            <AlertTitle>Absence de dernier moment</AlertTitle>
            <AlertDescription>Moins de 48h avant le début : traitement prioritaire, alerte immédiate vers Soins.</AlertDescription>
          </Alert>
        )}
        {affected.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle />
            <AlertTitle>{affected.length} RDV déjà posés dans Soins</AlertTitle>
            <AlertDescription className="text-amber-800">
              {target?.poste === "praticien"
                ? "L'agenda sera fermé sur la période et les RDV existants signalés pour report."
                : "Le gestionnaire du planning sera notifié et des remplaçants proposés."}
            </AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-slate-500">
          {targetLiberal
            ? "Praticien libéral : enregistrée directement, sans validation. Le cabinet est informé et l'agenda Soins se ferme sur la période."
            : willAutoValidate
              ? "Enregistrée comme validée."
              : "Sera soumise à validation d'un gestionnaire."}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={invalid}>
          {willAutoValidate ? "Enregistrer l'absence" : "Envoyer la demande"}
        </Button>
      </DialogFooter>
    </>
  );
}
