import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { USER_ROLE } from '../common/constants';
import { CreateLiveCommentDto } from './dto/create-live-comment.dto';
import {
  LiveCommentsService,
  type LiveCommentActor,
} from './live-comments.service';

/**
 * Le fil de commentaires de la page live : lecture publique, ecriture avec un
 * compte. Les chemins ne recouvrent aucune route de `LivesController`
 * (`comments` est un segment fixe).
 */
@Controller('lives/:liveId/comments')
export class LiveCommentsController {
  constructor(private readonly liveCommentsService: LiveCommentsService) {}

  /** Anonyme accepte ; un admin voit aussi le fil d'un replay retire. */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Param('liveId', ParseUUIDPipe) liveId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.liveCommentsService.findAll(liveId, {
      isAdmin: user?.role === USER_ROLE.ADMIN,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('liveId', ParseUUIDPipe) liveId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLiveCommentDto,
  ) {
    return this.liveCommentsService.create(liveId, toActor(user), dto);
  }

  /**
   * Deux appelants : l'auteur qui retire son commentaire, l'admin qui modere.
   * Le tri se fait dans le service.
   */
  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('liveId', ParseUUIDPipe) liveId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.liveCommentsService.remove(liveId, commentId, toActor(user));
  }
}

function toActor(user: AuthenticatedUser): LiveCommentActor {
  return { userId: user.userId, isAdmin: user.role === USER_ROLE.ADMIN };
}
