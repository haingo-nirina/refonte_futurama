import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATION_STATUS, RelationType } from '../common/constants';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Images triees : la principale d'abord, puis l'ordre d'affichage. */
const IMAGES_INCLUDE = {
  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
} as const satisfies Prisma.Product$imagesArgs;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    await this.findCategoryOrFail(dto.categoryId);

    const vendorId = dto.vendorId ?? null;

    if (vendorId) {
      await this.findVendorOrFail(vendorId);
    }

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        vendorId,
        name: dto.name,
        slug: dto.slug,
        reference: dto.reference ?? null,
        description: dto.description ?? null,
        price: new Prisma.Decimal(dto.price),
        promoPrice:
          dto.promoPrice === undefined
            ? null
            : new Prisma.Decimal(dto.promoPrice),
        stock: dto.stock ?? 0,
        isPremium: dto.isPremium ?? false,
        videoUrl: dto.videoUrl ?? null,
        isActive: dto.isActive ?? true,
      },
      include: { images: IMAGES_INCLUDE },
    });
  }

  async findAll(query: FindProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = this.buildWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { images: IMAGES_INCLUDE },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: IMAGES_INCLUDE,
        specs: { orderBy: { displayOrder: 'asc' } },
        // seuls les avis approuves sont visibles publiquement
        reviews: {
          where: { moderationStatus: MODERATION_STATUS.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }

    // Best effort : le compteur de vues ne doit ni ralentir ni faire echouer
    // la lecture de la fiche produit.
    void this.prisma.product
      .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => undefined);

    return product;
  }

  /** Produits lies via ProductRelation, dans le sens produit -> produit lie. */
  async findRelated(id: string, relationType: RelationType) {
    await this.findOneOrFail(id);

    const relations = await this.prisma.productRelation.findMany({
      where: { productId: id, relationType },
      include: { relatedProduct: { include: { images: IMAGES_INCLUDE } } },
    });

    return relations.map((relation) => relation.relatedProduct);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneOrFail(id);

    if (dto.categoryId) {
      await this.findCategoryOrFail(dto.categoryId);
    }

    // `undefined` = champ non fourni (on ne touche pas), `null` = detacher le vendeur.
    const vendorId =
      dto.vendorId === undefined ? undefined : (dto.vendorId ?? null);

    if (vendorId) {
      await this.findVendorOrFail(vendorId);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        vendorId,
        name: dto.name,
        slug: dto.slug,
        reference: dto.reference,
        description: dto.description,
        price:
          dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        promoPrice:
          dto.promoPrice === undefined
            ? undefined
            : new Prisma.Decimal(dto.promoPrice),
        stock: dto.stock,
        isPremium: dto.isPremium,
        videoUrl: dto.videoUrl,
        isActive: dto.isActive,
      },
      include: { images: IMAGES_INCLUDE },
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);

    return this.prisma.product.delete({ where: { id } });
  }

  private buildWhere(query: FindProductsQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.isPremium !== undefined) {
      where.isPremium = query.isPremium;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined
          ? { gte: new Prisma.Decimal(query.minPrice) }
          : {}),
        ...(query.maxPrice !== undefined
          ? { lte: new Prisma.Decimal(query.maxPrice) }
          : {}),
      };
    }

    return where;
  }

  private async findOneOrFail(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }

    return product;
  }

  private async findCategoryOrFail(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Categorie ${id} introuvable`);
    }

    return category;
  }

  private async findVendorOrFail(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      throw new NotFoundException(`Vendeur ${id} introuvable`);
    }

    return vendor;
  }
}
