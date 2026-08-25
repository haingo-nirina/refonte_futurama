import { IsUUID } from 'class-validator';

export class FindReviewsQueryDto {
  @IsUUID()
  product_id: string;
}
