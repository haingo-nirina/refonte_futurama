import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginatePostsDto } from './dto/paginate-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Le nom affiche vient du compte : `authorName` n'existe plus, tout affichage
 * de commentaire doit joindre l'utilisateur.
 */
const COMMENT_AUTHOR_INCLUDE = {
  user: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        photoUrl: dto.photoUrl ?? null,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      },
    });
  }

  async findAll(query: PaginatePostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { comments: true } } },
      }),
      this.prisma.post.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        comments: {
          include: COMMENT_AUTHOR_INCLUDE,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Article ${id} introuvable`);
    }

    return post;
  }

  async update(id: string, dto: UpdatePostDto) {
    await this.findPostOrFail(id);

    return this.prisma.post.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findPostOrFail(id);

    return this.prisma.post.delete({ where: { id } });
  }

  /** Idempotent : liker deux fois depuis le meme compte ne compte qu'une fois. */
  async like(postId: string, userId: string) {
    await this.findPostOrFail(postId);

    try {
      await this.prisma.$transaction([
        this.prisma.postLike.create({ data: { postId, userId } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      if (!this.isAlreadyLiked(error)) {
        throw error;
      }
      // deja like par ce compte : on ne re-incremente pas
    }

    return this.findPostOrFail(postId);
  }

  /** Idempotent : unliker sans like prealable ne decremente rien. */
  async unlike(postId: string, userId: string) {
    await this.findPostOrFail(postId);

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.postLike.deleteMany({
        where: { postId, userId },
      });

      if (count > 0) {
        await tx.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: count } },
        });
      }
    });

    return this.findPostOrFail(postId);
  }

  async addComment(postId: string, userId: string, dto: CreateCommentDto) {
    await this.findPostOrFail(postId);

    return this.prisma.postComment.create({
      data: {
        postId,
        userId,
        comment: dto.comment,
      },
      include: COMMENT_AUTHOR_INCLUDE,
    });
  }

  private async findPostOrFail(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Article ${id} introuvable`);
    }

    return post;
  }

  private isAlreadyLiked(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    );
  }
}
