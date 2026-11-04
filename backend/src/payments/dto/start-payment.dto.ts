import { IsUUID } from 'class-validator';

/** Seule la commande est lue : montant et numero viennent de la commande. */
export class StartPaymentDto {
  @IsUUID()
  orderId: string;
}
