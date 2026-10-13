import 'dotenv/config';

import { PrismaService } from '../src/prisma/prisma.service';
import { seedDeliveryZones, seedStore } from './checkout-data';

/**
 * `yarn seed:checkout` : cree ou met a jour les zones de livraison et la
 * boutique, SANS toucher au reste. A preferer a `yarn seed` sur une base qui a
 * deja un vrai catalogue — ce dernier purge produits, categories et contenu.
 */
const prisma = new PrismaService();

async function main() {
  const zoneIds = await seedDeliveryZones(prisma);
  const store = await seedStore(prisma);

  console.log(`  zones        ${zoneIds.size}`);
  console.log(`  boutique     ${store.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
