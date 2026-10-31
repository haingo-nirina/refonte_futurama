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
import { IsFacebookVideoLink } from './facebook-video-link.decorator';

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

  /**
   * Lien de la video, facultatif : connu a l'avance quand le direct a ete
   * programme sur Facebook. Il ne fait pas passer le live en direct — c'est
   * `start()` qui le fait, la modale « Lancer le live » le reprenant pre-rempli.
   * En modification, `null` l'efface (live programme seulement).
   */
  @IsOptional()
  @IsFacebookVideoLink()
  facebookUrl?: string | null;

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
