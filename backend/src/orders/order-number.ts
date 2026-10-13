import { Prisma } from '@prisma/client';

/** FUT-2026-000123 */
export function formatOrderNumber(year: number, sequence: number): string {
  return `FUT-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Prochain numero de l'annee. L'upsert incremente la ligne du compteur sous
 * verrou : deux commandes simultanees n'obtiennent jamais le meme numero. A
 * appeler dans la transaction de creation, pour qu'une commande annulee en
 * route ne consomme pas de numero.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getFullYear();
  const counter = await tx.orderCounter.upsert({
    where: { year },
    update: { lastValue: { increment: 1 } },
    create: { year, lastValue: 1 },
  });

  return formatOrderNumber(year, counter.lastValue);
}
