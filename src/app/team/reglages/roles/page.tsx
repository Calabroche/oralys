"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Check, Download, Lock, Minus, Plus, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTeam } from "@/context/TeamDataContext";
import { PERMISSION_CATEGORIES, PERMISSIONS } from "@/data/teamMockData";
import { fullName, permissionsOf } from "@/lib/team";
import { Gate, PageHeader, UserAvatar } from "@/components/team/shared";
import { PermissionId, Role } from "@/types/team";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  const { roles, users, can, setRolePermissions, deleteRole } = useTeam();
  const [view, setView] = useState<"roles" | "users">("roles");
  const [createOpen, setCreateOpen] = useState(false);
  const editable = can("param.cabinet");
  const activeUsers = users.filter((u) => u.status === "actif");

  function toggle(role: Role, perm: PermissionId) {
    const next = role.permissions.includes(perm) ? role.permissions.filter((p) => p !== perm) : [...role.permissions, perm];
    setRolePermissions(role.id, next);
    const holders = users.filter((u) => u.status === "actif" && u.roleIds.includes(role.id)).length;
    toast.success(`Rôle ${role.name} mis à jour`, {
      description: `${holders} utilisateur(s) concerné(s). Appliqué immédiatement dans Soins, y compris en session active.`,
    });
  }

  function exportCsv() {
    const header = ["Utilisateur", "Email", "Rôles", ...PERMISSIONS.map((p) => p.label)];
    const lines = activeUsers.map((u) => {
      const perms = permissionsOf(u, roles);
      const roleLabel = u.roleIds.map((id) => roles.find((r) => r.id === id)?.name).join(" + ");
      return [fullName(u), u.email, roleLabel, ...PERMISSIONS.map((p) => (perms.has(p.id) ? "oui" : "non"))];
    });
    const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "oralys-matrice-acces.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles & droits"
        description="Qui a accès à quoi, en un coup d'œil. Utile en revue de sécurité ou en cas de contrôle RGPD / secret médical."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Exporter pour audit
            </Button>
            <Gate perm="param.cabinet">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Nouveau rôle
              </Button>
            </Gate>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
          <ToggleGroupItem value="roles" className="px-3">
            Rôles × droits
          </ToggleGroupItem>
          <ToggleGroupItem value="users" className="px-3">
            Utilisateurs × droits
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5 text-pink-500" /> Réservé aux professionnels de santé
          </span>
          {!editable && <Badge variant="outline">Lecture seule : droit « Modifier les rôles » requis</Badge>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="sticky left-0 z-10 min-w-72 bg-slate-50 px-4 py-3 text-left font-medium text-slate-500">Droit</th>
              {view === "roles"
                ? roles.map((r) => (
                    <th key={r.id} className="min-w-32 px-3 py-3 text-center align-bottom">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1 font-medium text-slate-900">
                          {r.name}
                          {r.healthProfessional && <Stethoscope className="size-3.5 text-pink-600" />}
                        </span>
                        <span className="text-[0.7rem] font-normal text-slate-500">
                          {users.filter((u) => u.status === "actif" && u.roleIds.includes(r.id)).length} pers.
                          {r.predefined ? " · par défaut" : " · personnalisé"}
                        </span>
                        {!r.predefined && editable && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Supprimer ${r.name}`}
                            onClick={() => {
                              const res = deleteRole(r.id);
                              if (res.ok) toast.success(`Rôle ${r.name} supprimé`);
                              else toast.error(res.error);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))
                : activeUsers.map((u) => (
                    <th key={u.id} className="min-w-24 px-2 py-3 text-center align-bottom font-normal">
                      <div className="flex flex-col items-center gap-1">
                        <UserAvatar user={u} className="size-7" />
                        <span className="text-xs leading-tight text-slate-700">{fullName(u)}</span>
                      </div>
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map((cat) => (
              <Fragment key={cat.id}>
                <tr className="border-b bg-pink-50/40">
                  <td colSpan={999} className="sticky left-0 px-4 py-2">
                    <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">{cat.label}</span>
                    <span className="ml-2 text-xs text-slate-500">{cat.hint}</span>
                  </td>
                </tr>
                {PERMISSIONS.filter((p) => p.category === cat.id).map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        {p.label}
                        {p.reservedToHealthPro && <Lock className="size-3.5 text-pink-500" />}
                        {p.isNew && <Badge variant="outline" className="h-4 border-pink-200 px-1 text-[0.6rem] text-pink-700">Nouveau Team</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">{p.description}</div>
                    </td>
                    {view === "roles"
                      ? roles.map((r) => {
                          const blocked = p.reservedToHealthPro && !r.healthProfessional;
                          const checked = r.permissions.includes(p.id);
                          return (
                            <td key={r.id} className="px-3 text-center">
                              {blocked ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex size-4 items-center justify-center rounded-sm bg-slate-100 text-slate-300">
                                      <Minus className="size-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Acte réservé : ce rôle n&apos;est pas un rôle de professionnel de santé.</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Checkbox
                                  checked={checked}
                                  disabled={!editable}
                                  onCheckedChange={() => toggle(r, p.id)}
                                  aria-label={`${p.label} pour ${r.name}`}
                                />
                              )}
                            </td>
                          );
                        })
                      : activeUsers.map((u) => {
                          const has = permissionsOf(u, roles).has(p.id);
                          return (
                            <td key={u.id} className="px-2 text-center">
                              {has ? (
                                <Check className={cn("mx-auto size-4", p.reservedToHealthPro ? "text-pink-600" : "text-emerald-600")} />
                              ) : (
                                <span className="text-slate-200">·</span>
                              )}
                            </td>
                          );
                        })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { roles, createRole } = useTeam();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [base, setBase] = useState("none");
  const [healthPro, setHealthPro] = useState(false);
  const [transverse, setTransverse] = useState(false);
  const duplicate = roles.some((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase());

  function submit() {
    if (!name.trim() || duplicate) return;
    const baseRole = roles.find((r) => r.id === base);
    const permissions = (baseRole?.permissions ?? []).filter(
      (p) => healthPro || !PERMISSIONS.find((x) => x.id === p)?.reservedToHealthPro
    );
    createRole({ name: name.trim(), description: description.trim(), healthProfessional: healthPro, transverse, permissions });
    toast.success(`Rôle ${name.trim()} créé`);
    setName("");
    setDescription("");
    setBase("none");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau rôle</DialogTitle>
          <DialogDescription>Partez d&apos;un rôle par défaut plutôt que d&apos;une feuille blanche.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nom du rôle</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Assistante orthodontie" autoFocus />
            {duplicate && <p className="text-xs text-destructive">Un rôle porte déjà ce nom.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Copier les droits de</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun (vide)</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Label className="flex items-center justify-between gap-3 rounded-lg border p-3 font-normal">
            <span>
              <span className="block font-medium">Professionnel de santé</span>
              <span className="block text-xs text-slate-500">Autorise les actes réservés (ordonnance, cotation…)</span>
            </span>
            <Switch checked={healthPro} onCheckedChange={setHealthPro} />
          </Label>
          <Label className="flex items-center justify-between gap-3 rounded-lg border p-3 font-normal">
            <span>
              <span className="block font-medium">Rôle transverse</span>
              <span className="block text-xs text-slate-500">Cumulable avec un rôle principal (ex. référent stérilisation)</span>
            </span>
            <Switch checked={transverse} onCheckedChange={setTransverse} />
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!name.trim() || duplicate}>
            Créer le rôle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
