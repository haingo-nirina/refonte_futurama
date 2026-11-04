import { Prisma } from '@prisma/client';
import { addBusinessDays } from '../common/business-days';
import { FULFILLMENT_METHOD, PAYMENT_STATUS } from '../common/constants';

/**
 * Ce que le passage a PAYEE ecrit sur la commande. Un paiement deja confirme
 * garde sa date. La date prevue part de `paidAt` : delai de la zone (copie sur
 * la commande) en livraison, delai de preparation de la boutique en retrait.
 *
 * Deux appelants : la validation manuelle de l'admin (`OrdersService`) et la
 * confirmation MVola (`PaymentsService`) — un seul chemin vers PAYEE.
 */
export function paymentData(order: {
  paidAt: Date | null;
  fulfillmentMethod: string;
  deliveryDelayDays: number | null;
  store: { pickupDelayDays: number } | null;
}): Prisma.OrderUpdateManyMutationInput {
  const paidAt = order.paidAt ?? new Date();
  const delay =
    order.fulfillmentMethod === FULFILLMENT_METHOD.LIVRAISON
      ? order.deliveryDelayDays
      : (order.store?.pickupDelayDays ?? null);

  return {
    paymentStatus: PAYMENT_STATUS.PAYE,
    paidAt,
    ...(delay !== null
      ? { expectedDeliveryAt: addBusinessDays(paidAt, delay) }
      : {}),
  };
}
