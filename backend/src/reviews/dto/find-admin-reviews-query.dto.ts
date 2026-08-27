import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../../common/constants';

export class FindAdminReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Absent = les trois statuts, la file de moderation complete. */
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatus;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
