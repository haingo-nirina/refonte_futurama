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
import { PostsService } from './posts.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginatePostsDto } from './dto/paginate-posts.dto';
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
    return this.postsService.findAll(query, isAdmin(user));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.postsService.findOne(id, isAdmin(user));
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

  /** Moderation : retrait d'un commentaire depuis le backoffice. */
  @Delete(':id/comments/:commentId')
  @AdminOnly()
  removeComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.postsService.removeComment(id, commentId);
  }
}

function isAdmin(user: AuthenticatedUser | undefined): boolean {
  return user?.role === USER_ROLE.ADMIN;
}
