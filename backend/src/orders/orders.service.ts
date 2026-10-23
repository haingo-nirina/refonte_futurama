import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addBusinessDays } from '../common/business-days';
import {
  FULFILLMENT_METHOD,
  ORDER_STATUS,
  PAYMENT_STATUS,
  USER_ROLE,
} from '../common/constants';
import { shippingFeeFor } from '../delivery-zones/shipping-fee';
import {
  activePromotionInclude,
  discountedPrice,
} from '../promotions/promotion-pricing';
import { nextOrderNumber } from './order-number';
import { ORDER_STATUS_LABELS, canTransition } from './order-status-rules';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  items: true,
  store: true,
  // le compte auteur : le backoffice en a besoin, et un client n'y lit que
  // ses propres coordonnees
  user: { select: { id: true, email: true, fullName: true } },
} as const;

/**
 * Lecture backoffice : ajoute l'historique des statuts, avec l'admin auteur de
 * chaque changement et sa note. Un client n'en voit rien.
 */
const ADMIN_ORDER_INCLUDE = {
  ...ORDER_INCLUDE,
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: { changedBy: { select: { id: true, fullName: true } } },
  },
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Flux "Passer la commande", entierement recalcule cote serveur :
   *
   * - prix de chaque ligne relu sur le produit (promotion active comprise), pas
   *   sur `CartItem.unitPrice` fige a l'ajout ;
   * - frais de livraison lus sur la zone, gratuits au-dela de son seuil ou en
   *   retrait boutique ;
   * - stock verifie et reserve dans la meme transaction : un decrement
   *   conditionnel (`stock >= quantite`) refuse la commande si un autre client
   *   a pris les dernieres unites entre-temps, et l'erreur annule tout.
   *
   * `userId` vient du JWT, jamais du body.
   */
  async createFromCart(userId: string, dto: CreateOrderDto) {
    // Le panier du compte, panier visiteur de la session fusionne dedans : un
    // panier de session rattache a un autre compte n'est jamais lu ici.
    const cart = await this.cartService.getCart(dto.session_id, userId);

    if (cart.items.length === 0) {
      throw new BadRequestException(
        'Le panier est vide, impossible de creer une commande',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: cart.items.map((item) => item.productId) } },
        include: { promotions: activePromotionInclude() },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const lines = cart.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `« ${item.product.name} » n'est plus disponible : retirez-le du panier`,
          );
        }

        const promotion = product.promotions[0];
        return {
          productId: product.id,
          // copie figee : la commande ne doit pas bouger si le produit change
          productName: product.name,
          quantity: item.quantity,
          unitPrice: promotion
            ? discountedPrice(product.price, promotion.discountPercent)
            : product.price,
          stock: product.stock,
        };
      });

      const subtotal = lines.reduce(
        (sum, line) => sum.add(line.unitPrice.mul(line.quantity)),
        new Prisma.Decimal(0),
      );

      const fulfillment = await this.resolveFulfillment(tx, dto, subtotal);

      for (const line of lines) {
        const reserved = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (reserved.count === 0) {
          throw new ConflictException(
            `Stock insuffisant pour « ${line.productName} » : ${Math.max(line.stock, 0)} disponible(s)`,
          );
        }
      }

      const order = await tx.order.create({
        data: {
          number: await nextOrderNumber(tx),
          userId,
          fulfillmentMethod: dto.fulfillmentMethod,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          ...fulfillment.data,
          paymentMethod: dto.paymentMethod,
          mvolaPhone: dto.mvolaPhone,
          subtotal,
          shippingFee: fulfillment.shippingFee,
          total: subtotal.add(fulfillment.shippingFee),
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
          statusHistory: {
            create: {
              toStatus: ORDER_STATUS.EN_ATTENTE_PAIEMENT,
              changedById: userId,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  /**
   * Ce que le mode de reception ajoute a la commande, et ses frais. La zone et
   * la boutique sont relues en base : un identifiant desactive ou invente est
   * refuse.
   */
  private async resolveFulfillment(
    tx: Prisma.TransactionClient,
    dto: CreateOrderDto,
    subtotal: Prisma.Decimal,
  ) {
    if (dto.fulfillmentMethod === FULFILLMENT_METHOD.LIVRAISON) {
      const zone = await tx.deliveryZone.findFirst({
        where: { id: dto.deliveryZoneId, isActive: true },
      });
      if (!zone) {
        throw new BadRequestException('Zone de livraison inconnue');
      }

      return {
        shippingFee: shippingFeeFor(zone, subtotal),
        data: {
          shippingAddress: dto.shippingAddress,
          deliveryZoneId: zone.id,
          // copies figees : modifier la zone ne doit pas changer la commande
          deliveryZoneName: zone.name,
          deliveryDelayDays: zone.delayDays,
        },
      };
    }

    const store = await tx.store.findFirst({
      where: { id: dto.storeId, isActive: true },
    });
    if (!store) {
      throw new BadRequestException('Boutique de retrait inconnue');
    }

    return {
      shippingFee: new Prisma.Decimal(0),
      data: { storeId: store.id },
    };
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
        { number: { contains: query.q, mode: 'insensitive' } },
        { contactName: { contains: query.q, mode: 'insensitive' } },
        { contactPhone: { contains: query.q, mode: 'insensitive' } },
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
    const isAdmin = user.role === USER_ROLE.ADMIN;
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: isAdmin ? ADMIN_ORDER_INCLUDE : ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    // Connaitre l'id d'une commande ne doit pas suffire a lire le nom, le
    // telephone et l'adresse de livraison de quelqu'un d'autre.
    if (order.userId !== user.userId && !isAdmin) {
      throw new ForbiddenException(
        'Cette commande appartient a un autre compte',
      );
    }

    return order;
  }

  /**
   * Changement de statut par l'admin, en une seule transaction :
   *
   * - le passage doit etre autorise (`order-status-rules.ts`), 400 sinon ;
   * - l'ecriture est conditionnee a l'ancien statut : si un autre admin l'a
   *   change entre-temps, 409 plutot qu'un double traitement (une annulation
   *   comptee deux fois remettrait deux fois le stock) ;
   * - PAYEE marque aussi le paiement (`paymentStatus`, `paidAt`) et fixe la
   *   date prevue, en attendant la confirmation automatique MVola ;
   * - ANNULEE remet en stock les quantites reservees a la commande ;
   * - chaque passage est trace dans `order_status_history`.
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, store: true },
      });

      if (!order) {
        throw new NotFoundException(`Commande ${id} introuvable`);
      }

      if (!canTransition(order.status, dto.status, order.fulfillmentMethod)) {
        throw new BadRequestException(
          `Passage impossible de « ${ORDER_STATUS_LABELS[order.status]} » a « ${ORDER_STATUS_LABELS[dto.status]} »`,
        );
      }

      const updated = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          status: dto.status,
          ...(dto.status === ORDER_STATUS.PAYEE ? paymentData(order) : {}),
        },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          'Le statut de cette commande vient de changer : rechargez la page',
        );
      }

      if (dto.status === ORDER_STATUS.ANNULEE) {
        for (const item of order.items) {
          // produit supprime du catalogue depuis : plus de stock a crediter
          if (item.productId === null) continue;

          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          changedById: adminId,
          note: dto.note || null,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: ADMIN_ORDER_INCLUDE,
      });
    });
  }
}

/**
 * Ce que le passage a PAYEE ecrit sur la commande. Un paiement deja confirme
 * garde sa date. La date prevue part de `paidAt` : delai de la zone (copie sur
 * la commande) en livraison, delai de preparation de la boutique en retrait.
 */
function paymentData(order: {
  paidAt: Date | null;
  fulfillmentMethod: string;
  deliveryDelayDays: number | null;
  store: { pickupDelayDays: number } | null;
}): Prisma.OrderUpdateManyMutationInput {
  const paidAt = order.paidAt ?? new Date();
  const delay =
    order.fulfillmentMethod === FULFILLMENT_METHOD.LIVRAISON
      ? order.deliveryDelayDays
      : (order.store?.pickupDelayDays ?? null);

  return {
    paymentStatus: PAYMENT_STATUS.PAYE,
    paidAt,
    ...(delay !== null
      ? { expectedDeliveryAt: addBusinessDays(paidAt, delay) }
      : {}),
  };
}

/** Dernier instant du jour : borne haute inclusive d'un filtre "jusqu'au <jour>". */
function endOfDay(date: string): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}
