import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  items: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Flux "Passer la commande" : lit le panier de la session, fige le prix et le
   * nom de chaque produit dans les order_items, puis vide le panier.
   *
   * `userId` vient du JWT, jamais du body : le client ne choisit pas a quel
   * compte rattacher sa commande.
   */
  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { sessionId: dto.session_id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException(
        'Le panier est vide, impossible de creer une commande',
      );
    }

    // Un panier deja rattache a un autre compte n'est pas commandable :
    // connaitre un session_id ne doit pas suffire a vider le panier d'autrui.
    if (cart.userId && cart.userId !== userId) {
      throw new ForbiddenException('Ce panier appartient a un autre compte');
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    const shippingFee = new Prisma.Decimal(dto.shippingFee ?? 0);
    const total = subtotal.add(shippingFee);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          shippingAddress: dto.shippingAddress,
          paymentMethod: dto.paymentMethod,
          subtotal,
          shippingFee,
          total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              // copie figee : la commande ne doit pas bouger si le produit change
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Le panier invite devient celui du compte qui vient de commander.
      if (!cart.userId) {
        await tx.cart.update({ where: { id: cart.id }, data: { userId } });
      }

      return order;
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }
}
