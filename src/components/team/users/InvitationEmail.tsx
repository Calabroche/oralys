import { Mail } from "lucide-react";
import { OralysLogo } from "@/components/team/OralysLogo";
import { TEAM_CABINET_NAME } from "@/data/teamMockData";
import { TeamUser } from "@/types/team";

/** Aperçu de l'email d'invitation reçu par le nouvel utilisateur. */
export function InvitationEmail({ user }: { user: TeamUser }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-slate-50">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2 text-xs text-slate-500">
        <Mail className="size-3.5" />
        À : <span className="font-medium text-slate-700">{user.email}</span>
        <span className="ml-auto">no-reply@oralys.fr</span>
      </div>
      <div className="space-y-3 p-5 text-sm text-slate-700">
        <OralysLogo className="text-lg" />
        <p className="font-medium text-slate-900">Bonjour {user.firstName},</p>
        <p>
          {TEAM_CABINET_NAME} vous a créé un accès à Oralys. Pour activer votre compte, définissez votre mot de passe
          personnel. Le lien est valable 72 heures.
        </p>
        <span className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Définir mon mot de passe</span>
        <p className="text-xs text-slate-500">
          Votre identifiant : {user.email}. Si vous n&apos;êtes pas à l&apos;origine de cette demande, ignorez cet email.
        </p>
      </div>
    </div>
  );
}
