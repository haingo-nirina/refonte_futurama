import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trim } from '../../common/trim';

/**
 * Deux formes, exclusives :
 * - `ids` : les produits coches dans la liste (une page au plus) ;
 * - `all: true` + les filtres de la liste : tout ce qui correspond, pages
 *   suivantes comprises. Sans filtre, c'est le catalogue entier.
 *
 * Les filtres reprennent ceux de la liste du backoffice (recherche, categorie,
 * publication), pour que « tous les produits correspondants » designe
 * exactement ce que l'admin a sous les yeux.
 */
export class BulkDeleteProductsDto {
  @ValidateIf((dto: BulkDeleteProductsDto) => dto.all !== true)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids?: string[];

  @IsOptional()
  @IsIn([true])
  all?: true;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
