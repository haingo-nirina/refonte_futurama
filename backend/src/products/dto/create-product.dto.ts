import {
  ArrayMaxSize,
  IsArray,
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
import { Transform, Type } from 'class-transformer';
import { IsMediaRef } from '../../common/is-media-ref.decorator';
import { trim } from '../../common/trim';

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

  /**
   * Couleurs disponibles, remplacees en bloc. `[]` les vide, `undefined` les
   * laisse en place. Chaque valeur est trimmee : une couleur vide est refusee.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((item) => trim({ value: item })) : value,
  )
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  colors?: string[];

  /** Texte libre, unite comprise (« 30 x 20 x 15 cm »). Meme semantique `null`. */
  @IsOptional()
  @IsString()
  dimensions?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

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
