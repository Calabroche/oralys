"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/context/TeamDataContext";
import { AuditList, AUDIT_ACTION_META } from "@/components/team/AuditList";
import { PageHeader, PillFilter } from "@/components/team/shared";
import { fullName } from "@/lib/team";
import { VersionGate } from "@/components/team/Version";
import { AuditAction } from "@/types/team";

type Period = "7" | "30" | "365" | "all";

export default function JournalPage() {
  return (
    <VersionGate feature="journal">
      <Suspense>
        <Journal />
      </Suspense>
    </VersionGate>
  );
}

function Journal() {
  const params = useSearchParams();
  const { audit, users, can, now } = useTeam();
  const [userId, setUserId] = useState(params.get("user") ?? "all");
  const [action, setAction] = useState<"all" | AuditAction>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  if (!can("team.audit")) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <Lock className="size-6 text-slate-400" />
          <p className="font-medium">Accès restreint</p>
          <p className="max-w-sm text-sm text-slate-500">Le journal d&apos;audit nécessite le droit « Consulter le journal d&apos;audit ».</p>
        </CardContent>
      </Card>
    );
  }

  const since = period === "all" ? null : new Date(now().getTime() - Number(period) * 86400000);
  const entries = audit
    .filter((e) => userId === "all" || e.actorId === userId || e.targetUserId === userId)
    .filter((e) => action === "all" || e.action === action)
    .filter((e) => !since || new Date(e.at) >= since)
    .filter((e) => !sensitiveOnly || AUDIT_ACTION_META[e.action].sensitive)
    .sort((a, b) => b.at.localeCompare(a.at));

  const current = users.filter((u) => u.status !== "archive");
  const archived = users.filter((u) => u.status === "archive");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        description="Qui a fait quoi, quand, et avec quel rôle au moment de l'action. Conservé même après archivage."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            <SelectGroup>
              <SelectLabel>Actifs</SelectLabel>
              {current.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {fullName(u)}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Archivés</SelectLabel>
              {archived.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {fullName(u)} (archivé)
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types d&apos;action</SelectItem>
            {(Object.keys(AUDIT_ACTION_META) as AuditAction[]).map((a) => (
              <SelectItem key={a} value={a}>
                {AUDIT_ACTION_META[a].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PillFilter
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: "7 jours" },
            { value: "30", label: "30 jours" },
            { value: "365", label: "12 mois" },
            { value: "all", label: "Tout" },
          ]}
        />
        <Label className="ml-auto flex items-center gap-2 font-normal text-slate-600">
          <Switch checked={sensitiveOnly} onCheckedChange={setSensitiveOnly} /> Actions sensibles uniquement
        </Label>
      </div>
      <div className="rounded-xl border px-4">
        <AuditList entries={entries} />
      </div>
      <p className="text-xs text-slate-400">{entries.length} entrée(s). Le journal est en ajout seul : aucune entrée ne peut être modifiée ni supprimée.</p>
    </div>
  );
}
