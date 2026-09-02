import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfter } from '../../common/is-after.decorator';

export class CreatePromotionDto {
  @IsUUID()
  productId: string;

  /** Ex. « Promotion du mois - Septembre 2026 ». `null` retire le titre. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titre?: string | null;

  /**
   * Pourcentage de remise. La colonne est un `Decimal(5, 2)` : deux decimales
   * au plus, et `100` reste accepte (produit offert).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent: number;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsAfter('startDate')
  endDate: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Fait entrer la promotion dans la section « Promotion du mois » de
   * l'accueil. Plusieurs promotions peuvent la porter en meme temps : la
   * maquette en aligne quatre.
   */
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
