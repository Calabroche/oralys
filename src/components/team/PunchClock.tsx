"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Clock, Coffee, LogIn, LogOut, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { fullName } from "@/lib/team";
import { PUNCH_LABELS, SOURCE_LABELS, dayTime, formatMinutes, nextKinds, nowMinutesOf, timeOf } from "@/lib/time";
import { PunchKind } from "@/types/team";
import { toISODate } from "@/utils/date";
import { cn } from "@/lib/utils";

const ACTION: Record<PunchKind, { label: string; icon: typeof LogIn }> = {
  arrivee: { label: "Commencer ma journée", icon: LogIn },
  pause: { label: "Prendre ma pause", icon: Coffee },
  reprise: { label: "Reprendre", icon: Play },
  depart: { label: "Finir ma journée", icon: LogOut },
};

/**
 * Pointeuse de l'en-tête (V4) : remplace les bipeurs. On pointe toujours pour la personne
 * connectée, dont le nom est rappelé en grand : sur un poste partagé, on vérifie d'abord qui on est.
 */
export function PunchClock({ onSwitchUser }: { onSwitchUser: () => void }) {
  const { sessionUser, punches, punch, workstation } = useTeam();
  // Le temps affiché avance tout seul pendant qu'on est en poste.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!sessionUser) return null; // Tout le monde pointe, praticiens compris.
  const today = toISODate(now);
  const day = dayTime(sessionUser.id, today, punches, nowMinutesOf(now));
  const kinds = nextKinds(day.state);

  const chip =
    day.state === "en_poste"
      ? { text: `En poste · ${formatMinutes(day.workedMinutes)}`, cls: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" }
      : day.state === "en_pause"
        ? { text: `En pause depuis ${timeOf(day.since!)}`, cls: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" }
        : day.state === "parti"
          ? { text: `Journée finie · ${formatMinutes(day.workedMinutes)}`, cls: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-400" }
          : { text: "Pas encore pointé", cls: "border-pink-200 bg-pink-50 text-pink-800", dot: "bg-pink-400" };

  function doPunch(kind: PunchKind) {
    punch(kind);
    toast.success(`${PUNCH_LABELS[kind]} pointé(e) à ${now.toTimeString().slice(0, 5)}`, {
      description: `${fullName(sessionUser!)}${workstation ? ` · ${workstation}` : ""}`,
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium", chip.cls)} aria-label="Pointage">
          <span className={cn("size-2 rounded-full", chip.dot, day.state === "en_poste" && "animate-pulse")} />
          <Clock className="size-3.5" />
          {chip.text}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        {/* On rappelle qui pointe : c'est le point clé sur un poste partagé. */}
        <div className="flex items-center gap-3">
          <UserAvatar user={sessionUser} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{fullName(sessionUser)}</p>
            <p className="text-xs text-slate-500">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              {workstation && ` · ${workstation}`}
            </p>
          </div>
        </div>
        <button onClick={onSwitchUser} className="mt-1 text-xs text-pink-700 hover:underline">
          Ce n&apos;est pas vous ? Changer d&apos;utilisateur
        </button>

        <div className="mt-3 grid gap-2">
          {kinds.map((k) => {
            const A = ACTION[k];
            return (
              <Button key={k} onClick={() => doPunch(k)} variant={k === "depart" ? "outline" : "default"} className="justify-start">
                <A.icon /> {A.label}
              </Button>
            );
          })}
        </div>

        <div className="mt-4 border-t pt-3">
          <p className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Aujourd&apos;hui</span>
            <span>
              {formatMinutes(day.workedMinutes)} travaillées{day.breakMinutes > 0 && ` · ${day.breakMinutes} min de pause`}
            </span>
          </p>
          {day.punches.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun pointage pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {day.punches.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="w-11 font-mono text-slate-900">{timeOf(p.at)}</span>
                  <span className="flex-1 text-slate-600">{PUNCH_LABELS[p.kind]}</span>
                  <span className="text-[0.65rem] text-slate-400">{SOURCE_LABELS[p.source]}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/team/temps" className="mt-3 flex items-center gap-1 text-xs font-medium text-pink-700 hover:underline">
            Mes heures de la semaine <ArrowRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
