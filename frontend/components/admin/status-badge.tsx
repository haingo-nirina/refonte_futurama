import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/**
 * Les statuts sont des chaines libres cote base : on retombe sur la valeur
 * brute plutot que d'afficher un vide si une nouvelle valeur apparait.
 */
const ORDER_TONE: Record<OrderStatus, string> = {
  pending: "bg-tint-warm text-tint-warm-ink",
  confirmed: "bg-tint-cool text-tint-cool-ink",
  shipped: "bg-tint-cool text-tint-cool-accent",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-line text-muted",
};

const BASE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap";

export function OrderStatusBadge({ status }: { status: string }) {
  const label =
    ORDER_STATUSES.find((entry) => entry.value === status)?.label ?? status;

  return (
    <span
      className={`${BASE} ${ORDER_TONE[status as OrderStatus] ?? "bg-line text-muted"}`}
    >
      {label}
    </span>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`${BASE} ${isActive ? "bg-success-soft text-success" : "bg-line text-muted"}`}
    >
      {isActive ? "En ligne" : "Hors ligne"}
    </span>
  );
}

/**
 * Etat d'une promotion, deduit des dates et non d'une colonne : le backend
 * n'en stocke pas, et une promotion « active » le devient toute seule le jour
 * de son ouverture. Un rendu serveur suffit — la page est relue a chaque
 * navigation, la seconde pres n'a aucun interet ici.
 *
 * `isActive` prime : une promotion desactivee ne s'applique pas, meme au beau
 * milieu de sa plage.
 */
export type PromotionState = "disabled" | "upcoming" | "running" | "ended";

export function promotionState(promotion: {
  isActive: boolean;
  startDate: string;
  endDate: string;
}): PromotionState {
  if (!promotion.isActive) return "disabled";

  const now = Date.now();
  if (new Date(promotion.startDate).getTime() > now) return "upcoming";
  if (new Date(promotion.endDate).getTime() < now) return "ended";

  return "running";
}

const PROMOTION_TONE: Record<PromotionState, string> = {
  running: "bg-success-soft text-success",
  upcoming: "bg-tint-cool text-tint-cool-ink",
  ended: "bg-line text-muted",
  disabled: "bg-line text-muted",
};

const PROMOTION_LABEL: Record<PromotionState, string> = {
  running: "Active",
  upcoming: "A venir",
  ended: "Terminee",
  disabled: "Desactivee",
};

export function PromotionStatusBadge({ state }: { state: PromotionState }) {
  return (
    <span className={`${BASE} ${PROMOTION_TONE[state]}`}>
      {PROMOTION_LABEL[state]}
    </span>
  );
}

/** La promotion entre dans la section « Promotion du mois » de l'accueil. */
export function FeaturedBadge() {
  return (
    <span className={`${BASE} bg-tint-warm text-tint-warm-ink`}>
      Mise en avant
    </span>
  );
}
