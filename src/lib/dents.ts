// Numérotation FDI, dans l'ordre d'affichage du schéma dentaire (gauche → droite à l'écran).
export const ARCADE_SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCADE_INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const TOUTES_LES_DENTS = [...ARCADE_SUP, ...ARCADE_INF];

export type ToothKind = "molaire" | "premolaire" | "canine" | "incisive";

export function toothKind(n: number): ToothKind {
  const pos = n % 10;
  if (pos >= 6) return "molaire";
  if (pos >= 4) return "premolaire";
  if (pos === 3) return "canine";
  return "incisive";
}

// Sextants dans la convention habituelle des cabinets français (S1 à S6).
export const SEXTANTS: { id: string; label: string; dents: number[] }[] = [
  { id: "S1", label: "Sextant 1", dents: [18, 17, 16, 15, 14] },
  { id: "S2", label: "Sextant 2", dents: [13, 12, 11, 21, 22, 23] },
  { id: "S3", label: "Sextant 3", dents: [24, 25, 26, 27, 28] },
  { id: "S4", label: "Sextant 4", dents: [34, 35, 36, 37, 38] },
  { id: "S5", label: "Sextant 5", dents: [43, 42, 41, 31, 32, 33] },
  { id: "S6", label: "Sextant 6", dents: [48, 47, 46, 45, 44] },
];

// Quadrants (cadrans) : 1 = haut droit, 2 = haut gauche, 3 = bas gauche, 4 = bas droit.
export const QUADRANTS: { id: string; label: string; dents: number[] }[] = [
  { id: "Q1", label: "Quadrant 1 (haut droit)", dents: [18, 17, 16, 15, 14, 13, 12, 11] },
  { id: "Q2", label: "Quadrant 2 (haut gauche)", dents: [21, 22, 23, 24, 25, 26, 27, 28] },
  { id: "Q3", label: "Quadrant 3 (bas gauche)", dents: [31, 32, 33, 34, 35, 36, 37, 38] },
  { id: "Q4", label: "Quadrant 4 (bas droit)", dents: [48, 47, 46, 45, 44, 43, 42, 41] },
];

// Dents temporaires (enfants), 51 à 85, même ordre d'affichage que les définitives.
export const TEMP_SUP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const TEMP_INF = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

/** Zone ciblée par un RDV : des dents précises, et/ou la cavité buccale entière, et/ou un site non dentaire. */
export interface ZoneRdv {
  dents: number[];
  cavite?: boolean;
  /** Faces traitées par dent (M, O, D, V, L), ex. { 36: "MOD" } pour un composite. */
  faces?: Record<number, string>;
  /** Site anatomique hors dent : sinus lift, greffe de crête, frénectomie… */
  site?: { label: string; title: string };
}

export interface DentChip {
  /** Ce qui s'affiche sur la carte. */
  label: string;
  /** Ce qui s'affiche au survol. */
  title: string;
  kind: "dent" | "plage" | "sextant" | "quadrant" | "arcade" | "bouche" | "site";
}

// Index d'affichage : les temporaires sont dans un autre « schéma », pour ne jamais former de plage avec les définitives.
const chartIndex = (n: number) => {
  const i = TOUTES_LES_DENTS.indexOf(n);
  if (i >= 0) return i;
  const t = [...TEMP_SUP, ...TEMP_INF].indexOf(n);
  return t >= 0 ? 100 + t : 1000 + n;
};
const haut = (n: number) => [1, 2, 5, 6].includes(Math.floor(n / 10));
const sameArch = (a: number, b: number) => haut(a) === haut(b);

/**
 * Résume la zone d'un RDV en quelques pastilles lisibles sur une carte, ex. « Couronne · 36 », « Bridge · 14-16 ».
 * Bouche entière > arcade > quadrant ou sextants > plage de dents voisines (≥ 3) > dents isolées (avec faces) > site.
 * La bouche entière (détartrage, bilan…) donne une pastille « Bouche », que la carte peut masquer.
 * Les sextants ne parlent qu'en paro : ailleurs, 33-43 reste « 33-43 » (contention) et pas « S5 ».
 */
