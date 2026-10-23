/**
 * Calendrier des jours ouvres de Madagascar. Meme calcul que
 * `frontend/lib/checkout.ts`, qui l'annonce au client dans le panier : ici
 * c'est la date prevue enregistree sur la commande, celle qui fait foi.
 */

/** Jours feries fixes de Madagascar, au format MM-JJ. */
const FIXED_HOLIDAYS = [
  '01-01', // Jour de l'an
  '03-08', // Journee de la femme
  '03-29', // Commemoration 1947
  '05-01', // Fete du travail
  '06-26', // Fete de l'independance
  '08-15', // Assomption
  '11-01', // Toussaint
  '12-25', // Noel
];

/** Dimanche de Paques (algorithme de Meeus, calendrier gregorien). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (date: Date) =>
  `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function isHoliday(date: Date): boolean {
  if (FIXED_HOLIDAYS.includes(dayKey(date))) return true;

  // Lundi de Paques, Ascension (+39 j), lundi de Pentecote (+50 j)
  const easter = easterSunday(date.getFullYear());
  return [1, 39, 50].some((offset) => {
    const movable = new Date(easter);
    movable.setDate(easter.getDate() + offset);
    return dayKey(movable) === dayKey(date);
  });
}

/** Ouvre : du lundi au vendredi, hors feries. */
export function isBusinessDay(date: Date): boolean {
  const weekday = date.getDay();
  return weekday !== 0 && weekday !== 6 && !isHoliday(date);
}

/** `from` + `days` jours ouvres (le jour de depart ne compte pas). */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) remaining -= 1;
  }

  return result;
}
