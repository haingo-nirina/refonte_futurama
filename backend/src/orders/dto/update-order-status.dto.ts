import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ORDER_STATUSES } from '../../common/constants';
import type { OrderStatus } from '../../common/constants';
import { trim } from '../../common/trim';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;

  /** Commentaire de l'admin, garde dans l'historique des statuts. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
