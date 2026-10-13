import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  activePromotionInclude,
  discountedPrice,
} from '../promotions/promotion-pricing';

/** Panier + items + produit associe : la forme renvoyee au front. */
const CART_INCLUDE = {
  items: {
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: 'asc' },
  },
} as const;

type CartWithItems = Prisma.CartGetPayload<{ include: { items: true } }>;

/**
 * Quantite apres fusion : somme des deux paniers, plafonnee au stock. Jamais
 * en dessous de ce que le compte avait deja — la fusion ajoute, elle ne retire
 * pas ; c'est la commande qui verifie le stock au final.
 */
export function mergedQuantity(
  accountQuantity: number,
  guestQuantity: number,
  stock: number,
): number {
  return Math.max(
    accountQuantity,
    Math.min(accountQuantity + guestQuantity, Math.max(stock, 0)),
  );
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Panier de l'appelant, cree s'il n'existe pas encore.
   *
   * - Visiteur : le panier anonyme de son `session_id`. Un panier deja rattache
   *   a un compte n'est jamais servi a un anonyme (navigateur partage, compte
   *   deconnecte) : il en recoit un neuf.
   * - Connecte : le panier **du compte**, quel que soit le `session_id`. Le
   *   panier visiteur de la session y est fusionne puis supprime ; un panier de
   *   session rattache a un autre compte est simplement ignore.
   */
  async getCart(sessionId: string, userId?: string) {
    if (!userId) {
      const guest = await this.findGuestCart(sessionId);

      return (
        guest ??
        this.prisma.cart.create({
          data: { sessionId, userId: null },
          include: CART_INCLUDE,
        })
      );
    }

    const cartId = await this.prisma.$transaction(async (tx) => {
      const [accountCart, guestCart] = await Promise.all([
        tx.cart.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        }),
        tx.cart.findFirst({
          where: { sessionId, userId: null },
          include: { items: true },
        }),
      ]);

      // Premier panier du compte : le panier visiteur devient le sien tel quel.
      if (!accountCart) {
        if (guestCart) {
          await tx.cart.update({
            where: { id: guestCart.id },
            data: { userId },
          });
          return guestCart.id;
        }

        const created = await tx.cart.create({
          data: { sessionId, userId },
        });
        return created.id;
      }

      if (guestCart) {
        await this.mergeInto(tx, accountCart, guestCart);
      }

      return accountCart.id;
    });

    return this.findCartById(cartId);
  }

  private findGuestCart(sessionId: string) {
    return this.prisma.cart.findFirst({
      where: { sessionId, userId: null },
      include: CART_INCLUDE,
    });
  }

  /**
   * Verse les lignes du panier visiteur dans celui du compte, puis supprime le
   * panier visiteur. Un produit present des deux cotes voit ses quantites
   * additionnees, plafonnees au stock : la fusion ne doit pas fabriquer une
   * quantite que la commande refuserait ensuite. Une ligne sans stock
   * disponible n'est pas reprise.
   */
  private async mergeInto(
    tx: Prisma.TransactionClient,
    accountCart: CartWithItems,
    guestCart: CartWithItems,
  ) {
    const products = await tx.product.findMany({
      where: { id: { in: guestCart.items.map((item) => item.productId) } },
      select: { id: true, stock: true },
    });
    const stockById = new Map(products.map((p) => [p.id, p.stock]));

    for (const guestItem of guestCart.items) {
      const existing = accountCart.items.find(
        (item) => item.productId === guestItem.productId,
      );
      const quantity = mergedQuantity(
        existing?.quantity ?? 0,
        guestItem.quantity,
        stockById.get(guestItem.productId) ?? 0,
      );

      if (existing) {
        if (quantity > existing.quantity) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity, unitPrice: guestItem.unitPrice },
          });
        }
      } else if (quantity > 0) {
        await tx.cartItem.create({
          data: {
            cartId: accountCart.id,
            productId: guestItem.productId,
            quantity,
            unitPrice: guestItem.unitPrice,
          },
        });
      }
    }

    // Les lignes partent avec le panier (onDelete: Cascade).
    await tx.cart.delete({ where: { id: guestCart.id } });
  }

  /**
   * Ajoute un produit au panier. Si le produit y est deja, la quantite est
   * incrementee au lieu de creer une seconde ligne.
   */
  async addItem(sessionId: string, dto: AddCartItemDto, userId?: string) {
    const cart = await this.getCart(sessionId, userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { promotions: activePromotionInclude() },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Produit ${dto.productId} introuvable`);
    }

    // Le prix facture vient de la promotion active, jamais d'une colonne : le
    // panier doit annoncer exactement ce que la fiche et le catalogue affichent.
    const promotion = product.promotions[0];
    const unitPrice = promotion
      ? discountedPrice(product.price, promotion.discountPercent)
      : product.price;

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: dto.productId },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice,
      },
      update: {
        quantity: { increment: dto.quantity },
        unitPrice,
      },
    });

    return this.getCart(sessionId, userId);
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto) {
    const item = await this.findItemOrFail(itemId);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.findCartById(item.cartId);
  }

  async removeItem(itemId: string) {
    const item = await this.findItemOrFail(itemId);

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.findCartById(item.cartId);
  }

  private async findItemOrFail(itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Ligne de panier ${itemId} introuvable`);
    }

    return item;
  }

  private async findCartById(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: CART_INCLUDE,
    });

    if (!cart) {
      throw new NotFoundException(`Panier ${cartId} introuvable`);
    }

    return cart;
  }
}
