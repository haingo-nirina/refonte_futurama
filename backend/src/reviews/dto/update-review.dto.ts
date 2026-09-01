import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * `productId` n'y figure pas : un avis ne change pas de produit. L'auteur non
 * plus, il vient du JWT et le service verifie que c'est bien le sien.
 */
export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** `null` retire le commentaire et ne garde que la note. */
  @IsOptional()
  @IsString()
  comment?: string | null;
}
