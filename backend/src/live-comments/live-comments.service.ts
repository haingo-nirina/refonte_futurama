import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LIVE_STATUS, USER_ROLE } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiveCommentDto } from './dto/create-live-comment.dto';

/**
 * Le fil n'affiche que les derniers commentaires, comme sous un direct
 * Facebook : la page le relit toutes les quelques secondes, il doit rester
 * leger.
 */
const COMMENTS_LIMIT = 100;

/**
 * Chaque visiteur relit le fil toutes les 5 s pendant le direct : sans ce
 * cache, 200 spectateurs feraient 40 lectures par seconde vers Aiven et
 * occuperaient le pool de connexions dont les commandes ont besoin. Toute
 * ecriture vide l'entree du live, un commentaire publie s'affiche donc aussitot.
 */
const READ_TTL_MS = 3_000;

/**
 * Delai minimal entre deux commentaires d'un meme compte sur un live : de quoi
 * ecrire normalement, pas de quoi inonder le fil. L'equipe n'y est pas soumise.
 */
const COOLDOWN_MS = 5_000;

/**
 * Le role n'est lu que pour marquer d'un badge « Futurama » un commentaire
 * de l'equipe ; il ne sort jamais tel quel (voir `toPublic`).
 */
const AUTHOR_SELECT = {
  user: { select: { id: true, fullName: true, role: true } },
} as const satisfies Prisma.LiveMessageInclude;

type CommentRow = Prisma.LiveMessageGetPayload<{
  include: typeof AUTHOR_SELECT;
}>;

export type LiveCommentActor = { userId: string; isAdmin?: boolean };

/**
 * Les commentaires publics d'un live, en direct comme en replay. Ils vivent
 * dans `live_messages`, l'ancienne table des questions privees : `message` est
 * le texte, les autres colonnes (`productId`, `reply`, `handledAt`) ne sont
 * plus renseignees.
 */
@Injectable()
export class LiveCommentsService {
  private readonly cache = new Map<
    string,
    { readAt: number; result: Promise<{ data: PublicComment[] }> }
  >();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Les plus recents, rendus du plus ancien au plus recent comme un fil. Le
   * public lit le cache ; l'admin lit la base (il voit aussi les replays
   * retires).
   */
  findAll(liveId: string, viewer: { isAdmin?: boolean } = {}) {
    if (viewer.isAdmin) return this.readComments(liveId, true);

    const cached = this.cache.get(liveId);
    if (cached && Date.now() - cached.readAt < READ_TTL_MS) {
      return cached.result;
    }

    const result = this.readComments(liveId, false);
    // une lecture ratee (404 compris) ne reste pas en cache
    result.catch(() => {
      if (this.cache.get(liveId)?.result === result) this.cache.delete(liveId);
    });
    this.cache.set(liveId, { readAt: Date.now(), result });

    return result;
  }

  private async readComments(liveId: string, isAdmin: boolean) {
    await this.findVisibleLiveOrFail(liveId, isAdmin);

    const rows = await this.prisma.liveMessage.findMany({
      where: { liveId },
      orderBy: { createdAt: 'desc' },
      take: COMMENTS_LIMIT,
      include: AUTHOR_SELECT,
    });

    return { data: rows.reverse().map(toPublic) };
  }

  async create(
    liveId: string,
    actor: LiveCommentActor,
    dto: CreateLiveCommentDto,
  ) {
    await this.findVisibleLiveOrFail(liveId, actor.isAdmin);
    const userId = actor.userId;

    if (!actor.isAdmin) {
      const recent = await this.prisma.liveMessage.findFirst({
        where: {
          liveId,
          userId,
          createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) },
        },
        select: { id: true },
      });

      if (recent) {
        throw new HttpException(
          'Patientez quelques secondes avant de commenter à nouveau',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const row = await this.prisma.liveMessage.create({
      data: { liveId, userId, message: dto.message },
      include: AUTHOR_SELECT,
    });
    this.cache.delete(liveId);

    return toPublic(row);
  }

  /** Son auteur, ou un admin au titre de la moderation. */
  async remove(liveId: string, commentId: string, actor: LiveCommentActor) {
    const comment = await this.prisma.liveMessage.findUnique({
      where: { id: commentId },
    });

    // Verifie aussi le live de l'URL : sans ca, `/lives/A/comments/<id de B>`
    // toucherait B.
    if (!comment || comment.liveId !== liveId) {
      throw new NotFoundException(`Commentaire ${commentId} introuvable`);
    }

    if (!actor.isAdmin && comment.userId !== actor.userId) {
      throw new ForbiddenException("Ce commentaire n'est pas le votre");
    }

    await this.prisma.liveMessage.delete({ where: { id: commentId } });
    this.cache.delete(liveId);

    return { id: commentId };
  }

  /**
   * Un live termine n'est visible que s'il est un replay (une video, et pas
   * retire de « Nos vidéos ») : sinon il a disparu de la boutique, son fil
   * aussi. Le backoffice, lui, le voit toujours.
   */
  private async findVisibleLiveOrFail(id: string, isAdmin = false) {
    const live = await this.prisma.live.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        replayVisible: true,
        facebookUrl: true,
      },
    });

    const hidden =
      live?.status === LIVE_STATUS.TERMINE &&
      (!live.replayVisible || !live.facebookUrl);

    if (!live || (!isAdmin && hidden)) {
      throw new NotFoundException(`Live ${id} introuvable`);
    }

    return live;
  }
}

type PublicComment = ReturnType<typeof toPublic>;

function toPublic(row: CommentRow) {
  return {
    id: row.id,
    liveId: row.liveId,
    message: row.message,
    createdAt: row.createdAt,
    fromShop: row.user.role === USER_ROLE.ADMIN,
    user: { id: row.user.id, fullName: row.user.fullName },
  };
}
