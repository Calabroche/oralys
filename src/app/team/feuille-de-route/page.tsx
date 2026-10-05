"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/team/shared";
import { VERSIONS, useSwitchVersion, useVersion } from "@/components/team/Version";
import { cn } from "@/lib/utils";

/**
 * Feuille de route du module : une version = un problème du cabinet réglé.
 * Chaque carte permet de basculer la démo dans la version pour la montrer en direct.
 */
export default function FeuilleDeRoutePage() {
  const router = useRouter();
  const { version } = useVersion();
  const switchVersion = useSwitchVersion();
  const current = VERSIONS.findIndex((v) => v.id === version);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-8 py-8">
      <PageHeader
        title="Feuille de route Oralys Team"
        description="Le module arrive par étapes. Chaque version règle un problème complet du cabinet et s'appuie sur la précédente."
      />

      {/* Frise : où en est la démo affichée. */}
      <ol className="grid grid-cols-4 gap-2">
        {VERSIONS.map((v, i) => (
          <li key={v.id}>
            <button onClick={() => switchVersion(v.id)} className="group w-full text-left">
              <div className={cn("h-1.5 rounded-full", i <= current ? "bg-pink-400" : "bg-slate-200 group-hover:bg-slate-300")} />
              <p className={cn("mt-2 text-xs font-semibold tracking-wide", i <= current ? "text-pink-700" : "text-slate-400")}>{v.label}</p>
              <p className={cn("text-sm", i === current ? "font-medium text-slate-900" : "text-slate-500")}>{v.title}</p>
            </button>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        {VERSIONS.map((v, i) => {
          const isCurrent = v.id === version;
          return (
            <Card key={v.id} className={cn(isCurrent && "ring-2 ring-pink-300")}>
              <CardContent className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
                <div>
                  <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", isCurrent ? "bg-pink-500 text-white" : "bg-slate-900 text-white")}>
                    {v.label}
                  </span>
                  <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-900">{v.title}</h2>
                  {isCurrent && <p className="mt-1 text-xs font-medium text-pink-700">Version affichée dans la démo</p>}
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Le problème réglé : </span>
                    {v.problem}
                  </p>
                  <div>
                    <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
                      {i === 0 ? "Ce qu'on peut faire" : `Ce qu'on peut faire en plus du ${VERSIONS[i - 1].label}`}
                    </p>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {v.canDo.map((c) => (
                        <li key={c} className="flex gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    {v.screens.length > 0 ? (
                      <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                        <PenTool className="size-3.5" /> Maquettes Figma :
                        {v.screens.map((n) => (
                          <span key={n} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.7rem] text-slate-600">
                            {String(n).padStart(2, "0")}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                        <PenTool className="size-3.5" /> Pas encore de maquettes Figma pour cette version
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => {
                        switchVersion(v.id);
                        router.push(v.tryHref);
                      }}
                    >
                      {isCurrent ? "Reprendre la démo" : `Voir la démo en ${v.label}`} <ArrowRight />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
