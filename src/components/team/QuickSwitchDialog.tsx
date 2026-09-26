"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, MonitorSmartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTeam } from "@/context/TeamDataContext";
import { UserAvatar } from "@/components/team/shared";
import { fullName, homePathFor, roleNames } from "@/lib/team";
import { TeamUser } from "@/types/team";
import { cn } from "@/lib/utils";

export const WORKSTATIONS = ["Poste accueil", "Poste stérilisation", "Poste salle 1", "Poste bloc"];

/**
 * Bascule rapide entre utilisateurs sur un poste partagé ("réalité Oralpes") :
 * on choisit sa tête puis un PIN court, sans ressaisir identifiant + mot de passe.
 */
export function QuickSwitchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { users, roles, sessionUserId, workstation, switchSession } = useTeam();
  const router = useRouter();
  const [selected, setSelected] = useState<TeamUser | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [station, setStation] = useState<string>(workstation ?? "none");

  const active = users.filter((u) => u.status === "actif");

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setSelected(null);
      setPin("");
      setError(false);
    }
  }

  function submit(value: string) {
    if (!selected) return;
    if (value !== selected.pin) {
      setError(true);
      setPin("");
      return;
    }
    switchSession(selected.id, station === "none" ? null : station);
    toast.success(`Session basculée sur ${fullName(selected)}`, {
      description: station === "none" ? undefined : `Poste partagé : ${station}`,
    });
    close(false);
    router.push(homePathFor(selected));
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selected ? `Bonjour ${selected.firstName}` : "Changer d'utilisateur"}</DialogTitle>
          <DialogDescription>
            {selected ? "Saisissez votre code à 4 chiffres." : "Poste partagé : chacun reprend la main en quelques secondes, avec sa propre traçabilité."}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {active.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors hover:border-pink-300 hover:bg-pink-50",
                    u.id === sessionUserId && "border-pink-300 bg-pink-50/60"
                  )}
                >
                  <UserAvatar user={u} className="size-10" />
                  <span className="text-xs leading-tight font-medium">{fullName(u)}</span>
                  <span className="text-[0.65rem] leading-tight text-slate-500">{roleNames(u, roles).join(" · ")}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-slate-500">
                <MonitorSmartphone className="size-3.5" /> Poste de travail
              </Label>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Poste personnel</SelectItem>
                  {WORKSTATIONS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w} (partagé)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <UserAvatar user={selected} className="size-14 text-base" />
            <InputOTP
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(v) => {
                setError(false);
                setPin(v);
                if (v.length === 4) submit(v);
              }}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3].map((i) => (
                  <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className={cn("text-xs", error ? "text-destructive" : "text-slate-400")}>
              {error ? "Code incorrect, réessayez." : "Démo : le code est 1234 pour tout le monde."}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft /> Choisir une autre personne
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
