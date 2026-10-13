import type { Rdv } from "@/data/dossierPatient";
import { resumeDents, type ZoneRdv } from "@/lib/dents";

export interface GroupeGeste {
  label: string;
  zone: ZoneRdv;
}

const cleZone = (z: ZoneRdv) => `${[...z.dents].sort((a, b) => a - b).join(",")}|${z.cavite ? "c" : ""}|${z.site?.label ?? ""}`;

export const fusionZones = (a: ZoneRdv, b: ZoneRdv): ZoneRdv => ({
  dents: [...new Set([...a.dents, ...b.dents])],
  cavite: a.cavite || b.cavite || undefined,
  faces: a.faces || b.faces ? { ...a.faces, ...b.faces } : undefined,
  site: a.site ?? b.site,
});

/**
 * Les actes d'un RDV, regroupés pour tenir sur une ligne de carte :
 * même acte sur plusieurs dents → « Composite · 36 MOD, 37 O » ;
 * plusieurs actes sur la même dent → « Extraction + Implant · 47 » ;
 * actes sur des dents différentes → un groupe chacun (« Extraction · 12 », « Implant · 46 »).
 */
export function groupesGestes(rdv: Rdv): GroupeGeste[] {
  const gestes = rdv.gestes?.length ? rdv.gestes : [{ label: rdv.motif, zone: rdv.zone }];

  const parActe: GroupeGeste[] = [];
  for (const g of gestes) {
    const meme = parActe.find((x) => x.label === g.label);
    if (meme) meme.zone = fusionZones(meme.zone, g.zone);
    else parActe.push({ label: g.label, zone: g.zone });
  }

  const parZone: GroupeGeste[] = [];
  for (const g of parActe) {
    const meme = parZone.find((x) => cleZone(x.zone) === cleZone(g.zone));
    if (meme) meme.label = [meme.label, g.label].filter(Boolean).join(" + ");
    else parZone.push({ ...g });
  }
  return parZone;
}

/** Texte court d'un groupe, pour le résumé IA ou une infobulle : « Extraction + Implant · 47 ». */
export function texteGroupe(g: GroupeGeste, sextants: boolean) {
  const zone = resumeDents(g.zone, { sextants })
    .filter((c) => c.kind !== "bouche")
    .map((c) => c.label)
    .join(", ");
  return [g.label, zone].filter(Boolean).join(" · ");
}

/** La note qui résume le RDV sur sa carte : l'observation épinglée, sinon la dernière saisie. */
export function noteDuRdv(rdv: Rdv): string | undefined {
  const obs = rdv.observations ?? [];
  return (rdv.observationEpinglee !== undefined ? obs[rdv.observationEpinglee] : undefined) ?? obs.at(-1);
}
