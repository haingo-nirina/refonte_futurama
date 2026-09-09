import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Le seul parametre de `GET /products/most-viewed` : la taille de la vitrine.
 * Plafonne, c'est une section d'accueil et non une pagination du catalogue.
 */
export class FindMostViewedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 4;
}
