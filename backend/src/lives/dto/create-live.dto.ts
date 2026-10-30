import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { trim } from '../../common/trim';

export class CreateLiveDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  /** `null` ou vide efface la description. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Date annoncee au public, pas celle du demarrage reel. */
  @IsDateString()
  scheduledAt: string;

  /**
   * Produits presentes, dans l'ordre d'affichage. Remplace la selection en
   * bloc quand il est fourni, comme les images d'un produit.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  productIds?: string[];
}
