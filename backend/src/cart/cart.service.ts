import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/** Panier + items + produit associe : la forme renvoyee au front. */
const CART_INCLUDE = {
  items: {
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: 'asc' },
  },
} as const;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recupere le panier de la session, ou le cree s'il n'existe pas encore. */
  async getCart(sessionId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { sessionId },
      include: CART_INCLUDE,
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: { sessionId },
      include: CART_INCLUDE,
    });
  }

  /**
   * Ajoute un produit au panier. Si le produit y est deja, la quantite est
   * incrementee au lieu de creer une seconde ligne.
   */
  async addItem(sessionId: string, dto: AddCartItemDto) {
    const cart = await this.getCart(sessionId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Produit ${dto.productId} introuvable`);
    }

    const unitPrice = product.promoPrice ?? product.price;

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

    return this.getCart(sessionId);
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
