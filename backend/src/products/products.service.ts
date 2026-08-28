import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MODERATION_STATUS,
  RELATION_TYPE,
  RelationType,
} from '../common/constants';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { ReplaceProductImagesDto } from './dto/replace-product-images.dto';
import { ReplaceProductRelationsDto } from './dto/replace-product-relations.dto';
import { ReplaceProductSpecsDto } from './dto/replace-product-specs.dto';
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

    const marqueId = dto.marqueId ?? null;

    if (marqueId) {
      await this.findMarqueOrFail(marqueId);
    }

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        marqueId,
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

  /**
   * `isAdmin` n'ouvre pas de donnees supplementaires, il leve seulement le
   * filtre de publication : un produit desactive reste invisible au catalogue
   * mais doit rester listable et rouvrable depuis le backoffice.
   */
  async findAll(query: FindProductsQueryDto, isAdmin = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = this.buildWhere(query, isAdmin);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: IMAGES_INCLUDE,
          category: { select: { id: true, name: true, slug: true } },
          marque: { select: { id: true, name: true } },
        },
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

  async findOne(id: string, isAdmin = false) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: IMAGES_INCLUDE,
        specs: { orderBy: { displayOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        marque: { select: { id: true, name: true } },
        // le backoffice doit voir les avis en attente pour les moderer depuis
        // la fiche ; le public ne voit que les approuves
        reviews: {
          where: isAdmin
            ? {}
            : { moderationStatus: MODERATION_STATUS.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
        relationsFrom: isAdmin
          ? {
              include: {
                relatedProduct: { select: { id: true, name: true } },
              },
            }
          : false,
      },
    });

    if (!product) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }

    if (!product.isActive && !isAdmin) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }

    // Une consultation depuis le backoffice n'est pas une vue client.
    if (!isAdmin) {
      // Best effort : le compteur de vues ne doit ni ralentir ni faire echouer
      // la lecture de la fiche produit.
      void this.prisma.product
        .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    return product;
  }

  /** Produits lies via ProductRelation, dans le sens produit -> produit lie. */
  async findRelated(id: string, relationType: RelationType) {
    await this.findOneOrFail(id);

    const relations = await this.prisma.productRelation.findMany({
      where: {
        productId: id,
        relationType,
        relatedProduct: { isActive: true },
      },
      include: { relatedProduct: { include: { images: IMAGES_INCLUDE } } },
    });

    return relations.map((relation) => relation.relatedProduct);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneOrFail(id);

    if (dto.categoryId) {
      await this.findCategoryOrFail(dto.categoryId);
    }

    // `undefined` = champ non fourni (on ne touche pas), `null` = detacher la marque.
    const marqueId =
      dto.marqueId === undefined ? undefined : (dto.marqueId ?? null);

    if (marqueId) {
      await this.findMarqueOrFail(marqueId);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        marqueId,
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

  /** Remplace la galerie en bloc ; au plus une image principale. */
  async replaceImages(id: string, dto: ReplaceProductImagesDto) {
    await this.findOneOrFail(id);

    const primaries = dto.images.filter((image) => image.isPrimary).length;

    if (primaries > 1) {
      throw new BadRequestException(
        'Une seule image peut etre marquee comme principale',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });

      if (dto.images.length === 0) return;

      await tx.productImage.createMany({
        data: dto.images.map((image, index) => ({
          productId: id,
          imageUrl: image.imageUrl,
          displayOrder: image.displayOrder ?? index,
          // sans choix explicite, la premiere de la liste fait la vignette
          isPrimary: image.isPrimary ?? (primaries === 0 && index === 0),
        })),
      });
    });

    return this.prisma.productImage.findMany({
      where: { productId: id },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });
  }

  /** Remplace les specifications en bloc. */
  async replaceSpecs(id: string, dto: ReplaceProductSpecsDto) {
    await this.findOneOrFail(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.productSpec.deleteMany({ where: { productId: id } });

      if (dto.specs.length === 0) return;

      await tx.productSpec.createMany({
        data: dto.specs.map((spec, index) => ({
          productId: id,
          label: spec.label,
          value: spec.value,
          displayOrder: spec.displayOrder ?? index,
        })),
      });
    });

    return this.prisma.productSpec.findMany({
      where: { productId: id },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Remplace les produits lies en bloc.
   *
   * `similar` est ecrit dans les deux sens : la relation est dirigee en base
   * et `findRelated` filtre sur `productId`, donc sans miroir "A ressemble a B"
   * n'apparaitrait pas sur la fiche de B. C'est la convention du seed.
   * `frequently_bought_together` reste dirigee (l'accessoire d'un produit
   * n'implique pas l'inverse).
   */
  async replaceRelations(id: string, dto: ReplaceProductRelationsDto) {
    await this.findOneOrFail(id);

    if (dto.relations.some((relation) => relation.relatedProductId === id)) {
      throw new BadRequestException(
        'Un produit ne peut pas etre lie a lui-meme',
      );
    }

    const targetIds = [
      ...new Set(dto.relations.map((relation) => relation.relatedProductId)),
    ];

    if (targetIds.length > 0) {
      const found = await this.prisma.product.count({
        where: { id: { in: targetIds } },
      });

      if (found !== targetIds.length) {
        throw new NotFoundException('Un produit lie est introuvable');
      }
    }

    const similarIds = dto.relations
      .filter((relation) => relation.relationType === RELATION_TYPE.SIMILAR)
      .map((relation) => relation.relatedProductId);

    await this.prisma.$transaction(async (tx) => {
      await tx.productRelation.deleteMany({ where: { productId: id } });
      // le miroir pose par un passage precedent doit partir avec l'original
      await tx.productRelation.deleteMany({
        where: { relatedProductId: id, relationType: RELATION_TYPE.SIMILAR },
      });

      if (dto.relations.length === 0) return;

      await tx.productRelation.createMany({
        data: [
          ...dto.relations.map((relation) => ({
            productId: id,
            relatedProductId: relation.relatedProductId,
            relationType: relation.relationType,
          })),
          ...similarIds.map((relatedProductId) => ({
            productId: relatedProductId,
            relatedProductId: id,
            relationType: RELATION_TYPE.SIMILAR,
          })),
        ],
        skipDuplicates: true,
      });
    });

    return this.prisma.productRelation.findMany({
      where: { productId: id },
      include: { relatedProduct: { select: { id: true, name: true } } },
    });
  }

  private buildWhere(
    query: FindProductsQueryDto,
    isAdmin: boolean,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    // Un visiteur ne choisit pas de voir les produits depublies.
    if (!isAdmin) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.marqueId) {
      where.marqueId = query.marqueId;
    }

    if (query.isPremium !== undefined) {
      where.isPremium = query.isPremium;
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { reference: { contains: query.q, mode: 'insensitive' } },
      ];
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

  private async findMarqueOrFail(id: string) {
    const marque = await this.prisma.marque.findUnique({ where: { id } });

    if (!marque) {
      throw new NotFoundException(`Marque ${id} introuvable`);
    }

    return marque;
  }
}
