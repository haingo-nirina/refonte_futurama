import { toAmount } from "./format";
import type { DeliveryZone, Store } from "./types";

/**
 * Calculs d'AFFICHAGE du recapitulatif. Le backend refait tout a la commande
 * (prix, frais, date prevue) et c'est lui qui fait foi : ces fonctions ne
 * servent qu'a annoncer au client ce qu'il va payer.
 */

/** Gratuit des que le seuil de la zone est atteint, prix fixe sinon. */
export function shippingFeeFor(zone: DeliveryZone, subtotal: number): number {
  if (zone.freeThreshold !== null && subtotal >= toAmount(zone.freeThreshold)) {
    return 0;
  }

  return toAmount(zone.price);
}

// ------------------------------------------------------------- Jours ouvres

/** Jours feries fixes de Madagascar, au format MM-JJ. */
const FIXED_HOLIDAYS = [
  "01-01", // Jour de l'an
  "03-08", // Journee de la femme
  "03-29", // Commemoration 1947
  "05-01", // Fete du travail
  "06-26", // Fete de l'independance
  "08-15", // Assomption
  "11-01", // Toussaint
  "12-25", // Noel
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

const pad = (n: number) => String(n).padStart(2, "0");
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

/** « jeudi 15/10/2026 » */
export function formatDeliveryDate(date: Date): string {
  const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const day = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}`;
}

// ------------------------------------------------------------ Numero MVola

/** Meme regle que `backend/src/common/mvola-phone.ts`. */
const MVOLA_PHONE_PATTERN = /^03[48]\d{7}$/;

/** « +261 34 00 000 01 » → « 0340000001 » */
export function normalizeMgPhone(value: string): string {
  return value.replace(/[\s.\-()]/g, "").replace(/^\+?261/, "0");
}

export function isValidMvolaPhone(value: string): boolean {
  return MVOLA_PHONE_PATTERN.test(normalizeMgPhone(value));
}

/** « 0340000001 » → « 034 00 000 01 » ; une saisie invalide reste telle quelle. */
export function formatMgPhone(value: string): string {
  const digits = normalizeMgPhone(value);
  if (!/^0\d{9}$/.test(digits)) return value;

  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

// ------------------------------------------------------------------- Carte

/**
 * Carte Google Maps sans cle d'API : l'URL `output=embed` est publique.
 *
 * On cherche toujours par nom + adresse, jamais par coordonnees seules : des
 * chiffres affichent un repere anonyme, et l'itineraire les « accroche » au
 * commerce le plus proche connu de Google (un voisin, pas la boutique). Le nom
 * ouvre la fiche Google de la boutique elle-meme.
 */
export function storeMapQuery(store: Store): string {
  return `${store.name}, ${store.address}`;
}

/** Les coordonnees, quand il y en a, ne servent qu'a centrer la carte. */
export function storeMapEmbedUrl(store: Store): string {
  const center =
    store.latitude && store.longitude
      ? `&ll=${store.latitude},${store.longitude}`
      : "";

  return `https://maps.google.com/maps?q=${encodeURIComponent(storeMapQuery(store))}${center}&z=16&output=embed`;
}

export function storeDirectionsUrl(store: Store): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(storeMapQuery(store))}`;
}

// --------------------------------------------------------------- Retrait

/** Badge d'une boutique au panier : « En stock » ou « Prêt sous N jours ». */
export function pickupAvailability(store: Store): string {
  const days = store.pickupDelayDays;
  if (days <= 0) return "En stock";

  return `Prêt sous ${days} jour${days > 1 ? "s" : ""}`;
}
