import { Prisma } from '@prisma/client';

type PricedZone = {
  price: Prisma.Decimal;
  freeThreshold: Prisma.Decimal | null;
};

/**
 * Frais de livraison d'une zone pour un sous-total donne : gratuits des que le
 * seuil de la zone est atteint, prix fixe sinon. Seule source du calcul cote
 * serveur — le montant envoye par le navigateur n'est jamais lu.
 */
export function shippingFeeFor(
  zone: PricedZone,
  subtotal: Prisma.Decimal,
): Prisma.Decimal {
  if (zone.freeThreshold && subtotal.gte(zone.freeThreshold)) {
    return new Prisma.Decimal(0);
  }

  return zone.price;
}
