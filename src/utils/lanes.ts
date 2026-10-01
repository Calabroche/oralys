/**
 * Répartit les créneaux d'une même journée en colonnes de salle, pour qu'un praticien qui tient
 * deux salles en parallèle (ex. anesthésie en Bloc 1 pendant un contrôle en Salle 2) les voie
 * côte à côte plutôt que superposés. Une journée à une seule salle utilisée garde la pleine
 * largeur, comme avant le multi-salles.
 */
export function roomsUsedOnDay<T extends { room?: string }>(items: T[], orderedRooms: string[]): string[] {
  const used = new Set(items.map((i) => i.room).filter((r): r is string => Boolean(r)));
  if (used.size === 0) return [];
  const ordered = orderedRooms.filter((r) => used.has(r));
  const extra = [...used].filter((r) => !ordered.includes(r));
  return [...ordered, ...extra];
}

/** Colonne (0-indexée) et nombre total de colonnes pour un créneau, selon les salles réellement utilisées ce jour-là. */
export function laneOf(room: string | undefined, lanes: string[]): { col: number; count: number } {
  if (lanes.length <= 1) return { col: 0, count: 1 };
  const col = room ? Math.max(0, lanes.indexOf(room)) : 0;
  return { col, count: lanes.length };
}
