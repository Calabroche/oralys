"use client";

import { AccessKey, useAccess } from "@/components/team/Access";
import { ReactNode, useEffect, useState } from "react";
import { useAgendaData } from "@/context/AgendaDataContext";
import { teamAbsencePeriods } from "@/lib/soinsSync";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  MonitorSmartphone,
  RotateCcw,
  Map as MapIcon,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OralysLogo } from "@/components/team/OralysLogo";
import { QuickSwitchDialog } from "@/components/team/QuickSwitchDialog";
import { PunchClock } from "@/components/team/PunchClock";
import { UserAvatar } from "@/components/team/shared";
import { TeamDataProvider, useTeam } from "@/context/TeamDataContext";
import { frequenceLabel, missionsSummary } from "@/lib/missions";
import { toISODate } from "@/utils/date";
import { TeamNotification } from "@/types/team";
import { PersonSheetProvider } from "@/components/team/PersonSheet";
import {
  Feature,
  VERSIONS,
  Version,
  VersionBadge,
  VersionProvider,
  useSwitchVersion,
  useVersion,
} from "@/components/team/Version";
import { TEAM_CABINET_NAME } from "@/data/teamMockData";
import { fullName, roleNames } from "@/lib/team";
import { cn } from "@/lib/utils";
import { SOINS_URL } from "@/lib/soins";

const TABS: {
  label: string;
  href: string;
  exact?: boolean;
  feature?: Feature;
  access?: AccessKey;
}[] = [
  // Remplacements vit dans le Planning (onglet « À remplacer ») ; la fiche praticien, dans le profil ;
  // l'Administration s'ouvre depuis le menu utilisateur (pas de doublon dans la barre).
  // Tableau de bord ouvert à tous : chacun y voit au moins le trombinoscope (l'équipe du jour).
  { label: "Tableau de bord", href: "/team", exact: true },
  { label: "Planning", href: "/team/planning" },
  { label: "Temps de travail", href: "/team/temps", feature: "pointage" },
  { label: "Aperçu Soins", href: "/team/soins" },
];

export const PLANETS = [
  {
    id: "soins",
    label: "Soins",
    href: SOINS_URL ?? "/agenda",
    dot: "bg-lime-300",
    hint: "Agenda, patients, actes",
  },
  {
    id: "team",
    label: "Team",
    href: "/team",
    dot: "bg-pink-400",
    hint: "Équipe, droits, planning",
  },
  {
    // Oralys Manage vit dans le vrai Soins de la démo (sous /manage) : absent hors démo.
    id: "manage",
    label: "Manage",
    href: SOINS_URL ? `${SOINS_URL.replace(/\/$/, "")}/manage` : null,
    dot: "bg-amber-400",
    hint: SOINS_URL ? "Pilotage, compta, devis" : "Dans la démo Oralys",
  },
];

