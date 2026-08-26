import { IsNotEmpty, IsString } from 'class-validator';

/** L'auteur n'est pas dans ce DTO : il vient du JWT. */
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}
