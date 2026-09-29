"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/context/TeamDataContext";
import { AbsenceDocument, TeamAbsence } from "@/types/team";
import { cn } from "@/lib/utils";

/** Certificat d'arrêt, justificatif médical : PDF, image ou document Word. */
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,application/pdf,image/*";
/** Au-delà, la démo ne garde que le nom du fichier (le navigateur a peu de place). */
const MAX_STORED = 1.5 * 1024 * 1024;

export type DocumentDraft = Omit<AbsenceDocument, "id" | "uploadedAt" | "uploadedById">;

function readFile(file: File): Promise<DocumentDraft> {
  const base = { name: file.name, mime: file.type || "application/octet-stream", size: file.size };
  if (file.size > MAX_STORED) return Promise.resolve(base);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, dataUrl: String(reader.result) });
    reader.onerror = () => resolve(base);
    reader.readAsDataURL(file);
  });
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

/** Ouvre le justificatif dans un nouvel onglet (les PDF s'affichent, les autres se téléchargent). */
function openDocument(doc: DocumentDraft) {
  if (!doc.dataUrl) {
    toast("Fichier non conservé dans la démo", { description: "Au-delà de 1,5 Mo, seul le nom est gardé. En production, le fichier est stocké de façon sécurisée." });
    return;
  }
  const [head, body] = doc.dataUrl.split(",");
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: head.match(/data:(.*);base64/)?.[1] ?? doc.mime }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function DocumentChip({ doc, onRemove }: { doc: DocumentDraft; onRemove?: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-white py-0.5 pr-1 pl-2 text-xs">
      <FileText className="size-3.5 shrink-0 text-pink-600" />
      <button type="button" onClick={() => openDocument(doc)} className="truncate hover:text-pink-700 hover:underline" title="Ouvrir le justificatif">
        {doc.name}
      </button>
      <span className="shrink-0 text-slate-400">{sizeLabel(doc.size)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Retirer ${doc.name}`}>
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function FileButton({ label, onFiles, size = "sm" }: { label: string; onFiles: (docs: DocumentDraft[]) => void; size?: "sm" | "xs" }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => input.current?.click()}>
        <Paperclip /> {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(await Promise.all(files.map(readFile)));
        }}
      />
    </>
  );
}

/** Champ « justificatif » de la déclaration d'absence : les fichiers partent avec l'absence. */
export function JustificatifPicker({ value, onChange, maladie }: { value: DocumentDraft[]; onChange: (v: DocumentDraft[]) => void; maladie: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((d, i) => (
          <DocumentChip key={d.name + i} doc={d} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        ))}
        <FileButton label={value.length ? "Ajouter un fichier" : maladie ? "Joindre l'arrêt maladie" : "Joindre un justificatif"} onFiles={(docs) => onChange([...value, ...docs])} />
      </div>
      <p className="text-xs text-slate-500">
        {maladie ? "Certificat d'arrêt de travail ou justificatif médical (PDF, photo ou Word). Il peut aussi être ajouté plus tard, depuis le profil." : "PDF, photo ou Word."}{" "}
        Visible uniquement par la personne et le gestionnaire.
      </p>
    </div>
  );
}

/** Justificatifs d'une absence déjà déclarée, avec ajout et retrait (la personne elle-même et le gestionnaire). */
export function AbsenceDocuments({ absence, canEdit, className }: { absence: TeamAbsence; canEdit: boolean; className?: string }) {
  const { attachDocument, removeDocument } = useTeam();
  const docs = absence.documents ?? [];
  const missing = absence.type === "maladie" && docs.length === 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {docs.map((d) => (
        <DocumentChip
          key={d.id}
          doc={d}
          onRemove={
            canEdit
              ? () => {
                  removeDocument(absence.id, d.id);
                  toast("Justificatif retiré", { description: d.name });
                }
              : undefined
          }
        />
      ))}
      {missing && <span className="text-xs text-amber-700">Arrêt maladie sans justificatif</span>}
      {canEdit && (
        <FileButton
          size="xs"
          label={docs.length ? "Ajouter" : "Joindre un justificatif"}
          onFiles={(files) => {
            files.forEach((f) => attachDocument(absence.id, f));
            toast.success(files.length > 1 ? `${files.length} justificatifs ajoutés` : "Justificatif ajouté", { description: "Rangé dans le profil de la personne." });
          }}
        />
      )}
    </div>
  );
}

/** Petit trombone pour les listes (planning) : indique qu'un justificatif est joint. */
export function DocumentBadge({ absence }: { absence: TeamAbsence }) {
  const n = absence.documents?.length ?? 0;
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-500" title={`${n} justificatif${n > 1 ? "s" : ""} joint${n > 1 ? "s" : ""}`}>
      <Paperclip className="size-3" />
      {n > 1 && n}
    </span>
  );
}
