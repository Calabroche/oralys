"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarX2,
  Eye,
  FileText,
  FlaskConical,
  Hand,
  Lock,
  Pill,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeam } from "@/context/TeamDataContext";
import { useAgendaData } from "@/context/AgendaDataContext";
import { CandidateList } from "@/components/team/CandidateList";
import { PageHeader, UserAvatar } from "@/components/team/shared";
import { ACTES, PERMISSIONS, defaultAssistantFor } from "@/data/teamMockData";
import {
  ABSENCE_TYPE_LABELS,
  absenceOn,
  acteLabel,
  displayName,
  fullName,
  isHealthProfessional,
  permissionsOf,
  roleNames,
  shortDate,
  sortCandidates,
  suggestAssistants,
  worksOn,
} from "@/lib/team";
import { ActeCategory, PermissionId } from "@/types/team";
import { fromISODate, toISODate, toWeekday } from "@/utils/date";
import { cn } from "@/lib/utils";
import { useVersion } from "@/components/team/Version";
import { rangeLong, rangeShort } from "@/lib/demoClock";

export default function SoinsPreviewPage() {
  const { has, version } = useVersion();
  // Chaque point de contact avec Soins arrive avec sa version ; l'agenda fermé existe dès le MVP.
  const tabs = [
    { value: "rdv", label: "Prise de RDV", show: has("suggestionSoins") },
    { value: "droits", label: "Fiche patient & droits", show: has("droitsSoins") },
    { value: "sterilisation", label: "Stérilisation (poste partagé)", show: has("sterilisation") },
    { value: "agenda", label: "Agenda fermé", show: true },
  ].filter((t) => t.show);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-8 py-8">
      <PageHeader
        title="Aperçu : Team vu depuis Soins"
        description="Simulation des points de contact : ce que Soins fait des données Team, à jour en temps réel."
        actions={
          <Button variant="outline" asChild>
            <Link href="/agenda">
              Ouvrir Oralys Soins <ArrowUpRight />
            </Link>
          </Button>
        }
      />
      <Tabs key={version} defaultValue={tabs[0].value}>
        <TabsList variant="line">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="rdv" className="mt-5">
          <PriseRdv />
        </TabsContent>
        <TabsContent value="droits" className="mt-5">
          <FichePatient />
        </TabsContent>
        <TabsContent value="sterilisation" className="mt-5">
          <Sterilisation />
        </TabsContent>
        <TabsContent value="agenda" className="mt-5">
          <AgendaFerme />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Brique 3 : suggestion contextuelle à la prise de RDV --------------------

function PriseRdv() {
  const { users, profiles, absences, rdvs, findUser, now, addRdv } = useTeam();
  const demoRange = useDemoRange();
  const active = profiles.filter((p) => findUser(p.praticienUserId)?.status === "actif");
  const [profileId, setProfileId] = useState(active[0]?.id ?? "");
  const [date, setDate] = useState(toISODate(now()));
  const [slot, setSlot] = useState("11:45");
  const [acte, setActe] = useState<ActeCategory>("implantologie");
  const [patient, setPatient] = useState("Claire Bernard");
  const [showAll, setShowAll] = useState(false);

  const profile = profiles.find((p) => p.id === profileId);
  const praticien = findUser(profile?.praticienUserId);
  if (!profile || !praticien) return null;
  const day = toWeekday(fromISODate(date));
  const usualId = day ? defaultAssistantFor(profile, day) : null;
  const usual = findUser(usualId);
  const praticienAbs = absenceOn(praticien.id, date, absences);
  const usualAbs = usual ? absenceOn(usual.id, date, absences) : undefined;
  const praticienOff = !worksOn(praticien, date);
  const candidates = sortCandidates(
    suggestAssistants({ praticienUserId: praticien.id, date, start: slot, acte }, { users, profiles, absences, rdvs }),
    "affinite"
  );
  const best = candidates.find((c) => c.eligible);
  const usualAvailable = usual && !usualAbs && worksOn(usual, date) && candidates.find((c) => c.user.id === usual.id)?.eligible;
  const end = `${String(Number(slot.slice(0, 2)) + 1).padStart(2, "0")}${slot.slice(2)}`;

  function book(assistantId: string | null) {
    addRdv({ date, start: slot, end, praticienUserId: praticien!.id, assistantUserId: assistantId, patient, acte, room: profile!.rooms[0] ?? "Salle 1" });
    const a = findUser(assistantId);
    toast.success("RDV posé dans Soins", { description: `${shortDate(date)} ${slot} · ${displayName(praticien!)}${a ? ` + ${a.firstName}` : ""}` });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Nouveau rendez-vous</CardTitle>
          <CardDescription>Formulaire Soins (simplifié)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Input value={patient} onChange={(e) => setPatient(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Praticien</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["09:00", "10:30", "11:45", "14:00", "15:30", "17:00"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motif / acte</Label>
            <Select value={acte} onValueChange={(v) => setActe(v as ActeCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTES.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            Astuce démo : Dr Martin {demoRange("abs-t1")} (Thomas en arrêt maladie), ou Dr Dray {demoRange("abs-t2")} (Camille en congé).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {praticienAbs || praticienOff ? (
          <Alert variant="destructive">
            <CalendarX2 />
            <AlertTitle>Agenda fermé</AlertTitle>
            <AlertDescription>
              {praticienAbs
                ? `${displayName(praticien)} est en ${ABSENCE_TYPE_LABELS[praticienAbs.type].toLowerCase()} (déclaré dans Team)${praticienAbs.status === "demandee" ? ", demande en cours de validation" : ""}. Aucun RDV ne peut être pris.`
                : `${displayName(praticien)} ne consulte pas ce jour-là.`}
            </AlertDescription>
          </Alert>
        ) : (profile.assistantsNeeded ?? 1) === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-slate-500">Paramétré dans Team</p>
                <p className="font-medium">{displayName(praticien)} travaille sans assistant</p>
              </div>
              <Button onClick={() => book(null)}>Poser le RDV</Button>
            </CardContent>
          </Card>
        ) : usualAvailable ? (
          <Card>
            <CardContent className="flex items-center gap-4">
              <UserAvatar user={usual} className="size-11" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Assistant(e) habituel(le), disponible</p>
                <p className="font-medium">{fullName(usual)}</p>
              </div>
              <Button onClick={() => book(usual.id)}>Poser le RDV avec {usual.firstName}</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle />
              <AlertTitle>
                {usual
                  ? `${fullName(usual)}, assistant(e) habituel(le), ${usualAbs ? `est absent(e) : ${ABSENCE_TYPE_LABELS[usualAbs.type].toLowerCase()}` : "n'est pas disponible sur ce créneau"}`
                  : "Aucun assistant attitré ce jour-là"}
              </AlertTitle>
              <AlertDescription className="text-amber-800">Alerte issue de Team, pour ne pas planifier un RDV impossible à honorer.</AlertDescription>
            </Alert>
            {best ? (
              <Card className="border-pink-200 bg-pink-50/40">
                <CardContent className="flex items-center gap-4">
                  <UserAvatar user={best.user} className="size-11" />
                  <div className="flex-1">
                    <p className="flex items-center gap-1.5 text-sm text-pink-700">
                      <Sparkles className="size-4" /> Meilleur binôme disponible pour {acteLabel(acte).toLowerCase()}
                    </p>
                    <p className="font-medium">
                      {fullName(best.user)} <span className="text-sm font-normal text-slate-500">· {best.tierLabel} · affinité {best.score}/100</span>
                    </p>
                  </div>
                  <Button onClick={() => book(best.user.id)}>Poser avec {best.user.firstName}</Button>
                </CardContent>
              </Card>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Aucun remplaçant admissible</AlertTitle>
                <AlertDescription>Proposez un autre créneau au patient.</AlertDescription>
              </Alert>
            )}
            <Button variant="link" className="px-0" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Masquer" : "Voir"} toutes les options classées
            </Button>
            {showAll && <CandidateList candidates={candidates} mode="affinite" onAssign={(c) => book(c.user.id)} assignLabel="Choisir" />}
          </>
        )}
      </div>
    </div>
  );
}

// --- Droits appliqués en direct + accès concurrent ---------------------------

const ACTIONS: { perm: PermissionId; label: string; icon: typeof Pill }[] = [
  { perm: "clinique.decision", label: "Rédiger une ordonnance", icon: Pill },
  { perm: "clinique.decision", label: "Plan de traitement", icon: FileText },
  { perm: "clinique.assistance", label: "Dossier patient", icon: Eye },
  { perm: "adressage", label: "Adresser le patient", icon: Stethoscope },
  { perm: "facturation", label: "Carte Vitale & facturation", icon: Receipt },
  { perm: "compta", label: "Gestion comptable", icon: Wallet },
];

function FichePatient() {
  const { sessionUser, roles, users, log } = useTeam();
  const [readOnly, setReadOnly] = useState(true);
  const [elapsed, setElapsed] = useState(3);
  const other = users.find((u) => u.id === "u-nathalie" && u.id !== sessionUser?.id) ?? users.find((u) => u.status === "actif" && u.id !== sessionUser?.id);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!sessionUser) return null;
  const perms = permissionsOf(sessionUser, roles);
  const healthPro = isHealthProfessional(sessionUser, roles);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Marc Fontaine · 54 ans</CardTitle>
          <CardDescription>Fiche patient Soins · dernière visite il y a 3 mois</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {other && (
            <Alert className="border-sky-200 bg-sky-50 text-sky-900">
              <Eye />
              <AlertTitle>
                En cours de consultation par {fullName(other)} depuis {elapsed} min
              </AlertTitle>
              <AlertDescription className="text-sky-800">
                {readOnly
                  ? "Vous êtes en lecture seule pour éviter un conflit de modification."
                  : "Vous avez la main : les modifications de l'autre poste sont gelées."}
              </AlertDescription>
              {readOnly && (
                <AlertAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReadOnly(false);
                      toast(`Demande envoyée à ${other.firstName}`, { description: "Accordée (simulation)." });
                    }}
                  >
                    <Hand /> Demander la main
                  </Button>
                </AlertAction>
              )}
            </Alert>
          )}
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              Actions disponibles pour {fullName(sessionUser)} ({roleNames(sessionUser, roles).join(" + ")})
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIONS.map((a) => {
                const def = PERMISSIONS.find((p) => p.id === a.perm)!;
                const allowed = perms.has(a.perm);
                // Les actes réservés sont masqués pour un non-professionnel de santé, les autres simplement grisés.
                if (!allowed && def.reservedToHealthPro && !healthPro) return null;
                const btn = (
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-start py-2.5"
                    disabled={!allowed || (readOnly && a.perm !== "clinique.assistance")}
                    onClick={() => {
                      if (a.perm === "facturation") log("paiement.note", "Note ajoutée sur un paiement (patient M. Fontaine)");
                      toast.success(a.label, { description: "Action autorisée." });
                    }}
                  >
                    <a.icon /> {a.label}
                  </Button>
                );
                return allowed ? (
                  <div key={a.label}>{btn}</div>
                ) : (
                  <Tooltip key={a.label}>
                    <TooltipTrigger asChild>
                      <div>{btn}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Lock className="mr-1 inline size-3" /> Non autorisé pour vos rôles
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            {!healthPro && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="size-3.5" /> La décision clinique, réservée aux professionnels de santé, est masquée pour votre profil.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Tester les droits en direct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>1. Utilisez « Changer d&apos;utilisateur » (PIN 1234) pour passer sur Thomas (assistant) : l&apos;ordonnance et le plan de traitement disparaissent.</p>
          <p>2. Ou retirez un droit dans Administration → Rôles & droits : il est retiré ici immédiatement, sans reconnexion.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/team/reglages/roles">Ouvrir la matrice des droits</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Stérilisation : opérateur explicite sur poste partagé --------------------

function Sterilisation() {
  const { users, roles, sessionUser, workstation, log, audit } = useTeam();
  const [operator, setOperator] = useState<string>("");
  const [autoclave, setAutoclave] = useState("A");
  // Numéro suivant déduit du journal : il continue après un rechargement.
  const cycle =
    1 + Math.max(1302, ...audit.filter((e) => e.action === "sterilisation.cycle").map((e) => Number(/n°(\d+)/.exec(e.summary)?.[1] ?? 0)));
  const operators = users.filter((u) => u.status === "actif" && permissionsOf(u, roles).has("sterilisation"));
  const op = users.find((u) => u.id === operator);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-pink-600" /> Lancer un cycle de stérilisation
          </CardTitle>
          <CardDescription>
            Session ouverte : <span className="font-medium text-slate-700">{sessionUser ? fullName(sessionUser) : "?"}</span>
            {workstation ? ` sur ${workstation}` : " (poste personnel)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Qui opère ce cycle ?</Label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger className="w-full" aria-invalid={!operator}>
                <SelectValue placeholder="Sélection obligatoire" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {fullName(u)} · {roleNames(u, roles).join(" + ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              On ne suppose jamais que la session connectée est la bonne personne : la traçabilité doit refléter l&apos;opérateur réel.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Autoclave</Label>
            <Select value={autoclave} onValueChange={setAutoclave}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Autoclave A · Prion 134 °C 18 min</SelectItem>
                <SelectItem value="B">Autoclave B · Standard 134 °C 4 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {op && sessionUser && op.id !== sessionUser.id && (
            <Alert>
              <AlertTriangle />
              <AlertDescription>
                L&apos;opérateur ({fullName(op)}) est différent de la session ouverte ({fullName(sessionUser)}). Les deux sont enregistrés.
              </AlertDescription>
            </Alert>
          )}
          <Button
            disabled={!op}
            onClick={() => {
              if (!op) return;
              log("sterilisation.cycle", `Cycle de stérilisation n°${cycle} lancé (autoclave ${autoclave}), session ouverte : ${sessionUser ? fullName(sessionUser) : "?"}`, {
                actorId: op.id,
                actorRoles: roleNames(op, roles),
                workstation: workstation ?? "Poste stérilisation",
              });
              toast.success(`Cycle n°${cycle} lancé`, { description: `Opérateur tracé : ${fullName(op)}` });
              setOperator("");
            }}
          >
            Lancer le cycle n°{cycle}
          </Button>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Où le retrouver ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Chaque cycle apparaît dans le journal d&apos;audit, avec l&apos;opérateur, son rôle au moment de l&apos;action et le poste.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/team/reglages/journal">Voir le journal</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Agenda fermé automatiquement -------------------------------------------

function AgendaFerme() {
  const { absences, findUser } = useTeam();
  const demoRange = useDemoRange();
  const { absencePeriods } = useAgendaData();
  const synced = absencePeriods.filter((a) => a.id.startsWith("team-"));
  const praticienAbsences = absences.filter((a) => findUser(a.userId)?.poste === "praticien" && a.status !== "refusee");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Absences praticiens déclarées dans Team</CardTitle>
          <CardDescription>Une fois validées, l&apos;agenda Soins se ferme automatiquement sur la période.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {praticienAbsences.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  <span className="font-medium">{displayName(findUser(a.userId)!)}</span> · {shortDate(a.startDate)} → {shortDate(a.endDate)}
                </span>
                <Badge variant="outline" className={cn(a.status === "validee" ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700")}>
                  {a.status === "validee" ? "Agenda fermé" : "En attente de validation"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Côté Soins : agenda de Dr Flore Perche</CardTitle>
          <CardDescription>Périodes d&apos;absence créées automatiquement par Team dans le prototype Soins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {synced.length === 0 ? (
            <p className="text-sm text-slate-500">
              Rien pour l&apos;instant. Validez la demande de congé de Dr Perche{demoRange("abs-t3", " ")} dans Planning → Demandes à valider.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {synced.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <CalendarX2 className="size-4 text-rose-500" /> {s.motif} · {shortDate(s.startDate)} → {shortDate(s.endDate)}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/team/planning?tab=demandes">Demandes à valider</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/reglages/agenda#periodes-absence">
                Voir dans Soins <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Dates d'une absence de la démo, pour les astuces (elles suivent la date du jour). */
function useDemoRange() {
  const { absences } = useTeam();
  return (id: string, prefix = "") => {
    const a = absences.find((x) => x.id === id);
    if (!a) return id === "abs-t3" ? "" : "un jour où son équipe est incomplète";
    return id === "abs-t3" ? `${prefix}(${rangeShort(a.startDate, a.endDate)})` : rangeLong(a.startDate, a.endDate);
  };
}
