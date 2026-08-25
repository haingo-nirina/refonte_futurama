import { IsIn } from 'class-validator';
import { ORDER_STATUSES } from '../../common/constants';
import type { OrderStatus } from '../../common/constants';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}
