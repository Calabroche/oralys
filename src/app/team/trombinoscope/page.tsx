"use client";

import { PageHeader } from "@/components/team/shared";
import { Trombinoscope } from "@/components/team/Trombinoscope";
import { useTeam } from "@/context/TeamDataContext";
import { isHealthProfessional } from "@/lib/team";
import { ASSIDUITE_NB } from "@/lib/assiduite";

/** Trombinoscope du cabinet : tout le monde le voit ; un clic sur une personne ouvre son récapitulatif. */
export default function TrombinoscopePage() {
  const { can, sessionUser, roles } = useTeam();
  const sensitive = can("param.cabinet") || (!!sessionUser && isHealthProfessional(sessionUser, roles)) || can("compta");
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
      <PageHeader
        title="Trombinoscope"
        description="Toutes les personnes du cabinet, avec qui elles travaillent et qui est là aujourd'hui. Cliquez sur une personne pour voir son récapitulatif."
      />
      <Trombinoscope />
      {sensitive && (
        <p className="text-[11px] text-slate-400">
          Pastille : rouge = mission en retard, orange = à faire aujourd&apos;hui, vert = missions à jour. NB : {ASSIDUITE_NB}
        </p>
      )}
    </div>
  );
}
