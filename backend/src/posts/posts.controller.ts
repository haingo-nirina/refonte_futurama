import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { USER_ROLE } from '../common/constants';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import {
  PostsService,
  type CommentActor,
  type PostViewer,
} from './posts.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginatePostsDto } from './dto/paginate-posts.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @AdminOnly()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  /**
   * Un brouillon (`publishedAt` vide ou a venir) n'est visible que du
   * backoffice : `OptionalJwtAuthGuard` laisse la route publique tout en
   * identifiant l'admin.
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: PaginatePostsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.postsService.findAll(query, toViewer(user));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.postsService.findOne(id, toViewer(user));
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.remove(id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postsService.like(id, user.userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postsService.unlike(id, user.userId);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(id, user.userId, dto);
  }

  /**
   * La reponse de la boutique a un commentaire, depuis le backoffice.
   *
   * `@AdminOnly()` : le mur est la page de la boutique, elle seule y repond —
   * c'est aussi ce qui permet au front de signer toute reponse « Futurama.mg »
   * sans exposer le role de son auteur.
   */
  @Post(':id/comments/:commentId/replies')
  @AdminOnly()
  addReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addReply(id, commentId, user.userId, dto);
  }

  /** Reserve a l'auteur du commentaire : le service repond 403 sinon. */
  @Patch(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.postsService.updateComment(id, commentId, toActor(user), dto);
  }

  /**
   * Deux appelants pour une meme route : l'auteur qui retire son commentaire
   * depuis le mur, l'admin qui le modere depuis le backoffice. Le tri se fait
   * dans le service — c'est une regle metier, pas un garde de route.
   */
  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  removeComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postsService.removeComment(id, commentId, toActor(user));
  }
}

/**
 * Le lecteur tel que le service l'attend : son role leve — ou non — le filtre
 * de publication, son identifiant dit s'il a deja aime la publication.
 */
function toViewer(user: AuthenticatedUser | undefined): PostViewer {
  return { userId: user?.userId, isAdmin: user?.role === USER_ROLE.ADMIN };
}

/**
 * Qui agit sur un commentaire. Toujours identifie ici — ces routes sont
 * derriere `JwtAuthGuard` —, son role decidant s'il modere ou dispose du sien.
 */
function toActor(user: AuthenticatedUser): CommentActor {
  return { userId: user.userId, isAdmin: user.role === USER_ROLE.ADMIN };
}
