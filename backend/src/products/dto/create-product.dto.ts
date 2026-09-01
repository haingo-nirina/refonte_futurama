import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsMediaRef } from '../../common/is-media-ref.decorator';

export class CreateProductDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  marqueId?: string | null;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit etre en minuscules, mots separes par des tirets',
  })
  slug: string;

  /** `null` vide la reference, `undefined` laisse la valeur en place. */
  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  /**
   * `null` retire la promotion, `undefined` laisse celle en place — sans quoi
   * une promo posee une fois ne pourrait plus etre annulee depuis le
   * formulaire d'edition. `@Type` n'est pas applique a `null` par
   * class-transformer, la valeur arrive telle quelle au service.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  promoPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  /**
   * Televersee (`/uploads/videos/<uuid>.mp4`) ou hebergee ailleurs : les deux
   * formes sont acceptees, d'ou `@IsMediaRef` plutot que `@IsUrl`. `null`
   * detache la video, `undefined` laisse la valeur en place.
   */
  @IsOptional()
  @IsMediaRef()
  videoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
