import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trim } from '../../common/trim';

/**
 * L'auteur n'est pas dans ce DTO : il vient du JWT, et le service verifie que
 * le commentaire vise est bien le sien.
 *
 * `comment` reste obligatoire — contrairement a l'avis, ou seule la note peut
 * subsister, un commentaire vide n'a rien a afficher. Meme trim qu'a la
 * creation : `@IsNotEmpty()` laisserait passer une suite d'espaces.
 */
export class UpdateCommentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  comment: string;
}
