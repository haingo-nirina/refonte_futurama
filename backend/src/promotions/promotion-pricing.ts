import { Prisma } from '@prisma/client';

/**
 * Source unique du prix promotionnel.
 *
 * Le prix reduit n'est stocke nulle part : il se recalcule a chaque lecture a
 * partir du prix catalogue et du pourcentage de la promotion active. Products,
 * cart et promotions passent tous par ici — c'est ce qui garantit que la fiche,
 * le catalogue, l'accueil et le panier annoncent le meme montant.
 */

/** Fenetre d'application : active, et la date du jour dans ses bornes. */
export function activePromotionWhere(now: Date = new Date()) {
  return {
    isActive: true,
    startDate: { lte: now },
    endDate: { gte: now },
  } satisfies Prisma.PromotionWhereInput;
}

/**
 * La promotion la plus avantageuse d'abord. Le service refuse deja les
 * chevauchements a l'ecriture, mais des donnees anterieures a ce controle
 * peuvent encore en presenter deux : dans le doute, le client gagne.
 */
export const BEST_PROMOTION_FIRST = [
  { discountPercent: 'desc' },
  { endDate: 'asc' },
] satisfies Prisma.PromotionOrderByWithRelationInput[];

/**
 * `price * (100 - remise) / 100`, arrondi au centime.
 *
 * Les colonnes monetaires sont des `Decimal` : le calcul passe par
 * `Prisma.Decimal`, jamais par les operateurs arithmetiques JS.
 */
export function discountedPrice(
  price: Prisma.Decimal,
  discountPercent: Prisma.Decimal,
): Prisma.Decimal {
  return price
    .mul(new Prisma.Decimal(100).minus(discountPercent))
    .div(100)
    .toDecimalPlaces(2);
}

/** Ce que les lectures produit joignent pour porter leur promotion active. */
export const ACTIVE_PROMOTION_SELECT = {
  id: true,
  titre: true,
  discountPercent: true,
  startDate: true,
  endDate: true,
  isFeatured: true,
} satisfies Prisma.PromotionSelect;

type ActivePromotionRow = {
  id: string;
  titre: string | null;
  discountPercent: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  isFeatured: boolean;
};

/**
 * Remplace la collection `promotions` d'un produit par un unique
 * `activePromotion`, prix reduit inclus — ou `null`.
 *
 * Le tableau brut ne sort jamais de l'API : il ne contiendrait qu'une ligne
 * (`take: 1`) et laisserait au client le soin de refaire l'arithmetique, donc
 * de diverger sur les arrondis.
 */
export function withActivePromotion<
  T extends { price: Prisma.Decimal; promotions: ActivePromotionRow[] },
>(product: T) {
  const { promotions, ...rest } = product;
  const promotion = promotions[0];

  return {
    ...rest,
    activePromotion: promotion
      ? {
          ...promotion,
          discountedPrice: discountedPrice(
            product.price,
            promotion.discountPercent,
          ),
        }
      : null,
  };
}

/** L'include a poser sur toute lecture produit destinee a un affichage. */
export function activePromotionInclude(now: Date = new Date()) {
  return {
    where: activePromotionWhere(now),
    orderBy: BEST_PROMOTION_FIRST,
    take: 1,
    select: ACTIVE_PROMOTION_SELECT,
  } satisfies Prisma.Product$promotionsArgs;
}
