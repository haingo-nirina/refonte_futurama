import { IsNotEmpty, IsString } from 'class-validator';

/** Les likes d'un visiteur non connecte sont rattaches a son session_id. */
export class LikePostDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;
}
