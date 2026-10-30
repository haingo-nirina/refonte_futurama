import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  FULFILLMENT_METHOD,
  FULFILLMENT_METHODS,
  PAYMENT_METHOD,
} from '../../common/constants';
import type { FulfillmentMethod, PaymentMethod } from '../../common/constants';
import {
  MVOLA_PHONE_PATTERN,
  normalizeMgPhone,
} from '../../common/mvola-phone';
import { trim } from '../../common/trim';

const isDelivery = (dto: CreateOrderDto) =>
  dto.fulfillmentMethod === FULFILLMENT_METHOD.LIVRAISON;
const isPickup = (dto: CreateOrderDto) =>
  dto.fulfillmentMethod === FULFILLMENT_METHOD.RETRAIT_BOUTIQUE;

/**
 * Ni le proprietaire ni aucun montant ne figurent ici : le compte vient du JWT,
 * les prix et les frais de livraison sont recalcules par le serveur depuis le
 * catalogue et la zone. Le client ne choisit que le contenu de sa commande.
 */
export class CreateOrderDto {
  /** Panier visiteur a fusionner dans celui du compte avant de commander. */
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod: FulfillmentMethod;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactName: string;

  @Transform(normalizeMgPhone)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone: string;

  @ValidateIf(isDelivery)
  @IsUUID()
  deliveryZoneId?: string;

  @ValidateIf(isDelivery)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  shippingAddress?: string;

  @ValidateIf(isPickup)
  @IsUUID()
  storeId?: string;

  // CASH_ON_DELIVERY n'existe plus que sur les anciennes commandes
  @IsIn([PAYMENT_METHOD.MVOLA])
  paymentMethod: PaymentMethod;

  @Transform(normalizeMgPhone)
  @Matches(MVOLA_PHONE_PATTERN, {
    message: 'Le numero MVola doit commencer par 034 ou 038 (10 chiffres)',
  })
  mvolaPhone: string;

  /**
   * Live depuis lequel la commande est passee, pour en mesurer les ventes.
   * Pure attribution : un identifiant inconnu est ignore, jamais bloquant.
   */
  @IsOptional()
  @IsUUID()
  liveId?: string;
}