function PlanetSwitcher() {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ml-4 flex flex-none items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-sm font-medium text-pink-900 hover:bg-pink-100">
          <span className="size-2 rounded-full bg-pink-400" />
          Team
          <ChevronDown className="size-3.5 text-pink-700" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-slate-500">
          Univers Oralys
        </DropdownMenuLabel>
        {PLANETS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            disabled={!p.href}
            onSelect={() => {
              if (!p.href || p.id === "team") return;
              // Dans la démo, le vrai Soins (et Manage) n'est pas une page Next : rechargement complet.
              if ((p.id === "soins" || p.id === "manage") && SOINS_URL) window.location.assign(p.href);
              else router.push(p.href);
            }}
            className="flex items-start gap-2.5 py-2"
          >
            <span
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", p.dot)}
            />
            <span className="flex-1">
              <span className="block font-medium">Oralys {p.label}</span>
              <span className="block text-xs text-slate-500">{p.hint}</span>
            </span>
            {p.id === "team" && <Check className="mt-1 size-4 text-pink-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Notifications() {
  const { notifications: all, markAllRead, sessionUser, now, users, profiles, can } = useTeam();
  const allowed = useAccess();
  const { has } = useVersion();
  // Rappels de missions : chacun reçoit les siennes (à faire aujourd'hui, en retard), quel que soit son rôle.
  const today = toISODate(now());
  // Rappels et contrôles de missions : V1 (suivi des missions).
  const suivi = has("missionsSuivies");
  const rappels: TeamNotification[] = sessionUser && suivi
    ? missionsSummary(sessionUser, today)
        .statuses.filter((st) => st.etat === "en_retard" || st.etat === "a_faire")
        .map((st) => ({
          id: `rappel-${st.mission.id}-${st.due?.key}`,
          at: today,
          kind: st.etat === "en_retard" ? ("rdv_risk" as const) : ("tension" as const),
          title: st.etat === "en_retard" ? `Mission en retard de ${st.retard} j : ${st.mission.titre}` : `Mission à faire aujourd'hui : ${st.mission.titre}`,
          body: `${frequenceLabel(st.mission)}. À cocher dans votre profil une fois faite.`,
          href: "/team/moi",
          read: false,
        }))
    : [];
  // Missions à contrôler : pour le gestionnaire (tout le cabinet) et le praticien (son équipe rattachée).
  const equipe = new Set(profiles.filter((p) => p.praticienUserId === sessionUser?.id).flatMap((p) => p.team.map((l) => l.userId)));
  const controles: TeamNotification[] = users
    .filter((u) => suivi && u.status === "actif" && u.id !== sessionUser?.id && (can("param.cabinet") || equipe.has(u.id)))
    .flatMap((u) =>
      missionsSummary(u, today).aControler.map((st) => ({
        id: `controle-${st.mission.id}-${st.due?.key}`,
        at: today,
        kind: "info" as const,
        title: `À contrôler : ${st.mission.titre}`,
        body: `${u.firstName} ${u.lastName} l'a cochée. À valider conforme ou non conforme dans son dossier.`,
        href: `/team/profil/${u.id}`,
        read: false,
      }))
    );
  // Les alertes (dernier moment, demandes, tensions) concernent ceux qui gèrent planning et remplacements.
  // Alertes de dernier moment : selon la version (fonction « dernierMoment »).
  const notifications = [...rappels, ...controles, ...(allowed("remplacements") ? all.filter((n) => has("dernierMoment") || n.kind !== "absence_last_minute") : [])];
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full bg-slate-100 hover:bg-slate-200"
          aria-label="Notifications"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-pink-500 text-[0.6rem] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-medium">Alertes et rappels</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            Tout marquer comme lu
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Aucune alerte.</p>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.href ?? "#"}
              className={cn(
                "block border-b px-4 py-3 last:border-0 hover:bg-slate-50",
                !n.read && "bg-pink-50/50",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.kind === "absence_last_minute" || n.kind === "rdv_risk"
                      ? "bg-rose-500"
                      : n.kind === "tension"
                        ? "bg-amber-500"
                        : "bg-sky-500",
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Header() {
  const pathname = usePathname();
  const { sessionUser, roles, workstation, resetDemo, hydrated } = useTeam();
  const [switchOpen, setSwitchOpen] = useState(false);
  const { version, has } = useVersion();
  const allowed = useAccess();
  const switchVersion = useSwitchVersion();

  return (
    <>
      {/*
        Même gabarit que l'en-tête de Soins (MainLayout du vrai Oralys), la référence : carte blanche arrondie sur fond
        gris, rangée haute de 64 px (logo, sélecteur d'univers, cabinet au centre, boutons ronds et avatar), liseré de
        couleur de la planète (rose = Team, vert = Soins), rangée basse d'onglets en pastilles.
      */}
      <div className="sticky top-0 z-50 mx-auto w-full max-w-[1700px] shrink-0 bg-[#DDDFEA] px-4 pt-4">
      <header className="flex flex-col rounded-t-[25px] border-b bg-white">
        <div className="relative flex h-16 w-full items-center px-6">
          <div className="flex flex-none items-center">
            <Link href="/team/accueil" aria-label="Accueil Oralys Team">
              <OralysLogo />
            </Link>
            <PlanetSwitcher />
            <span className="ml-2"><VersionBadge /></span>
          </div>
          <div className="flex-1 text-center">
            <button className="inline-flex items-center gap-2 text-lg font-medium text-slate-900">
              {TEAM_CABINET_NAME}
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="flex flex-none items-center justify-end gap-2">
            {has("pointage") && <PunchClock onSwitchUser={() => setSwitchOpen(true)} />}
            {/* Changer de profil existe dans toutes les versions : chacun doit pouvoir se mettre sur son profil. */}
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-slate-100 hover:bg-slate-200"
              onClick={() => setSwitchOpen(true)}
              title="Changer d'utilisateur"
              aria-label="Changer d'utilisateur"
            >
              <Users />
            </Button>
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full"
                  aria-label="Menu utilisateur"
                  title={sessionUser ? `${fullName(sessionUser)} · ${roleNames(sessionUser, roles)[0] ?? ""}${workstation ? ` · ${workstation}` : ""}` : undefined}
                >
                  {sessionUser && hydrated ? (
                    <UserAvatar user={sessionUser} className="size-10 border border-gray-300" />
                  ) : (
                    <span className="block size-10 rounded-full bg-slate-100" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96">
                {sessionUser && (
                  <DropdownMenuLabel>
                    <span className="block font-medium text-slate-900">
                      {fullName(sessionUser)}
                    </span>
                    <span className="block text-xs font-normal text-slate-500">
                      {roleNames(sessionUser, roles).join(" + ")}
                    </span>
                  </DropdownMenuLabel>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-slate-500">
                  Version de la démo
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={version}
                  onValueChange={(v) => switchVersion(v as Version)}
                >
                  {VERSIONS.map((v) => (
                    <DropdownMenuRadioItem
                      key={v.id}
                      value={v.id}
                      onSelect={(e) => e.preventDefault()}
                      className="items-start"
                    >
                      <span className="w-9 shrink-0 font-semibold">
                        {v.label}
                      </span>
                      <span className="leading-snug">
                        <span className="block text-sm font-medium text-slate-800">{v.title}</span>
                        <span className="block text-xs text-slate-500">{v.pitch}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuItem asChild>
                  <Link href="/team/feuille-de-route">
                    <MapIcon /> Feuille de route MVP → V3
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/team/moi">
                    <UserRound /> {has("profil") ? "Mon profil, dispos & préférences" : "Mon profil et mes jours de travail"}
                  </Link>
                </DropdownMenuItem>
                {allowed("administration") && (
                  <DropdownMenuItem asChild>
                    <Link href="/team/reglages">
                      <Settings /> Administration
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setSwitchOpen(true)}>
                  <Users /> Changer d&apos;utilisateur (PIN)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={resetDemo}>
                  <RotateCcw /> Réinitialiser la démo
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <LogOut /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="absolute right-0 bottom-0 left-0 h-1 rounded-full bg-pink-400" />
        </div>
      <nav className="flex h-[53px] w-full items-center bg-gradient-to-b from-[#F2F4F8] to-white px-4">
        <ul className="flex flex-wrap items-center gap-1">
          {TABS.filter((t) => (!t.feature || has(t.feature)) && (!t.access || allowed(t.access))).map((t) => {
            const active = t.exact
              ? pathname === t.href
              : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-gray-200 bg-white text-slate-900"
                      : "border-transparent bg-transparent text-slate-900 hover:bg-slate-100",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </header>
      </div>
      <QuickSwitchDialog open={switchOpen} onOpenChange={setSwitchOpen} />
    </>
  );
}

/**
 * Les absences validées de chaque praticien ferment son agenda Soins : Team recalcule les périodes « team-… »
 * à chaque changement (validation, annulation, jour retiré…), sans toucher aux fermetures posées dans Soins.
 * Si la version de la démo n'a pas la fonction « dernierMoment », aucune période n'est envoyée.
 */
function SoinsSync() {
  const { absences, profiles } = useTeam();
  const { syncTeamPeriods } = useAgendaData();
  const ferme = useVersion().has("dernierMoment");
  useEffect(() => {
    syncTeamPeriods(ferme ? teamAbsencePeriods(absences, profiles) : []);
  }, [absences, profiles, syncTeamPeriods, ferme]);
  return null;
}

export function TeamShell({ children }: { children: ReactNode }) {
  return (
    <TeamDataProvider>
      <VersionProvider>
        <SoinsSync />
        <TooltipProvider delayDuration={200}>
          <PersonSheetProvider>
            <div className="flex min-h-screen flex-col bg-[#DDDFEA]">
              <Header />
              <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col px-4">
                <div className="flex-1 bg-white px-4 pb-4">{children}</div>
              </div>
            </div>
          </PersonSheetProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </VersionProvider>
    </TeamDataProvider>
  );
}
