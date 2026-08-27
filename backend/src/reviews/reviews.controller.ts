import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { FindAdminReviewsQueryDto } from './dto/find-admin-reviews-query.dto';
import { FindReviewsQueryDto } from './dto/find-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.userId, dto);
  }

  @Get()
  findByProduct(@Query() query: FindReviewsQueryDto) {
    return this.reviewsService.findByProduct(query.product_id);
  }

  @Get('pending')
  @AdminOnly()
  findPending() {
    return this.reviewsService.findPending();
  }

  /** Declaree avant `:id` comme `pending` : Nest resout dans l'ordre. */
  @Get('admin')
  @AdminOnly()
  findAllForAdmin(@Query() query: FindAdminReviewsQueryDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Patch(':id/moderate')
  @AdminOnly()
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, dto);
  }
}
