import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAYMENT_METHODS } from '../../common/constants';
import type { PaymentMethod } from '../../common/constants';

export class CreateOrderDto {
  /** Panier source : la commande est construite a partir de ce session_id. */
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsNotEmpty()
  customerAddress: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingFee?: number;
}
