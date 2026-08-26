import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATION_STATUS } from '../common/constants';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

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

  /** Un avis est toujours cree en attente de moderation. */
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
          moderationStatus: MODERATION_STATUS.PENDING,
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
