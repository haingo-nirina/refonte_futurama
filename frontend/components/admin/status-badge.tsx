import {
  MODERATION_STATUSES,
  ORDER_STATUSES,
  type ModerationStatus,
  type OrderStatus,
} from "@/lib/types";

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

const MODERATION_TONE: Record<ModerationStatus, string> = {
  pending: "bg-tint-warm text-tint-warm-ink",
  approved: "bg-success-soft text-success",
  rejected: "bg-line text-muted",
};

const BASE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap";

export function OrderStatusBadge({ status }: { status: string }) {
  const label =
    ORDER_STATUSES.find((entry) => entry.value === status)?.label ?? status;

  return (
    <span className={`${BASE} ${ORDER_TONE[status as OrderStatus] ?? "bg-line text-muted"}`}>
      {label}
    </span>
  );
}

export function ModerationStatusBadge({ status }: { status: string }) {
  const label =
    MODERATION_STATUSES.find((entry) => entry.value === status)?.label ??
    status;

  return (
    <span
      className={`${BASE} ${MODERATION_TONE[status as ModerationStatus] ?? "bg-line text-muted"}`}
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
