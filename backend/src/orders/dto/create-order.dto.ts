import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAYMENT_METHODS } from '../../common/constants';
import type { PaymentMethod } from '../../common/constants';

/**
 * Le proprietaire de la commande n'est pas dans ce DTO : il vient du JWT.
 * Seule l'adresse de livraison de CETTE commande est fournie ici — elle peut
 * differer du profil (livrer chez un proche, au bureau...) et reste figee.
 */
export class CreateOrderDto {
  /** Panier source : la commande est construite a partir de ce session_id. */
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsString()
  @IsNotEmpty()
  shippingName: string;

  @IsString()
  @IsNotEmpty()
  shippingPhone: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingFee?: number;
}
