import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { FindPromotionsQueryDto } from './dto/find-promotions-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  activePromotionWhere,
  BEST_PROMOTION_FIRST,
  discountedPrice,
} from './promotion-pricing';

/**
 * Le produit accompagne chaque promotion : le backoffice liste « 25 % sur
 * Slurm Xtreme », pas un identifiant, et le prix de base est necessaire pour
 * afficher le prix reduit — qui n'est jamais stocke.
 */
const PRODUCT_CARD = {
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    isActive: true,
    category: { select: { id: true, name: true, slug: true } },
    images: {
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      take: 1,
    },
  },
} satisfies Prisma.ProductDefaultArgs;

type PromotionRow = {
  id: string;
  productId: string;
  titre: string | null;
  discountPercent: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isFeatured: boolean;
};

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromotionDto) {
    await this.getProductOrThrow(dto.productId);

    const isActive = dto.isActive ?? true;
    await this.assertNoOverlap(dto.productId, dto.startDate, dto.endDate, {
      isActive,
    });

    const promotion = await this.prisma.promotion.create({
      data: {
        productId: dto.productId,
        titre: dto.titre ?? null,
        discountPercent: new Prisma.Decimal(dto.discountPercent),
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive,
        isFeatured: dto.isFeatured ?? false,
      },
      include: { product: PRODUCT_CARD },
    });

    return this.withPricing(promotion, promotion.product);
  }

  async findAll(query: FindPromotionsQueryDto) {
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: query.isActive,
        isFeatured: query.isFeatured,
        productId: query.productId,
      },
      include: { product: PRODUCT_CARD },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'desc' }],
    });

    return promotions.map((promotion) =>
      this.withPricing(promotion, promotion.product),
    );
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: { product: PRODUCT_CARD },
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} introuvable`);
    }

    return this.withPricing(promotion, promotion.product);
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const current = await this.getOrThrow(id);

    // Le chevauchement se juge sur les valeurs *fusionnees* : un PATCH ne
    // portant que `endDate` deplace quand meme le bord de la plage.
    const productId = dto.productId ?? current.productId;
    const startDate = dto.startDate ?? current.startDate;
    const endDate = dto.endDate ?? current.endDate;
    const isActive = dto.isActive ?? current.isActive;

    if (endDate.getTime() <= startDate.getTime()) {
      throw new ConflictException(
        'endDate doit etre strictement posterieure a startDate',
      );
    }

    if (dto.productId !== undefined && dto.productId !== current.productId) {
      await this.getProductOrThrow(dto.productId);
    }

    await this.assertNoOverlap(productId, startDate, endDate, {
      isActive,
      excludeId: id,
    });

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        productId: dto.productId,
        titre: dto.titre,
        discountPercent:
          dto.discountPercent === undefined
            ? undefined
            : new Prisma.Decimal(dto.discountPercent),
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
      },
      include: { product: PRODUCT_CARD },
    });

    return this.withPricing(promotion, promotion.product);
  }

  /**
   * Suppression *dure*, assumee : `isActive` couvre deja le besoin de retirer
   * une promotion sans perdre sa trace, un second mecanisme de soft delete
   * ferait doublon. Rien ne reference une promotion — `order_items` fige deja
   * son propre prix unitaire, une commande passee ne bouge pas.
   */
  async remove(id: string) {
    await this.getOrThrow(id);

    return this.prisma.promotion.delete({ where: { id } });
  }

  /**
   * Promotion active sur un produit donne, ou `null`. C'est la methode dont se
   * sert la fiche produit pour afficher un prix barre : le prix reduit est
   * calcule ici, jamais lu sur le produit.
   *
   * Le tri sur `discountPercent` est un filet pour les donnees anterieures au
   * controle de chevauchement : s'il en restait deux, c'est la plus avantageuse
   * pour le client qui gagne.
   *
   * La publication du produit n'entre pas en compte : le backoffice doit voir
   * la promotion d'un produit hors ligne pour pouvoir la corriger. Les lectures
   * publiques masquent deja le produit lui-meme.
   */
  async getActivePromotionForProduct(productId: string) {
    const now = new Date();

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: PRODUCT_CARD.select,
    });

    if (!product) {
      return null;
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: { productId, ...activePromotionWhere(now) },
      orderBy: BEST_PROMOTION_FIRST,
    });

    return promotion ? this.withPricing(promotion, product) : null;
  }

  /**
   * La « promotion du mois » de l'accueil : la maquette en aligne quatre, avec
   * une remise propre a chacune. Le drapeau n'est donc *pas* exclusif — c'est
   * une selection, pas un elu unique.
   *
   * Le tri met les remises les plus fortes en tete : c'est ce que la section
   * met en avant, et ca donne un ordre stable quand il y en a plus que la
   * grille n'en affiche.
   *
   * Un produit desactive est exclu : il ne doit pas plus apparaitre ici que
   * dans le catalogue ou dans les produits lies.
   */
  async findFeatured() {
    const now = new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        isFeatured: true,
        ...activePromotionWhere(now),
        product: { isActive: true },
      },
      include: { product: PRODUCT_CARD },
      orderBy: BEST_PROMOTION_FIRST,
    });

    return promotions.map((promotion) =>
      this.withPricing(promotion, promotion.product),
    );
  }

  /**
   * Prix reduit calcule a la volee, jamais stocke : `price * (100 - remise)`.
   * Les colonnes monetaires sont des `Decimal`, le calcul passe donc par
   * `Prisma.Decimal` et pas par les operateurs arithmetiques JS.
   *
   * `savings` se deduit du prix *arrondi* pour que les trois montants soient
   * coherents entre eux a l'affichage.
   */
  private withPricing<P extends { price: Prisma.Decimal }>(
    promotion: PromotionRow,
    product: P,
  ) {
    const basePrice = product.price;
    const reduced = discountedPrice(basePrice, promotion.discountPercent);

    return {
      ...promotion,
      product,
      basePrice,
      discountedPrice: reduced,
      savings: basePrice.minus(reduced),
    };
  }

  /**
   * Deux promotions actives ne peuvent pas se chevaucher sur un meme produit :
   * le prix affiche deviendrait ambigu. Une promotion *desactivee* ne
   * s'applique pas, elle n'entre donc pas dans le calcul — c'est ce qui permet
   * de preparer la promo du mois suivant pendant que celle en cours tourne.
   */
  private async assertNoOverlap(
    productId: string,
    startDate: Date,
    endDate: Date,
    { isActive, excludeId }: { isActive: boolean; excludeId?: string },
  ) {
    if (!isActive) {
      return;
    }

    const conflict = await this.prisma.promotion.findFirst({
      where: {
        productId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    });

    if (conflict) {
      throw new ConflictException(
        `Ce produit a deja une promotion active du ${conflict.startDate.toISOString()} au ${conflict.endDate.toISOString()}`,
      );
    }
  }

  private async getOrThrow(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });

    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} introuvable`);
    }

    return promotion;
  }

  private async getProductOrThrow(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Produit ${productId} introuvable`);
    }

    return product;
  }
}
