/**
 * Les montants arrivent en chaine (Decimal Prisma). On les parse ici, une fois,
 * plutot que de disperser des `Number(...)` dans les composants.
 */
export function toAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

const ARIARY = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** `450000` -> `450 000 Ar` */
export function formatPrice(value: string | number | null | undefined): string {
  return `${ARIARY.format(toAmount(value))} Ar`;
}

/** Prix effectivement paye : la promo prime sur le prix catalogue. */
export function effectivePrice(product: {
  price: string;
  promoPrice: string | null;
}): number {
  return toAmount(product.promoPrice ?? product.price);
}

/** `-20 %`, ou `null` s'il n'y a pas de promo. */
export function discountLabel(product: {
  price: string;
  promoPrice: string | null;
}): string | null {
  const price = toAmount(product.price);
  const promo = toAmount(product.promoPrice);

  if (!product.promoPrice || promo >= price || price === 0) return null;

  return `-${Math.round((1 - promo / price) * 100)} %`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** `12 mars 2026, 14:05` — le backoffice a besoin de l'heure, pas la boutique. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** Paliers successifs : chaque valeur est le nombre d'unites avant la suivante. */
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
];

/**
 * `il y a 4 jours` — la maquette date les avis en relatif. A n'utiliser que
 * dans un composant serveur : le rendu depend de l'heure courante, et un
 * composant client rejouerait un texte different de celui du HTML serveur.
 */
export function formatRelativeDate(iso: string): string {
  let value = (new Date(iso).getTime() - Date.now()) / 1000;

  for (const [unit, step] of RELATIVE_STEPS) {
    if (Math.abs(value) < step) return RELATIVE.format(Math.round(value), unit);
    value /= step;
  }

  return RELATIVE.format(Math.round(value), "year");
}

/** `2026-03-12` : format attendu par un `<input type="date">`. */
export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
