"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Info, Stethoscope } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/context/TeamDataContext";
import { AM_PATTERN, CHAIR_ROLE_IDS, EMAIL_PATTERN, RPPS_PATTERN, fullName, normalizeEmail } from "@/lib/team";
import { Poste, TeamUser } from "@/types/team";
import { cn } from "@/lib/utils";
import { InvitationEmail } from "@/components/team/users/InvitationEmail";
import { PERMISSIONS } from "@/data/teamMockData";

const POSTES: { value: Poste; label: string }[] = [
  { value: "praticien", label: "Praticien" },
  { value: "assistant", label: "Assistant(e) dentaire" },
  { value: "secretariat", label: "Secrétariat" },
  { value: "gestion", label: "Gestion / direction" },
];

export function UserFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: TeamUser | null;
}) {
  // Remonte le formulaire à chaque ouverture pour repartir de valeurs propres.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {open && <UserForm key={editing?.id ?? "new"} editing={editing ?? null} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function UserForm({ editing, onDone }: { editing: TeamUser | null; onDone: () => void }) {
  const { roles, profiles, users, createUser, updateUser, emailTaken, findUser } = useTeam();
  const [firstName, setFirstName] = useState(editing?.firstName ?? "");
  const [lastName, setLastName] = useState(editing?.lastName ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [poste, setPoste] = useState<Poste>(editing?.poste ?? "assistant");
  const [roleIds, setRoleIds] = useState<string[]>(editing?.roleIds ?? []);
  const [env, setEnv] = useState<string>(editing?.defaultEnvironmentId ?? "none");
  const [rpps, setRpps] = useState(editing?.rpps ?? "");
  const [numeroAM, setNumeroAM] = useState(editing?.numeroAM ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const created = createdId ? findUser(createdId) : null;
  if (created) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Invitation envoyée</DialogTitle>
          <DialogDescription>
            {fullName(created)} reçoit un lien pour définir son mot de passe. Personne d&apos;autre ne le connaîtra.
          </DialogDescription>
        </DialogHeader>
        <InvitationEmail user={created} />
        <DialogFooter>
          <Button onClick={onDone}>Terminer</Button>
        </DialogFooter>
      </>
    );
  }

  const normalized = normalizeEmail(email);
  const duplicate = normalized ? emailTaken(normalized, editing?.id) : undefined;
  const emailInvalid = normalized.length > 0 && !EMAIL_PATTERN.test(normalized);
  const homonym = users.find(
    (u) =>
      u.id !== editing?.id &&
      u.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
      u.lastName.toLowerCase() === lastName.trim().toLowerCase()
  );
  const selectedRoles = roles.filter((r) => roleIds.includes(r.id));
  const isHealthPro = selectedRoles.some((r) => r.healthProfessional);
  const activeProfiles = profiles.filter((p) => findUser(p.praticienUserId)?.status !== "archive");
  // Au fauteuil (assistant, aide dentaire, infirmier) : un praticien de rattachement est obligatoire (modifiable ensuite).
  // Secrétaire, comptable, gestionnaire : pas d'environnement Soins à choisir, le champ n'apparaît pas.
  const needsPraticien = !isHealthPro && roleIds.some((r) => CHAIR_ROLE_IDS.includes(r));
  const missingPraticien = needsPraticien && env === "none";
  // Praticien : RPPS et n° Assurance Maladie obligatoires.
  const rppsClean = rpps.replace(/\s/g, "");
  const amClean = numeroAM.replace(/\s/g, "");
  const rppsError = isHealthPro && !RPPS_PATTERN.test(rppsClean) ? (rppsClean ? "11 chiffres attendus" : "Obligatoire pour un praticien") : null;
  const amError = isHealthPro && !AM_PATTERN.test(amClean) ? (amClean ? "9 chiffres attendus" : "Obligatoire pour un praticien") : null;

  const toggleRole = (id: string) => setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function submit() {
    setSubmitted(true);
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !normalized || emailInvalid || duplicate || roleIds.length === 0 || missingPraticien || rppsError || amError) return;
    // Hors fauteuil, le praticien avec qui la personne travaille reste facultatif (affiché s'il est renseigné).
    const envId = env === "none" ? null : env;
    const ids = isHealthPro ? { rpps: rppsClean, numeroAM: amClean } : { rpps: undefined, numeroAM: undefined };
    if (editing) {
      const res = updateUser({ ...editing, firstName: firstName.trim(), lastName: lastName.trim(), email: normalized, poste, roleIds, defaultEnvironmentId: envId, ...ids });
      if (!res.ok) return setError(res.error);
      toast.success("Utilisateur mis à jour", {
        description: "Les droits s'appliquent immédiatement dans Soins, sans reconnexion.",
      });
      onDone();
    } else {
      const res = createUser({ firstName, lastName, email: normalized, poste, roleIds, defaultEnvironmentId: envId, ...ids });
      if (!res.ok) return setError(res.error);
      setCreatedId(res.id ?? null);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? `Modifier ${fullName(editing)}` : "Ajouter un utilisateur"}</DialogTitle>
        <DialogDescription>
          {editing ? "Les changements de rôle sont tracés dans le journal d'audit." : "Un email d'invitation lui permettra de définir son mot de passe."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" error={submitted && !firstName.trim() ? "Obligatoire" : null}>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Julie" autoFocus />
          </Field>
          <Field label="Nom" error={submitted && !lastName.trim() ? "Obligatoire" : null}>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dubois" />
          </Field>
        </div>

        <Field
          label="Email professionnel (identifiant)"
          error={
            duplicate
              ? `Identifiant déjà utilisé par ${fullName(duplicate)}${duplicate.status === "archive" ? " (archivé : réactivez plutôt ce compte)" : ""}.`
              : emailInvalid
                ? "Format d'email invalide."
                : submitted && !normalized
                  ? "Obligatoire"
                  : null
          }
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@cabinet.fr"
            aria-invalid={Boolean(duplicate || emailInvalid)}
          />
        </Field>
        {homonym && !duplicate && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle />
            <AlertTitle>Homonyme détecté</AlertTitle>
            <AlertDescription className="text-amber-800">
              {fullName(homonym)} existe déjà ({homonym.email}). Vérifiez qu&apos;il ne s&apos;agit pas de la même personne.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Poste principal">
            <Select value={poste} onValueChange={(v) => setPoste(v as Poste)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSTES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {(roleIds.length > 0 || isHealthPro) && (
          <Field
            label={needsPraticien ? "Praticien de rattachement *" : isHealthPro ? "Environnement Soins par défaut" : "Travaille avec (facultatif)"}
            error={submitted && missingPraticien ? "Obligatoire pour un assistant, une aide dentaire ou un infirmier" : null}
          >
            <Select value={env} onValueChange={setEnv} disabled={isHealthPro && !editing}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isHealthPro && !editing ? "Créé automatiquement" : undefined} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{needsPraticien ? "Choisir un praticien" : "Personne en particulier"}</SelectItem>
                {activeProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          )}
        </div>

        {isHealthPro && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Numéro RPPS *" error={submitted ? rppsError : null}>
              <Input value={rpps} onChange={(e) => setRpps(e.target.value)} inputMode="numeric" placeholder="11 chiffres" aria-invalid={Boolean(submitted && rppsError)} />
            </Field>
            <Field label="Numéro Assurance Maladie *" error={submitted ? amError : null}>
              <Input value={numeroAM} onChange={(e) => setNumeroAM(e.target.value)} inputMode="numeric" placeholder="9 chiffres" aria-invalid={Boolean(submitted && amError)} />
            </Field>
          </div>
        )}

        {/* Même logique que la modale « Rôles de … » de la prod : on coche des rôles, les permissions couvertes s'affichent en direct. */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>
                Rôles <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-slate-500">Cumul autorisé</span>
            </div>
            <div className="space-y-1">
              {roles.map((r) => {
                const checked = roleIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                      checked ? "bg-pink-50" : "hover:bg-slate-50"
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleRole(r.id)} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {r.name}
                        {r.healthProfessional && <Stethoscope className="size-3.5 text-pink-600" />}
                        {r.transverse && (
                          <Badge variant="outline" className="h-4 px-1 text-[0.6rem]">
                            transverse
                          </Badge>
                        )}
                      </span>
                      <span className="block text-xs text-slate-500">{r.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {submitted && roleIds.length === 0 && <p className="text-xs text-destructive">Au moins un rôle est requis.</p>}
          </div>
          <div className="space-y-2">
            <Label>Permissions couvertes</Label>
            <ul className="space-y-1">
              {PERMISSIONS.map((p) => {
                const covered = selectedRoles.some((r) => r.permissions.includes(p.id));
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      covered ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-400"
                    )}
                  >
                    {covered ? <Check className="size-3.5" /> : <span className="size-3.5" />}
                    {p.label}
                    {p.isNew && (
                      <Badge variant="outline" className="ml-auto h-4 border-pink-200 px-1 text-[0.6rem] text-pink-700">
                        Team
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {isHealthPro && !editing && (
          <Alert>
            <Info />
            <AlertDescription>
              Rôle de professionnel de santé : un profil praticien (environnement Soins) sera créé et rattaché à ce compte.
              Il ne peut pas exister de profil praticien sans utilisateur.
            </AlertDescription>
          </Alert>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={Boolean(duplicate)}>
          {editing ? "Enregistrer" : "Créer et inviter"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
