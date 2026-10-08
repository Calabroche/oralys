const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 09/06/2026 */
export function formatDateCourte(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** { jour: "Mardi", num: 9, reste: "juin 2026" } */
export function formatDateLongue(iso: string) {
  const date = parse(iso);
  return { jour: JOURS[date.getDay()], num: date.getDate(), reste: `${MOIS[date.getMonth()]} ${date.getFullYear()}` };
}

export function formatEuros(n: number) {
  return `${n.toFixed(2).replace(".", ",")}€`;
}
