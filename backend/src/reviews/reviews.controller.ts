import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { FindReviewsQueryDto } from './dto/find-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @Get()
  findByProduct(@Query() query: FindReviewsQueryDto) {
    return this.reviewsService.findByProduct(query.product_id);
  }

  @Get('pending')
  findPending() {
    return this.reviewsService.findPending();
  }

  @Patch(':id/moderate')
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, dto);
  }
}