export function resumeDents(zone: ZoneRdv, opts: { sextants?: boolean } = {}): DentChip[] {
  const { sextants = true } = opts;
  const set = new Set(zone.dents);
  const chips: DentChip[] = [];
  const site = zone.site ? [{ label: zone.site.label, title: zone.site.title, kind: "site" as const }] : [];

  if (TOUTES_LES_DENTS.every((d) => set.has(d)) || (zone.cavite && set.size === 0)) {
    return [{ label: "Bouche", title: "Cavité buccale, sans localisation", kind: "bouche" }, ...site];
  }

  for (const [arcade, label, title] of [
    [ARCADE_SUP, "Max.", "Arcade maxillaire (haut)"],
    [ARCADE_INF, "Mand.", "Arcade mandibulaire (bas)"],
  ] as const) {
    if (arcade.every((d) => set.has(d))) {
      chips.push({ label, title, kind: "arcade" });
      arcade.forEach((d) => set.delete(d));
    }
  }

  // Quadrant ou sextants : on garde le découpage le plus court, les sextants en cas d'égalité (la paro se facture par sextant).
  const parSextants = groupes(set, zone, false, sextants);
  const parQuadrants = groupes(set, zone, true, sextants);
  chips.push(...(parQuadrants.length < parSextants.length ? parQuadrants : parSextants));

  if (zone.cavite) chips.push({ label: "Bouche", title: "Cavité buccale", kind: "bouche" });
  return [...chips, ...site];
}

export function listeDents(zone: ZoneRdv): string {
  const parts = [...zone.dents]
    .sort((a, b) => chartIndex(a) - chartIndex(b))
    .map((d) => (zone.faces?.[d] ? `${d} ${zone.faces[d]}` : String(d)));
  if (zone.cavite) parts.push("cavité buccale");
  if (zone.site) parts.push(zone.site.title.toLowerCase());
  return parts.join(", ");
}

/** Quadrants (si demandé), puis sextants (en paro), plages et dents isolées sur les dents restantes. */
function groupes(dents: Set<number>, zone: ZoneRdv, quadrantsDabord: boolean, avecSextants: boolean): DentChip[] {
  const set = new Set(dents);
  const chips: DentChip[] = [];
  if (quadrantsDabord) {
    for (const q of QUADRANTS) {
      if (q.dents.every((d) => set.has(d))) {
        chips.push({ label: q.id, title: `${q.label} · ${q.dents[0]}-${q.dents[q.dents.length - 1]}`, kind: "quadrant" });
        q.dents.forEach((d) => set.delete(d));
      }
    }
  }
  for (const s of avecSextants ? SEXTANTS : []) {
    if (s.dents.every((d) => set.has(d))) {
      chips.push({ label: s.id, title: `${s.label} · ${s.dents.join(", ")}`, kind: "sextant" });
      s.dents.forEach((d) => set.delete(d));
    }
  }

  const rest = [...set].sort((a, b) => chartIndex(a) - chartIndex(b));
  let i = 0;
  while (i < rest.length) {
    let j = i;
    while (
      j + 1 < rest.length &&
      chartIndex(rest[j + 1]) === chartIndex(rest[j]) + 1 &&
      sameArch(rest[j], rest[j + 1])
    ) {
      j++;
    }
    const run = rest.slice(i, j + 1);
    if (run.length >= 3) {
      // Les deux bouts de la plage, le plus petit d'abord (bridge 14-16, contention 33-43).
      const [de, a] = [run[0], run[run.length - 1]].sort((x, y) => x - y);
      chips.push({ label: `${de}-${a}`, title: `Dents ${run.join(", ")}`, kind: "plage" });
    } else {
      run.forEach((d) => {
        const f = zone.faces?.[d];
        chips.push({ label: f ? `${d} ${f}` : String(d), title: f ? `Dent ${d}, faces ${f}` : `Dent ${d}`, kind: "dent" });
      });
    }
    i = j + 1;
  }

  return chips;
}
