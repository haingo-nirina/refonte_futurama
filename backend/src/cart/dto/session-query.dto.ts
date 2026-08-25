import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Le panier d'un visiteur non connecte est identifie par son session_id,
 * passe en query string (`?session_id=`).
 */
export class SessionQueryDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;
}
