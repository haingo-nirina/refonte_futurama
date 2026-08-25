import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATION_STATUS } from '../common/constants';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Un avis est toujours cree en attente de moderation. */
  async create(dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit ${dto.productId} introuvable`);
    }

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        authorName: dto.authorName,
        rating: dto.rating,
        comment: dto.comment ?? null,
        moderationStatus: MODERATION_STATUS.PENDING,
      },
    });
  }

  /** Seuls les avis approuves sont visibles publiquement. */
  findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: {
        productId,
        moderationStatus: MODERATION_STATUS.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPending() {
    return this.prisma.review.findMany({
      where: { moderationStatus: MODERATION_STATUS.PENDING },
      include: { product: { select: { id: true, name: true, slug: true } } },
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
    });
  }
}
