import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/trim';

/** Longueur d'un commentaire de live : une reaction, pas un avis. */
export const LIVE_COMMENT_MAX_LENGTH = 500;

/** L'auteur n'est pas dans ce DTO : il vient du JWT. */
export class CreateLiveCommentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(LIVE_COMMENT_MAX_LENGTH)
  message: string;
}
