import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trim } from '../../common/trim';

/** L'auteur n'est pas dans ce DTO : il vient du JWT. */
export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  comment: string;
}
