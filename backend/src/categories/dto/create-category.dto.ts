import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { IsMediaRef } from '../../common/is-media-ref.decorator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "L'identifiant d'URL doit être en minuscules, mots séparés par des tirets",
  })
  slug: string;

  /** Absent ou null : categorie racine. Sinon la categorie parente doit exister. */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsMediaRef()
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
