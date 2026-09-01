import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ORDER_STATUS } from '../common/constants';

/** En-deca de ce stock, un produit remonte dans l'alerte du tableau de bord. */
const LOW_STOCK_THRESHOLD = 5;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

/**
 * Une commande annulee ne compte pas dans le chiffre d'affaires ; elle reste
 * visible dans la repartition par statut.
 */
const REVENUE_WHERE: Prisma.OrderWhereInput = {
  status: { not: ORDER_STATUS.CANCELLED },
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tout le tableau de bord en un appel : une quinzaine d'agregats sur une base
   * distante, ca ne supporte pas d'etre decoupe en autant d'allers-retours HTTP.
   */
  async dashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      today,
      month,
      allTime,
      byStatus,
      productCount,
      inactiveProductCount,
      categoryCount,
      customerCount,
      lowStock,
      topProducts,
      recentOrders,
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { ...REVENUE_WHERE, createdAt: { gte: startOfToday } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...REVENUE_WHERE, createdAt: { gte: startOfMonth } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: REVENUE_WHERE,
        _count: true,
        _sum: { total: true },
        _avg: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
        orderBy: { status: 'asc' },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: false } }),
      this.prisma.category.count(),
      this.prisma.user.count(),
      this.prisma.product.findMany({
        where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      // groupBy sur productName et non productId : une ligne de commande
      // survit a la suppression du produit (productId passe a NULL), le nom
      // reste fige. C'est la meme convention que le reste d'order_items.
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: TOP_PRODUCTS_LIMIT,
      }),
      this.prisma.order.findMany({
        take: RECENT_ORDERS_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shippingName: true,
          status: true,
          total: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      revenue: {
        today: today._sum.total ?? new Prisma.Decimal(0),
        month: month._sum.total ?? new Prisma.Decimal(0),
        allTime: allTime._sum.total ?? new Prisma.Decimal(0),
        averageOrder: allTime._avg.total ?? new Prisma.Decimal(0),
      },
      orders: {
        today: today._count,
        month: month._count,
        allTime: allTime._count,
        byStatus: Object.fromEntries(
          byStatus.map((row) => [row.status, row._count]),
        ),
      },
      catalog: {
        products: productCount,
        inactiveProducts: inactiveProductCount,
        categories: categoryCount,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        lowStock,
      },
      customers: customerCount,
      topProducts: topProducts.map((row) => ({
        productName: row.productName,
        quantity: row._sum?.quantity ?? 0,
      })),
      recentOrders,
    };
  }
}
