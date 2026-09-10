import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginatePostsDto } from './dto/paginate-posts.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Le nom affiche vient du compte : `authorName` n'existe plus, tout affichage
 * de commentaire doit joindre l'utilisateur.
 */
const COMMENT_AUTHOR_INCLUDE = {
  user: { select: { id: true, fullName: true } },
} as const;

/**
 * Les commentaires partent avec la publication, du plus ancien au plus recent
 * comme un fil : le mur de la boutique les affiche sous chaque publication,
 * sans second appel. Meme parti que les avis sur la fiche produit — ils
 * tiennent dans la reponse a ce volume.
 *
 * Seules les racines (`parentId: null`) sont listees : les reponses de la
 * boutique arrivent sous leur commentaire, dans `replies`. Sans ce filtre
 * elles apparaitraient aussi a plat, en double.
 */
const COMMENTS_INCLUDE = {
  comments: {
    where: { parentId: null },
    include: {
      ...COMMENT_AUTHOR_INCLUDE,
      replies: {
        include: COMMENT_AUTHOR_INCLUDE,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const satisfies Prisma.PostInclude;

/**
 * Le compteur affiche sous la publication : les fils, pas les lignes. Les
 * reponses de la boutique en sont exclues, sinon « 3 commentaires » ne
 * correspondrait plus aux trois fils affiches dessous.
 */
const COUNT_SELECT = {
  _count: { select: { comments: { where: { parentId: null } }, likes: true } },
} as const satisfies Prisma.PostInclude;

/**
 * Un article est publie quand `publishedAt` est renseigne et deja passe :
 * une date future sert de publication programmee.
 */
const PUBLISHED_WHERE = (): Prisma.PostWhereInput => ({
  publishedAt: { not: null, lte: new Date() },
});

function isPublished(publishedAt: Date | null): boolean {
  return publishedAt !== null && publishedAt <= new Date();
}

/**
 * Qui lit. `isAdmin` leve le filtre de publication ; `userId` sert a dire au
 * lecteur s'il a deja aime la publication — un visiteur anonyme n'a jamais de
 * « j'aime » a lui.
 */
export type PostViewer = { userId?: string; isAdmin?: boolean };

/**
 * Qui agit sur un commentaire. L'auteur dispose du sien ; l'admin ne peut que
 * le retirer — moderer, c'est supprimer, pas reecrire au nom de quelqu'un.
 */
export type CommentActor = { userId: string; isAdmin?: boolean };

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

  /**
   * `isAdmin` leve le filtre de publication : un brouillon n'apparait jamais
   * au mur public, mais doit rester listable depuis le backoffice.
   *
   * Le mur classe sur `publishedAt` — la date qu'il affiche, donc celle qui
   * doit ordonner la liste. Le backoffice classe sur `createdAt` : ses
   * brouillons n'ont pas encore de date de publication.
   */
  async findAll(query: PaginatePostsDto, viewer: PostViewer = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = viewer.isAdmin ? {} : PUBLISHED_WHERE();

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: viewer.isAdmin
          ? { createdAt: 'desc' }
          : { publishedAt: 'desc' },
        include: {
          ...COMMENTS_INCLUDE,
          ...this.likedInclude(viewer.userId),
          ...COUNT_SELECT,
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: data.map((post) => this.withLiked(post)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, viewer: PostViewer = {}) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        ...COMMENTS_INCLUDE,
        ...this.likedInclude(viewer.userId),
        ...COUNT_SELECT,
      },
    });

    if (!post || (!viewer.isAdmin && !isPublished(post.publishedAt))) {
      throw new NotFoundException(`Article ${id} introuvable`);
    }

    return this.withLiked(post);
  }

  async update(id: string, dto: UpdatePostDto) {
    await this.findPostOrFail(id);

    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        // `null` detache la photo, `undefined` laisse l'ancienne en place.
        photoUrl: dto.photoUrl,
        // Meme distinction : `null` repasse la publication en brouillon.
        publishedAt:
          dto.publishedAt === undefined || dto.publishedAt === null
            ? dto.publishedAt
            : new Date(dto.publishedAt),
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

    return this.findOne(postId, { userId });
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

    return this.findOne(postId, { userId });
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

  /**
   * La reponse de la boutique a un commentaire, depuis le backoffice.
   *
   * Un seul niveau : on ne repond pas a une reponse. Sans cette limite le fil
   * deviendrait un arbre, que ni le mur ni la modale de moderation n'affichent.
   */
  async addReply(
    postId: string,
    commentId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    const parent = await this.findCommentOrFail(postId, commentId);

    if (parent.parentId !== null) {
      throw new BadRequestException(
        "On ne repond pas a une reponse : repondez au commentaire d'origine",
      );
    }

    return this.prisma.postComment.create({
      data: {
        postId,
        userId,
        parentId: commentId,
        comment: dto.comment,
      },
      include: COMMENT_AUTHOR_INCLUDE,
    });
  }

  /** Modifier son commentaire : l'auteur seul, comme pour un avis. */
  async updateComment(
    postId: string,
    commentId: string,
    actor: CommentActor,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.findCommentOrFail(postId, commentId);

    // Pas d'exception pour l'admin : reecrire le texte d'un client sous sa
    // signature n'est pas de la moderation.
    if (comment.userId !== actor.userId) {
      throw new ForbiddenException("Ce commentaire n'est pas le votre");
    }

    return this.prisma.postComment.update({
      where: { id: commentId },
      data: { comment: dto.comment },
      include: COMMENT_AUTHOR_INCLUDE,
    });
  }

  /**
   * Retire un commentaire : son auteur, ou un admin au titre de la moderation.
   * Ses reponses partent avec lui (`onDelete: Cascade`) — une reponse orpheline
   * n'aurait plus rien a quoi repondre.
   */
  async removeComment(postId: string, commentId: string, actor: CommentActor) {
    const comment = await this.findCommentOrFail(postId, commentId);

    if (!actor.isAdmin && comment.userId !== actor.userId) {
      throw new ForbiddenException("Ce commentaire n'est pas le votre");
    }

    return this.prisma.postComment.delete({ where: { id: commentId } });
  }

  /**
   * Le commentaire vise, en verifiant qu'il appartient bien a l'article de
   * l'URL : sans ce controle, `/posts/A/comments/<id de B>` toucherait B.
   */
  private async findCommentOrFail(postId: string, commentId: string) {
    await this.findPostOrFail(postId);

    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      throw new NotFoundException(`Commentaire ${commentId} introuvable`);
    }

    return comment;
  }

  private async findPostOrFail(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Article ${id} introuvable`);
    }

    return post;
  }

  /**
   * Les « j'aime » du seul lecteur, jamais la liste complete : elle dirait qui
   * a aime quoi a n'importe quel visiteur. Anonyme, on ne joint rien.
   */
  private likedInclude(userId: string | undefined) {
    return {
      likes: userId
        ? { where: { userId }, select: { id: true } }
        : (false as const),
    } satisfies Prisma.PostInclude;
  }

  /** Remplace la jointure technique par le booleen que le front attend. */
  private withLiked<T extends { likes?: { id: string }[] }>(post: T) {
    const { likes, ...rest } = post;

    return { ...rest, liked: (likes?.length ?? 0) > 0 };
  }

  private isAlreadyLiked(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    );
  }
}
