import type { FulfillmentMethod, OrderStatus } from "./types";

/**
 * Passages autorises entre statuts, copie de
 * `backend/src/orders/order-status-rules.ts` : le backend fait foi et refuse
 * en 400 tout le reste. Ici on ne s'en sert que pour ne proposer a l'admin
 * que les statuts qu'il peut reellement choisir.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  EN_ATTENTE_PAIEMENT: ["PAYEE", "ANNULEE"],
  PAYEE: ["EN_PREPARATION", "ANNULEE"],
  EN_PREPARATION: ["EXPEDIEE", "PRETE_A_RETIRER", "ANNULEE"],
  EXPEDIEE: ["LIVREE"],
  PRETE_A_RETIRER: ["RETIREE", "ANNULEE"],
  LIVREE: [],
  RETIREE: [],
  ANNULEE: [],
};

const DELIVERY_ONLY: readonly OrderStatus[] = ["EXPEDIEE", "LIVREE"];
const PICKUP_ONLY: readonly OrderStatus[] = ["PRETE_A_RETIRER", "RETIREE"];

export function nextStatuses(
  from: OrderStatus,
  fulfillment: FulfillmentMethod,
): OrderStatus[] {
  const excluded = fulfillment === "LIVRAISON" ? PICKUP_ONLY : DELIVERY_ONLY;

  return TRANSITIONS[from].filter((status) => !excluded.includes(status));
}
