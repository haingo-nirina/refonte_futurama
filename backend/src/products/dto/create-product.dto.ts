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

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  promoPrice?: number;

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
