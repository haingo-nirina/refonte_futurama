import { IsIn } from 'class-validator';
import { MODERATION_DECISIONS } from '../../common/constants';
import type { ModerationDecision } from '../../common/constants';

export class ModerateReviewDto {
  @IsIn(MODERATION_DECISIONS)
  status: ModerationDecision;
}
