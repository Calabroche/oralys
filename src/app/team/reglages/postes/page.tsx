"use client";

import { usePersistentState } from "@/lib/persist";
import { FlaskConical, MonitorSmartphone, Stethoscope, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gate, PageHeader } from "@/components/team/shared";
import { WORKSTATIONS } from "@/components/team/QuickSwitchDialog";

const ICONS = [Users, FlaskConical, Stethoscope, Stethoscope];

interface StationConfig {
  pin: boolean;
  explicitOperator: boolean;
  lockAfter: string;
}

export default function PostesPage() {
  const [config, setConfig] = usePersistentState<Record<string, StationConfig>>("postes", () =>
    Object.fromEntries(
      WORKSTATIONS.map((w) => [w, { pin: true, explicitOperator: w === "Poste stérilisation", lockAfter: w === "Poste accueil" ? "5" : "10" }])
    )
  );
  const update = (w: string, patch: Partial<StationConfig>) => setConfig((c) => ({ ...c, [w]: { ...c[w], ...patch } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postes partagés"
        description="Plusieurs personnes utilisent le même ordinateur dans la journée : bascule rapide par PIN plutôt qu'un login complet, et traçabilité de la personne réelle."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {WORKSTATIONS.map((w, i) => {
          const Icon = ICONS[i] ?? MonitorSmartphone;
          const c = config[w];
          return (
            <Card key={w}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-pink-600" /> {w}
                </CardTitle>
                <CardDescription>
                  {w === "Poste stérilisation" ? "Session générique partagée par l'équipe d'assistantes." : "Ordinateur partagé du cabinet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Gate perm="param.cabinet">
                  <div className="space-y-3">
                    <Label className="flex items-center justify-between font-normal">
                      Bascule rapide par PIN à 4 chiffres
                      <Switch checked={c.pin} onCheckedChange={(v) => update(w, { pin: v })} />
                    </Label>
                    <Label className="flex items-center justify-between gap-4 font-normal">
                      <span>
                        Exiger un opérateur explicite
                        <span className="block text-xs text-slate-500">Pour les actions tracées (cycle de stérilisation…), ne jamais supposer que la session connectée est la bonne.</span>
                      </span>
                      <Switch checked={c.explicitOperator} onCheckedChange={(v) => update(w, { explicitOperator: v })} />
                    </Label>
                    <Label className="flex items-center justify-between font-normal">
                      Verrouillage automatique
                      <Select value={c.lockAfter} onValueChange={(v) => update(w, { lockAfter: v })}>
                        <SelectTrigger size="sm" className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["2", "5", "10", "30"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>
                </Gate>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
