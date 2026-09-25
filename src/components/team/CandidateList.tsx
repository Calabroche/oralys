"use client";

import { useState } from "react";
import { Ban, ChevronDown, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Candidate } from "@/lib/team";
import { UserAvatar } from "@/components/team/shared";
import { fullName } from "@/lib/team";
import { cn } from "@/lib/utils";

export function CandidateList({
  candidates,
  mode,
  onAssign,
  assignLabel = "Affecter",
  currentId,
  emptyAction,
}: {
  candidates: Candidate[];
  mode: "regles" | "affinite";
  onAssign?: (c: Candidate) => void;
  assignLabel?: string;
  currentId?: string | null;
  /** Action proposée quand personne n'est admissible (ex. reprogrammer le RDV). */
  emptyAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const eligible = candidates.filter((c) => c.eligible);
  const excluded = candidates.filter((c) => !c.eligible);

  return (
    <div className="space-y-2">
      {eligible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
          Aucun assistant admissible sur ce créneau.
          {emptyAction}
        </div>
      )}
      {eligible.map((c, i) => {
        const expanded = open === c.user.id;
        return (
          <div key={c.user.id} className={cn("rounded-lg border transition-colors", i === 0 && "border-pink-300 bg-pink-50/40")}>
            <div className="flex items-center gap-3 p-3">
              <span className="w-4 text-center text-sm font-semibold text-slate-400">{i + 1}</span>
              <UserAvatar user={c.user} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-slate-900">{fullName(c.user)}</span>
                  {i === 0 && (
                    <Badge className="bg-pink-500">
                      <Sparkles /> Meilleur binôme
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn(c.tier === 0 && "border-emerald-200 text-emerald-700", c.tier === 1 && "border-sky-200 text-sky-700")}>
                    {c.tierLabel}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={c.score} className="h-1.5 w-32" />
                  <span className={cn("text-xs", mode === "affinite" ? "font-semibold text-slate-800" : "text-slate-500")}>
                    Affinité {c.score}/100
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(expanded ? null : c.user.id)} aria-expanded={expanded}>
                Pourquoi ? <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
              </Button>
              {onAssign &&
                (currentId === c.user.id ? (
                  <Badge variant="secondary">
                    <UserCheck /> Affecté(e)
                  </Badge>
                ) : (
                  <Button size="sm" variant={i === 0 ? "default" : "outline"} onClick={() => onAssign(c)}>
                    {assignLabel}
                  </Button>
                ))}
            </div>
            {expanded && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t px-4 py-3 text-xs sm:grid-cols-3">
                {c.parts.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-600">{p.label}</span>
                      <span className={cn("font-semibold", p.points < 0 ? "text-rose-600" : "text-slate-800")}>
                        {p.points > 0 ? "+" : ""}
                        {p.points}
                        <span className="font-normal text-slate-400">/{p.max}</span>
                      </span>
                    </div>
                    <div className="text-slate-400">{p.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {excluded.length > 0 && (
        <details className="group rounded-lg border border-dashed px-3 py-2 text-sm">
          <summary className="cursor-pointer text-slate-500">{excluded.length} personne(s) écartée(s) par les règles</summary>
          <ul className="mt-2 space-y-1.5">
            {excluded.map((c) => (
              <li key={c.user.id} className="flex items-start gap-2 text-slate-500">
                <Ban className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                <span>
                  <span className="font-medium text-slate-700">{fullName(c.user)}</span> : {c.blockers.join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
