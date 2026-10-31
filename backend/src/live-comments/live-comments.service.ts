import {
  ForbiddenException,
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
  constructor(private readonly prisma: PrismaService) {}

  /** Les plus recents, rendus du plus ancien au plus recent comme un fil. */
  async findAll(liveId: string, viewer: { isAdmin?: boolean } = {}) {
    await this.findVisibleLiveOrFail(liveId, viewer.isAdmin);

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

    const row = await this.prisma.liveMessage.create({
      data: { liveId, userId, message: dto.message },
      include: AUTHOR_SELECT,
    });

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

    return { id: commentId };
  }

  /**
   * Un live retire des replays ne se commente plus et ne montre plus son fil :
   * il a disparu de la boutique. Le backoffice, lui, le voit toujours.
   */
  private async findVisibleLiveOrFail(id: string, isAdmin = false) {
    const live = await this.prisma.live.findUnique({
      where: { id },
      select: { id: true, status: true, replayVisible: true },
    });

    if (
      !live ||
      (!isAdmin && live.status === LIVE_STATUS.TERMINE && !live.replayVisible)
    ) {
      throw new NotFoundException(`Live ${id} introuvable`);
    }

    return live;
  }
}

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
