import { FULFILLMENT_METHOD, ORDER_STATUS } from '../common/constants';
import type { FulfillmentMethod, OrderStatus } from '../common/constants';

/** Libelles des messages d'erreur, ceux que le backoffice affiche. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.EN_ATTENTE_PAIEMENT]: 'En attente de paiement',
  [ORDER_STATUS.PAYEE]: 'Payee',
  [ORDER_STATUS.EN_PREPARATION]: 'En preparation',
  [ORDER_STATUS.EXPEDIEE]: 'Expediee',
  [ORDER_STATUS.LIVREE]: 'Livree',
  [ORDER_STATUS.PRETE_A_RETIRER]: 'Prete a retirer',
  [ORDER_STATUS.RETIREE]: 'Retiree',
  [ORDER_STATUS.ANNULEE]: 'Annulee',
};

/**
 * Passages autorises entre statuts de commande :
 *
 *   EN_ATTENTE_PAIEMENT -> PAYEE -> EN_PREPARATION -> EXPEDIEE -> LIVREE
 *                                                  \-> PRETE_A_RETIRER -> RETIREE
 *
 * L'annulation reste possible tant que la marchandise n'est pas sortie : avant
 * l'expedition en livraison, avant le retrait en boutique (un client qui ne
 * vient jamais chercher sa commande). LIVREE, RETIREE et ANNULEE sont finaux.
 *
 * Doit rester aligne sur `frontend/lib/order-status.ts`.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.EN_ATTENTE_PAIEMENT]: [
    ORDER_STATUS.PAYEE,
    ORDER_STATUS.ANNULEE,
  ],
  [ORDER_STATUS.PAYEE]: [ORDER_STATUS.EN_PREPARATION, ORDER_STATUS.ANNULEE],
  [ORDER_STATUS.EN_PREPARATION]: [
    ORDER_STATUS.EXPEDIEE,
    ORDER_STATUS.PRETE_A_RETIRER,
    ORDER_STATUS.ANNULEE,
  ],
  [ORDER_STATUS.EXPEDIEE]: [ORDER_STATUS.LIVREE],
  [ORDER_STATUS.PRETE_A_RETIRER]: [ORDER_STATUS.RETIREE, ORDER_STATUS.ANNULEE],
  [ORDER_STATUS.LIVREE]: [],
  [ORDER_STATUS.RETIREE]: [],
  [ORDER_STATUS.ANNULEE]: [],
};

/** Statuts qui n'ont de sens que pour un seul mode de reception. */
const DELIVERY_ONLY: readonly OrderStatus[] = [
  ORDER_STATUS.EXPEDIEE,
  ORDER_STATUS.LIVREE,
];
const PICKUP_ONLY: readonly OrderStatus[] = [
  ORDER_STATUS.PRETE_A_RETIRER,
  ORDER_STATUS.RETIREE,
];

/** Les statuts vers lesquels une commande peut passer depuis `from`. */
export function nextStatuses(
  from: OrderStatus,
  fulfillment: FulfillmentMethod,
): OrderStatus[] {
  const excluded =
    fulfillment === FULFILLMENT_METHOD.LIVRAISON ? PICKUP_ONLY : DELIVERY_ONLY;

  return TRANSITIONS[from].filter((status) => !excluded.includes(status));
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: FulfillmentMethod,
): boolean {
  return nextStatuses(from, fulfillment).includes(to);
}
