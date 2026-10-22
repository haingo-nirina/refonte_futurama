import { Prisma } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';

/**
 * Zones de livraison et boutique de retrait, partagees par `seed.ts` et
 * `seed-checkout.ts`. Tout est en upsert : rejouable, et jamais destructif.
 */

// =========================================================
// Livraison et retrait
// =========================================================

/**
 * Tarifs provisoires, a ajuster depuis le backoffice. Upsert sur le nom et non
 * purge : une commande garde un lien vers sa zone (onDelete: SetNull).
 */
export const DELIVERY_ZONES = [
  {
    name: 'Antananarivo',
    price: '5000',
    delayDays: 1,
    freeThreshold: '300000',
  },
  { name: 'Périphérie', price: '10000', delayDays: 2, freeThreshold: null },
  { name: 'Province', price: '25000', delayDays: 5, freeThreshold: null },
];

/** Boutique d'Analakely, seul point de retrait pour l'instant. */
export const STORE = {
  name: 'Futurama Tsaralalana',
  address: '68, rue de Liège, Tsaralalana, Antananarivo',
  phone: '032 11 310 20',
  openingHours: 'Lun – Ven : 8h30 à 12h30 – 14h à 17h\nSam : 8h30 à 12h30',
  // Position relevée sur Google Maps (colonnes en Decimal(9, 6))
  latitude: new Prisma.Decimal('-18.907143'),
  longitude: new Prisma.Decimal('47.521455'),
  pickupDelayDays: 0,
};

export async function seedDeliveryZones(prisma: PrismaService) {
  const ids = new Map<string, string>();

  for (const [displayOrder, zone] of DELIVERY_ZONES.entries()) {
    const data = {
      price: new Prisma.Decimal(zone.price),
      delayDays: zone.delayDays,
      freeThreshold: zone.freeThreshold
        ? new Prisma.Decimal(zone.freeThreshold)
        : null,
      displayOrder,
      isActive: true,
    };
    const saved = await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: data,
      create: { name: zone.name, ...data },
    });
    ids.set(zone.name, saved.id);
  }

  return ids;
}

/**
 * Pas de cle unique naturelle sur une boutique : on la retrouve par son nom.
 * Jamais purgee — une commande en retrait la reference (onDelete: Restrict).
 */
export async function seedStore(prisma: PrismaService) {
  const existing = await prisma.store.findFirst({
    where: { name: STORE.name },
  });

  return existing
    ? prisma.store.update({ where: { id: existing.id }, data: STORE })
    : prisma.store.create({ data: STORE });
}
