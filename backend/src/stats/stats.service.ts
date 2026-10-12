import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATION_STATUS, ORDER_STATUS } from '../common/constants';

/** En-deca de ce stock, un produit remonte dans l'alerte du tableau de bord. */
const LOW_STOCK_THRESHOLD = 5;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;
/** Profondeur de la courbe des ventes, aujourd'hui compris. */
const SALES_DAYS = 30;
/** Profondeur de l'histogramme mensuel, mois en cours compris. */
const SALES_MONTHS = 12;

/**
 * `2026-03-12` dans le fuseau du serveur : le meme decoupage que « CA du jour »,
 * sans quoi une commande de 23 h ne tomberait pas le meme jour dans les deux.
 */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `2026-03` : meme fuseau que `dayKey`. */
function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7);
}

type SalesBucket = { revenue: Prisma.Decimal; orders: number };

/** Une case par periode, vide comprise : un mois sans vente reste a l'axe. */
function emptyBuckets(keys: string[]): Map<string, SalesBucket> {
  return new Map(
    keys.map((key) => [key, { revenue: new Prisma.Decimal(0), orders: 0 }]),
  );
}

function serializeBuckets(buckets: Map<string, SalesBucket>, label: string) {
  return [...buckets].map(([key, bucket]) => ({ [label]: key, ...bucket }));
}

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

    const startOfSales = new Date(startOfToday);
    startOfSales.setDate(startOfSales.getDate() - (SALES_DAYS - 1));

    const startOfMonths = new Date(startOfMonth);
    startOfMonths.setMonth(startOfMonths.getMonth() - (SALES_MONTHS - 1));

    // Une seule lecture alimente les deux histogrammes : elle part du plus
    // ancien des deux debuts, quelles que soient les profondeurs choisies.
    const startOfHistory =
      startOfSales < startOfMonths ? startOfSales : startOfMonths;

    const [
      today,
      month,
      allTime,
      byStatus,
      productCount,
      inactiveProductCount,
      categoryCount,
      customerCount,
      pendingReviewCount,
      lowStock,
      topProducts,
      recentOrders,
      salesOrders,
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
      this.prisma.review.count({
        where: { moderationStatus: MODERATION_STATUS.PENDING },
      }),
      this.prisma.product.findMany({
        where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      // Les commandes annulees sont ecartees : un produit commande puis annule
      // n'a pas ete vendu, meme regle que le chiffre d'affaires.
      // groupBy sur productName et non productId : une ligne de commande
      // survit a la suppression du produit (productId passe a NULL), le nom
      // reste fige. C'est la meme convention que le reste d'order_items.
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: REVENUE_WHERE },
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
      // Ventilees par jour cote Node plutot qu'en SQL : un `date_trunc` cote
      // Postgres decouperait dans le fuseau de la base, pas dans celui du
      // serveur qui calcule « CA du jour ». A ce volume, 30 jours de commandes
      // tiennent sans peine en memoire. Douze mois aussi, mais c'est la
      // premiere lecture a reprendre quand le volume grossira.
      this.prisma.order.findMany({
        where: { ...REVENUE_WHERE, createdAt: { gte: startOfHistory } },
        select: { total: true, createdAt: true },
      }),
    ]);

    // Toutes les periodes de la fenetre, y compris celles sans vente : un
    // jour vide est une information, pas un trou a refermer sur l'axe.
    const salesByDay = emptyBuckets(
      Array.from({ length: SALES_DAYS }, (_, i) => {
        const day = new Date(startOfSales);
        day.setDate(day.getDate() + i);
        return dayKey(day);
      }),
    );
    const salesByMonth = emptyBuckets(
      Array.from({ length: SALES_MONTHS }, (_, i) => {
        const month = new Date(startOfMonths);
        month.setMonth(month.getMonth() + i);
        return monthKey(month);
      }),
    );
    for (const order of salesOrders) {
      for (const bucket of [
        salesByDay.get(dayKey(order.createdAt)),
        salesByMonth.get(monthKey(order.createdAt)),
      ]) {
        if (!bucket) continue;
        bucket.revenue = bucket.revenue.add(order.total);
        bucket.orders += 1;
      }
    }

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
      pendingReviews: pendingReviewCount,
      topProducts: topProducts.map((row) => ({
        productName: row.productName,
        quantity: row._sum?.quantity ?? 0,
      })),
      recentOrders,
      salesByDay: serializeBuckets(salesByDay, 'date'),
      salesByMonth: serializeBuckets(salesByMonth, 'month'),
    };
  }
}
