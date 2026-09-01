import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATION_STATUS } from '../common/constants';
import { CreateReviewDto } from './dto/create-review.dto';
import { FindAdminReviewsQueryDto } from './dto/find-admin-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Le nom affiche vient du compte : `authorName` n'existe plus, tout affichage
 * d'avis doit joindre l'utilisateur.
 */
const AUTHOR_INCLUDE = {
  user: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * L'avis est publie directement : le backoffice se contente de lister les
   * avis, il n'a plus d'action de moderation. `moderationStatus` reste en base
   * — les avis anterieurs gardent leur statut, et `moderate()` reste le moyen
   * de les debloquer si besoin.
   */
  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit ${dto.productId} introuvable`);
    }

    try {
      return await this.prisma.review.create({
        data: {
          productId: dto.productId,
          userId,
          rating: dto.rating,
          comment: dto.comment ?? null,
          moderationStatus: MODERATION_STATUS.APPROVED,
        },
        include: AUTHOR_INCLUDE,
      });
    } catch (error) {
      // Contrainte @@unique([productId, userId]) : un avis par produit et par
      // compte, quel que soit le statut de moderation du precedent.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(
          'Vous avez deja depose un avis sur ce produit',
        );
      }

      throw error;
    }
  }

  /** Seuls les avis approuves sont visibles publiquement. */
  findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: {
        productId,
        moderationStatus: MODERATION_STATUS.APPROVED,
      },
      include: AUTHOR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Un avis n'appartient qu'a son auteur : le backoffice le lit sans pouvoir
   * le toucher. Le controle vit ici, c'est une regle metier, pas du routage.
   */
  async update(id: string, userId: string, dto: UpdateReviewDto) {
    await this.findOwnedOrFail(id, userId);

    return this.prisma.review.update({
      where: { id },
      // `undefined` laisse le champ en place ; `null` vide le commentaire.
      data: { rating: dto.rating, comment: dto.comment },
      include: AUTHOR_INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOwnedOrFail(id, userId);

    return this.prisma.review.delete({ where: { id } });
  }

  private async findOwnedOrFail(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Avis ${id} introuvable`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException("Cet avis n'est pas le votre");
    }

    return review;
  }

  findPending() {
    return this.prisma.review.findMany({
      where: { moderationStatus: MODERATION_STATUS.PENDING },
      include: {
        ...AUTHOR_INCLUDE,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Liste backoffice : tous statuts confondus, paginee et filtrable. */
  async findAllForAdmin(query: FindAdminReviewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { moderationStatus: query.status } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...AUTHOR_INCLUDE,
          product: { select: { id: true, name: true, slug: true } },
        },
        // le dernier avis en haut : la liste se consulte, elle ne se vide plus
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Avis ${id} introuvable`);
    }

    return this.prisma.review.update({
      where: { id },
      data: { moderationStatus: dto.status },
      include: AUTHOR_INCLUDE,
    });
  }
}
