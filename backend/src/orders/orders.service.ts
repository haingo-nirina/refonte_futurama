import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_ROLE } from '../common/constants';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  items: true,
  // le compte auteur : le backoffice en a besoin, et un client n'y lit que
  // ses propres coordonnees
  user: { select: { id: true, email: true, fullName: true } },
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

  /**
   * Historique du compte appelant, admin compris : "Mes commandes" doit rester
   * personnel. La liste complete du site passe par `findAllForAdmin`.
   */
  findAll(user: AuthenticatedUser) {
    return this.prisma.order.findMany({
      where: { userId: user.userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Liste backoffice : paginee et filtrable, avec le compte auteur. */
  async findAllForAdmin(query: FindOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildAdminWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildAdminWhere(query: FindOrdersQueryDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      where.OR = [
        { shippingName: { contains: query.q, mode: 'insensitive' } },
        { shippingPhone: { contains: query.q, mode: 'insensitive' } },
        { user: { email: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        // borne haute inclusive : "jusqu'au 12" doit contenir le 12 entier
        ...(query.dateTo ? { lte: endOfDay(query.dateTo) } : {}),
      };
    }

    return where;
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.getOrThrow(id);

    // Connaitre l'id d'une commande ne doit pas suffire a lire le nom, le
    // telephone et l'adresse de livraison de quelqu'un d'autre.
    if (order.userId !== user.userId && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException(
        'Cette commande appartient a un autre compte',
      );
    }

    return order;
  }

  /** Lecture sans controle de proprietaire : reservee aux appels internes. */
  private async getOrThrow(id: string) {
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
    await this.getOrThrow(id);

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }
}

/** Dernier instant du jour : borne haute inclusive d'un filtre "jusqu'au <jour>". */
function endOfDay(date: string): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}
